// Unit тесты для DeviceService

import { DeviceStatus } from '@prisma/client';
import { DeviceService } from '../device.service';
import { ValidationError, NotFoundError, ConflictError } from '../../../common/errors';
import KafkaService from '../../../kafka';

// Мокаем зависимости
jest.mock('../../../kafka');
jest.mock('../mikrotik.service');

// Создаем мок для Prisma
const mockPrisma = {
  device: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

describe('DeviceService', () => {
  let deviceService: DeviceService;
  let kafkaServiceMock: jest.Mocked<KafkaService>;

  beforeEach(() => {
    // Очищаем моки
    jest.clearAllMocks();

    kafkaServiceMock = new KafkaService() as jest.Mocked<KafkaService>;
    
    deviceService = new DeviceService(mockPrisma as any, kafkaServiceMock);
  });

  describe('createDevice', () => {
    const validDeviceData = {
      ipAddress: '192.168.1.1',
      username: 'admin',
      password: 'password123',
      description: 'Test device'
    };

    it('должен создать устройство с валидными данными', async () => {
      // Arrange
      const mockDevice = {
        id: 'device-id-1',
        ipAddress: '192.168.1.1',
        username: 'admin',
        passwordHash: 'hashed-password',
        description: 'Test device',
        status: DeviceStatus.ONLINE,
        lastCheck: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.device.findUnique.mockResolvedValue(null); // Устройство не существует
      mockPrisma.device.create.mockResolvedValue(mockDevice);

      // Мокаем проверку здоровья устройства
      jest.spyOn(deviceService, 'checkDeviceHealth').mockResolvedValue({
        deviceId: '',
        pingSuccess: true,
        apiSuccess: true,
        responseTime: 100,
        timestamp: new Date()
      });

      // Act
      const result = await deviceService.createDevice(validDeviceData);

      // Assert
      expect(result).toEqual({
        id: mockDevice.id,
        ipAddress: mockDevice.ipAddress,
        username: mockDevice.username,
        description: mockDevice.description,
        status: mockDevice.status,
        lastCheck: mockDevice.lastCheck,
        createdAt: mockDevice.createdAt,
        updatedAt: mockDevice.updatedAt
      });

      expect(mockPrisma.device.findUnique).toHaveBeenCalledWith({
        where: { ipAddress: validDeviceData.ipAddress }
      });

      expect(mockPrisma.device.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: validDeviceData.ipAddress,
          username: validDeviceData.username,
          description: validDeviceData.description,
          status: DeviceStatus.ONLINE
        })
      });
    });

    it('должен выбросить ValidationError для некорректного IP', async () => {
      // Arrange
      const invalidData = {
        ...validDeviceData,
        ipAddress: 'invalid-ip'
      };

      // Act & Assert
      await expect(deviceService.createDevice(invalidData))
        .rejects
        .toThrow(ValidationError);
    });

    it('должен выбросить ConflictError если устройство уже существует', async () => {
      // Arrange
      const existingDevice = {
        id: 'existing-id',
        ipAddress: validDeviceData.ipAddress,
        username: 'existing-user',
        passwordHash: 'hash',
        description: null,
        status: DeviceStatus.ONLINE,
        lastCheck: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.device.findUnique.mockResolvedValue(existingDevice);

      // Act & Assert
      await expect(deviceService.createDevice(validDeviceData))
        .rejects
        .toThrow(ConflictError);
    });

    it('должен выбросить ValidationError если устройство недоступно', async () => {
      // Arrange
      mockPrisma.device.findUnique.mockResolvedValue(null);

      jest.spyOn(deviceService, 'checkDeviceHealth').mockResolvedValue({
        deviceId: '',
        pingSuccess: false,
        apiSuccess: false,
        responseTime: 0,
        error: 'Device unreachable',
        timestamp: new Date()
      });

      // Act & Assert
      await expect(deviceService.createDevice(validDeviceData))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('getDevices', () => {
    it('должен вернуть список устройств с пагинацией', async () => {
      // Arrange
      const mockDevices = [
        {
          id: 'device-1',
          ipAddress: '192.168.1.1',
          username: 'admin',
          passwordHash: 'hash1',
          description: 'Device 1',
          status: DeviceStatus.ONLINE,
          lastCheck: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { accounts: 2 }
        },
        {
          id: 'device-2',
          ipAddress: '192.168.1.2',
          username: 'admin',
          passwordHash: 'hash2',
          description: 'Device 2',
          status: DeviceStatus.OFFLINE,
          lastCheck: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { accounts: 0 }
        }
      ];

      mockPrisma.device.findMany.mockResolvedValue(mockDevices);
      mockPrisma.device.count.mockResolvedValue(2);

      // Act
      const result = await deviceService.getDevices({ page: 1, limit: 20 });

      // Assert
      expect(result.devices).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.devices[0].accountsCount).toBe(2);
      expect(result.devices[1].accountsCount).toBe(0);
    });

    it('должен применить фильтры поиска', async () => {
      // Arrange
      const filters = {
        status: DeviceStatus.ONLINE,
        search: '192.168',
        page: 1,
        limit: 10
      };

      mockPrisma.device.findMany.mockResolvedValue([]);
      mockPrisma.device.count.mockResolvedValue(0);

      // Act
      await deviceService.getDevices(filters);

      // Assert
      expect(mockPrisma.device.findMany).toHaveBeenCalledWith({
        where: {
          status: DeviceStatus.ONLINE,
          OR: [
            { ipAddress: { contains: '192.168', mode: 'insensitive' } },
            { description: { contains: '192.168', mode: 'insensitive' } }
          ]
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { accounts: true }
          }
        }
      });
    });
  });

  describe('getDeviceById', () => {
    it('должен вернуть устройство по ID', async () => {
      // Arrange
      const deviceId = 'device-id-1';
      const mockDevice = {
        id: deviceId,
        ipAddress: '192.168.1.1',
        username: 'admin',
        passwordHash: 'hash',
        description: 'Test device',
        status: DeviceStatus.ONLINE,
        lastCheck: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { accounts: 1 }
      };

      mockPrisma.device.findUnique.mockResolvedValue(mockDevice);

      // Act
      const result = await deviceService.getDeviceById(deviceId);

      // Assert
      expect(result.id).toBe(deviceId);
      expect(result.accountsCount).toBe(1);
      expect(mockPrisma.device.findUnique).toHaveBeenCalledWith({
        where: { id: deviceId },
        include: {
          _count: {
            select: { accounts: true }
          }
        }
      });
    });

    it('должен выбросить NotFoundError если устройство не найдено', async () => {
      // Arrange
      const deviceId = 'non-existent-id';
      mockPrisma.device.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(deviceService.getDeviceById(deviceId))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('updateDevice', () => {
    const deviceId = 'device-id-1';
    const existingDevice = {
      id: deviceId,
      ipAddress: '192.168.1.1',
      username: 'admin',
      passwordHash: 'old-hash',
      description: 'Old description',
      status: DeviceStatus.ONLINE,
      lastCheck: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('должен обновить устройство', async () => {
      // Arrange
      const updateData = {
        description: 'New description',
        status: DeviceStatus.OFFLINE
      };

      const updatedDevice = {
        ...existingDevice,
        ...updateData,
        updatedAt: new Date()
      };

      mockPrisma.device.findUnique.mockResolvedValue(existingDevice);
      mockPrisma.device.update.mockResolvedValue(updatedDevice);

      // Act
      const result = await deviceService.updateDevice(deviceId, updateData);

      // Assert
      expect(result.description).toBe(updateData.description);
      expect(result.status).toBe(updateData.status);
      expect(mockPrisma.device.update).toHaveBeenCalledWith({
        where: { id: deviceId },
        data: expect.objectContaining(updateData)
      });
    });

    it('должен выбросить NotFoundError если устройство не найдено', async () => {
      // Arrange
      mockPrisma.device.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(deviceService.updateDevice(deviceId, { description: 'New' }))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('deleteDevice', () => {
    const deviceId = 'device-id-1';

    it('должен удалить устройство без привязанных счетов', async () => {
      // Arrange
      const device = {
        id: deviceId,
        ipAddress: '192.168.1.1',
        username: 'admin',
        passwordHash: 'hash',
        description: null,
        status: DeviceStatus.ONLINE,
        lastCheck: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { accounts: 0 }
      };

      mockPrisma.device.findUnique.mockResolvedValue(device);
      mockPrisma.device.delete.mockResolvedValue(device);

      // Act
      await deviceService.deleteDevice(deviceId);

      // Assert
      expect(mockPrisma.device.delete).toHaveBeenCalledWith({
        where: { id: deviceId }
      });
    });

    it('должен выбросить ConflictError если есть привязанные счета', async () => {
      // Arrange
      const device = {
        id: deviceId,
        ipAddress: '192.168.1.1',
        username: 'admin',
        passwordHash: 'hash',
        description: null,
        status: DeviceStatus.ONLINE,
        lastCheck: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { accounts: 2 }
      };

      mockPrisma.device.findUnique.mockResolvedValue(device);

      // Act & Assert
      await expect(deviceService.deleteDevice(deviceId))
        .rejects
        .toThrow(ConflictError);
    });

    it('должен выбросить NotFoundError если устройство не найдено', async () => {
      // Arrange
      mockPrisma.device.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(deviceService.deleteDevice(deviceId))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('sendMikroTikCommand', () => {
    it('должен отправить команду через Kafka', async () => {
      // Arrange
      const command = {
        type: 'ADD_DHCP' as const,
        deviceId: 'device-1',
        accountId: 'account-1',
        macAddress: '00:11:22:33:44:55',
        ipAddress: '192.168.1.100',
        poolName: 'default',
        timestamp: Date.now()
      };

      kafkaServiceMock.sendMessage = jest.fn().mockResolvedValue(undefined);

      // Act
      await deviceService.sendMikroTikCommand(command);

      // Assert
      expect(kafkaServiceMock.sendMessage).toHaveBeenCalledWith(
        'mikrotik-commands',
        expect.objectContaining(command)
      );
    });

    it('должен выбросить ошибку при сбое отправки', async () => {
      // Arrange
      const command = {
        type: 'BLOCK_CLIENT' as const,
        deviceId: 'device-1',
        accountId: 'account-1',
        macAddress: '00:11:22:33:44:55',
        timestamp: Date.now()
      };

      const kafkaError = new Error('Kafka connection failed');
      kafkaServiceMock.sendMessage = jest.fn().mockRejectedValue(kafkaError);

      // Act & Assert
      await expect(deviceService.sendMikroTikCommand(command))
        .rejects
        .toThrow(kafkaError);
    });
  });
});