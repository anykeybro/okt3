// Интеграционные тесты для Kafka интеграции MikroTik

import { PrismaClient } from '@prisma/client';
import KafkaService from '../../../kafka';
import { MikroTikKafkaConsumer } from '../kafka.consumer';
import { CommandMonitorService } from '../command-monitor.service';
import { MikroTikCommand, MikroTikCommandResult } from '../device.types';
import { config } from '../../../config/config';

// Mock для Prisma
const mockPrisma = {
  device: {
    findUnique: jest.fn(),
  },
  account: {
    findUnique: jest.fn(),
  },
} as unknown as PrismaClient;

// Mock для KafkaService
const mockKafkaService = {
  connectConsumer: jest.fn(),
  connectProducer: jest.fn(),
  subscribeToTopic: jest.fn(),
  sendMessage: jest.fn(),
  disconnect: jest.fn(),
} as unknown as KafkaService;

describe('Kafka Integration Tests', () => {
  let consumer: MikroTikKafkaConsumer;
  let commandMonitor: CommandMonitorService;

  beforeEach(() => {
    jest.clearAllMocks();
    consumer = new MikroTikKafkaConsumer(mockPrisma, mockKafkaService);
    commandMonitor = new CommandMonitorService(mockPrisma, mockKafkaService);
  });

  afterEach(async () => {
    await consumer.stop();
    await commandMonitor.stop();
  });

  describe('MikroTik Kafka Consumer', () => {
    it('должен успешно запуститься и подписаться на топики', async () => {
      // Arrange
      (mockKafkaService.connectConsumer as jest.Mock).mockResolvedValue(undefined);
      (mockKafkaService.subscribeToTopic as jest.Mock).mockResolvedValue(undefined);

      // Act
      await consumer.start();

      // Assert
      expect(mockKafkaService.connectConsumer).toHaveBeenCalledWith('mikrotik-consumer-group');
      expect(mockKafkaService.subscribeToTopic).toHaveBeenCalledWith(
        config.kafka.topics.mikrotikCommands,
        expect.any(Function)
      );
    });

    it('должен обработать команду ADD_DHCP', async () => {
      // Arrange
      const mockDevice = {
        id: 'device-1',
        ipAddress: '192.168.1.1',
        username: 'admin',
        password: 'encrypted_password'
      };

      const mockAccount = {
        id: 'account-1',
        accountNumber: 'ACC001',
        client: {
          firstName: 'Иван',
          lastName: 'Иванов'
        }
      };

      const command: MikroTikCommand = {
        type: 'ADD_DHCP',
        deviceId: 'device-1',
        accountId: 'account-1',
        macAddress: '00:11:22:33:44:55',
        ipAddress: '192.168.1.100',
        poolName: 'dhcp-pool',
        timestamp: Date.now()
      };

      (mockPrisma.device.findUnique as jest.Mock).mockResolvedValue(mockDevice);
      (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (mockKafkaService.sendMessage as jest.Mock).mockResolvedValue(undefined);

      // Act
      await consumer.start();
      const handleCommand = (mockKafkaService.subscribeToTopic as jest.Mock).mock.calls[0][1];
      await handleCommand(command);

      // Assert
      expect(mockPrisma.device.findUnique).toHaveBeenCalledWith({
        where: { id: 'device-1' }
      });
      expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'account-1' },
        include: { client: true }
      });
      expect(mockKafkaService.sendMessage).toHaveBeenCalledWith(
        config.kafka.topics.deviceStatus,
        expect.objectContaining({
          deviceId: 'device-1',
          success: true
        })
      );
    });

    it('должен обработать команду BLOCK_CLIENT', async () => {
      // Arrange
      const mockDevice = {
        id: 'device-1',
        ipAddress: '192.168.1.1',
        username: 'admin',
        password: 'encrypted_password'
      };

      const mockAccount = {
        id: 'account-1',
        accountNumber: 'ACC001',
        client: {
          firstName: 'Иван',
          lastName: 'Иванов'
        }
      };

      const command: MikroTikCommand = {
        type: 'BLOCK_CLIENT',
        deviceId: 'device-1',
        accountId: 'account-1',
        macAddress: '00:11:22:33:44:55',
        timestamp: Date.now()
      };

      (mockPrisma.device.findUnique as jest.Mock).mockResolvedValue(mockDevice);
      (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (mockKafkaService.sendMessage as jest.Mock).mockResolvedValue(undefined);

      // Act
      await consumer.start();
      const handleCommand = (mockKafkaService.subscribeToTopic as jest.Mock).mock.calls[0][1];
      await handleCommand(command);

      // Assert
      expect(mockKafkaService.sendMessage).toHaveBeenCalledWith(
        config.kafka.topics.deviceStatus,
        expect.objectContaining({
          deviceId: 'device-1',
          success: true
        })
      );
    });

    it('должен обработать ошибку при отсутствии устройства', async () => {
      // Arrange
      const command: MikroTikCommand = {
        type: 'ADD_DHCP',
        deviceId: 'nonexistent-device',
        accountId: 'account-1',
        macAddress: '00:11:22:33:44:55',
        timestamp: Date.now()
      };

      (mockPrisma.device.findUnique as jest.Mock).mockResolvedValue(null);
      (mockKafkaService.sendMessage as jest.Mock).mockResolvedValue(undefined);

      // Act
      await consumer.start();
      const handleCommand = (mockKafkaService.subscribeToTopic as jest.Mock).mock.calls[0][1];
      await handleCommand(command);

      // Assert
      expect(mockKafkaService.sendMessage).toHaveBeenCalledWith(
        config.kafka.topics.deviceStatus,
        expect.objectContaining({
          deviceId: 'nonexistent-device',
          success: false,
          error: 'Устройство не найдено'
        })
      );
    });
  });

  describe('Command Monitor Service', () => {
    it('должен зарегистрировать команду для мониторинга', () => {
      // Arrange
      const commandId = 'test-command-1';
      const deviceId = 'device-1';
      const accountId = 'account-1';
      const type = 'ADD_DHCP';

      // Act
      commandMonitor.registerCommand(commandId, deviceId, accountId, type);

      // Assert
      const status = commandMonitor.getCommandStatus(commandId);
      expect(status).toBeDefined();
      expect(status?.commandId).toBe(commandId);
      expect(status?.deviceId).toBe(deviceId);
      expect(status?.status).toBe('pending');
    });

    it('должен обработать успешный результат команды', async () => {
      // Arrange
      const commandId = 'test-command-1';
      const deviceId = 'device-1';
      const accountId = 'account-1';
      const type = 'ADD_DHCP';

      const result: MikroTikCommandResult = {
        commandId,
        deviceId,
        success: true,
        result: { message: 'DHCP lease добавлен' },
        timestamp: Date.now()
      };

      (mockKafkaService.sendMessage as jest.Mock).mockResolvedValue(undefined);

      // Act
      commandMonitor.registerCommand(commandId, deviceId, accountId, type);
      await commandMonitor.start();
      
      // Симулируем получение результата
      const handleResult = (mockKafkaService.subscribeToTopic as jest.Mock).mock.calls[0][1];
      await handleResult(result);

      // Assert
      const status = commandMonitor.getCommandStatus(commandId);
      expect(status).toBeUndefined(); // Команда должна быть удалена после завершения
    });

    it('должен обработать таймаут команды', (done) => {
      // Arrange
      const commandId = 'test-command-timeout';
      const deviceId = 'device-1';
      const accountId = 'account-1';
      const type = 'ADD_DHCP';
      const shortTimeout = 50; // 50ms для быстрого теста

      (mockKafkaService.sendMessage as jest.Mock).mockResolvedValue(undefined);

      // Act
      commandMonitor.registerCommand(commandId, deviceId, accountId, type, shortTimeout);

      // Assert - проверяем, что команда сначала существует
      const initialStatus = commandMonitor.getCommandStatus(commandId);
      expect(initialStatus).toBeDefined();
      expect(initialStatus?.status).toBe('pending');

      // Ждем больше времени чем таймаут
      setTimeout(() => {
        const status = commandMonitor.getCommandStatus(commandId);
        // Команда может быть либо удалена, либо помечена как timeout/failed
        if (status) {
          expect(['timeout', 'failed']).toContain(status.status);
        }
        done();
      }, 150);
    }, 1000); // Увеличиваем таймаут теста

    it('должен повторить команду при неудаче', async () => {
      // Arrange
      const commandId = 'test-command-retry';
      const deviceId = 'device-1';
      const accountId = 'account-1';
      const type = 'ADD_DHCP';

      const failedResult: MikroTikCommandResult = {
        commandId,
        deviceId,
        success: false,
        error: 'Временная ошибка',
        timestamp: Date.now()
      };

      (mockKafkaService.sendMessage as jest.Mock).mockResolvedValue(undefined);

      // Act
      commandMonitor.registerCommand(commandId, deviceId, accountId, type);
      await commandMonitor.start();
      
      // Симулируем получение неудачного результата
      const handleResult = (mockKafkaService.subscribeToTopic as jest.Mock).mock.calls[0][1];
      await handleResult(failedResult);

      // Assert
      // Проверяем, что была попытка отправить команду повторно
      expect(mockKafkaService.sendMessage).toHaveBeenCalledWith(
        config.kafka.topics.mikrotikCommands,
        expect.any(Object)
      );
    });

    it('должен предоставить статистику команд', () => {
      // Arrange
      commandMonitor.registerCommand('cmd-1', 'dev-1', 'acc-1', 'ADD_DHCP');
      commandMonitor.registerCommand('cmd-2', 'dev-1', 'acc-2', 'BLOCK_CLIENT');
      commandMonitor.registerCommand('cmd-3', 'dev-2', 'acc-3', 'UNBLOCK_CLIENT');

      // Act
      const stats = commandMonitor.getCommandStats();

      // Assert
      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(3);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });

    it('должен получить список активных команд', () => {
      // Arrange
      commandMonitor.registerCommand('cmd-1', 'dev-1', 'acc-1', 'ADD_DHCP');
      commandMonitor.registerCommand('cmd-2', 'dev-1', 'acc-2', 'BLOCK_CLIENT');

      // Act
      const activeCommands = commandMonitor.getActiveCommands();

      // Assert
      expect(activeCommands).toHaveLength(2);
      expect(activeCommands[0].commandId).toBe('cmd-1');
      expect(activeCommands[1].commandId).toBe('cmd-2');
    });
  });

  describe('End-to-End Integration', () => {
    it('должен обработать полный цикл команды от отправки до получения результата', async () => {
      // Arrange
      const mockDevice = {
        id: 'device-1',
        ipAddress: '192.168.1.1',
        username: 'admin',
        password: 'encrypted_password'
      };

      const mockAccount = {
        id: 'account-1',
        accountNumber: 'ACC001',
        client: {
          firstName: 'Иван',
          lastName: 'Иванов'
        }
      };

      const command: MikroTikCommand = {
        type: 'ADD_DHCP',
        deviceId: 'device-1',
        accountId: 'account-1',
        macAddress: '00:11:22:33:44:55',
        ipAddress: '192.168.1.100',
        poolName: 'dhcp-pool',
        timestamp: Date.now()
      };

      (mockPrisma.device.findUnique as jest.Mock).mockResolvedValue(mockDevice);
      (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (mockKafkaService.sendMessage as jest.Mock).mockResolvedValue(undefined);

      // Act
      await consumer.start();
      
      // Отправляем команду
      const handleCommand = (mockKafkaService.subscribeToTopic as jest.Mock).mock.calls[0][1];
      await handleCommand(command);

      // Assert
      expect(mockKafkaService.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockKafkaService.sendMessage).toHaveBeenCalledWith(
        config.kafka.topics.deviceStatus,
        expect.objectContaining({
          commandId: expect.stringContaining('device-1'),
          deviceId: 'device-1',
          success: true
        })
      );
    });
  });
});