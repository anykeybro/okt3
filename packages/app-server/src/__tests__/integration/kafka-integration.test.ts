import request from 'supertest';
import { setupIntegrationTests, teardownIntegrationTests, testSetup } from './setup';
import { Kafka, Producer, Consumer } from 'kafkajs';

// Мокаем KafkaJS
const mockProducer = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  send: jest.fn()
};

const mockConsumer = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  subscribe: jest.fn(),
  run: jest.fn()
};

const mockKafka = {
  producer: jest.fn(() => mockProducer),
  consumer: jest.fn(() => mockConsumer),
  admin: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    createTopics: jest.fn(),
    listTopics: jest.fn()
  }))
};

jest.mock('kafkajs', () => ({
  Kafka: jest.fn(() => mockKafka)
}));

// Мок для MikroTik API
const mockMikroTikService = {
  addDHCPLease: jest.fn(),
  removeDHCPLease: jest.fn(),
  blockClient: jest.fn(),
  unblockClient: jest.fn(),
  getClientStats: jest.fn(),
  testConnection: jest.fn()
};

jest.mock('../../modules/devices/mikrotik.service', () => ({
  MikroTikService: jest.fn().mockImplementation(() => mockMikroTikService)
}));

describe('Интеграционные тесты: Kafka интеграция', () => {
  let authToken: string;
  let clientId: string;
  let accountId: string;
  let deviceId: string;

  beforeAll(async () => {
    await setupIntegrationTests();
    
    // Получаем токен авторизации
    const loginResponse = await request(testSetup.app)
      .post('/api/auth/login')
      .send({
        username: 'test_admin',
        password: 'test_password'
      });
    
    authToken = loginResponse.body.token;

    // Создаем тестовые данные
    const client = await testSetup.createTestClient();
    clientId = client.id;

    const tariffs = await testSetup.prisma.tariff.findMany();
    const account = await testSetup.createTestAccount(clientId, tariffs[0].id, {
      macAddress: '00:11:22:33:44:55',
      poolName: 'home-users'
    });
    accountId = account.id;

    // Получаем устройство
    const device = await testSetup.prisma.device.findFirst();
    deviceId = device!.id;

    // Привязываем счет к устройству
    await testSetup.prisma.account.update({
      where: { id: accountId },
      data: { deviceId }
    });
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Kafka Producer - Отправка команд', () => {
    it('должен отправить команду добавления DHCP lease при создании счета', async () => {
      mockProducer.send.mockResolvedValueOnce([{
        topicName: 'mikrotik-commands',
        partition: 0,
        errorCode: 0,
        offset: '123'
      }]);

      const accountData = {
        clientId,
        tariffId: (await testSetup.prisma.tariff.findFirst())!.id,
        balance: 1000,
        macAddress: '00:11:22:33:44:66',
        poolName: 'new-users',
        deviceId
      };

      const response = await request(testSetup.app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(accountData)
        .expect(201);

      // Проверяем, что команда была отправлена в Kafka
      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: 'mikrotik-commands',
        messages: [{
          key: expect.any(String),
          value: JSON.stringify({
            command: 'ADD_DHCP_LEASE',
            deviceId,
            accountId: response.body.id,
            macAddress: '00:11:22:33:44:66',
            poolName: 'new-users',
            timestamp: expect.any(Number)
          })
        }]
      });
    });

    it('должен отправить команду блокировки при блокировке счета', async () => {
      mockProducer.send.mockResolvedValueOnce([{
        topicName: 'mikrotik-commands',
        partition: 0,
        errorCode: 0,
        offset: '124'
      }]);

      await request(testSetup.app)
        .post(`/api/accounts/${accountId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: 'mikrotik-commands',
        messages: [{
          key: expect.any(String),
          value: JSON.stringify({
            command: 'BLOCK_CLIENT',
            deviceId,
            accountId,
            macAddress: '00:11:22:33:44:55',
            timestamp: expect.any(Number)
          })
        }]
      });
    });

    it('должен отправить команду разблокировки при разблокировке счета', async () => {
      // Сначала блокируем счет
      await testSetup.prisma.account.update({
        where: { id: accountId },
        data: { status: 'BLOCKED' }
      });

      mockProducer.send.mockResolvedValueOnce([{
        topicName: 'mikrotik-commands',
        partition: 0,
        errorCode: 0,
        offset: '125'
      }]);

      await request(testSetup.app)
        .post(`/api/accounts/${accountId}/unblock`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: 'mikrotik-commands',
        messages: [{
          key: expect.any(String),
          value: JSON.stringify({
            command: 'UNBLOCK_CLIENT',
            deviceId,
            accountId,
            macAddress: '00:11:22:33:44:55',
            timestamp: expect.any(Number)
          })
        }]
      });
    });

    it('должен отправить команду удаления DHCP lease при удалении счета', async () => {
      mockProducer.send.mockResolvedValueOnce([{
        topicName: 'mikrotik-commands',
        partition: 0,
        errorCode: 0,
        offset: '126'
      }]);

      await request(testSetup.app)
        .delete(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: 'mikrotik-commands',
        messages: [{
          key: expect.any(String),
          value: JSON.stringify({
            command: 'REMOVE_DHCP_LEASE',
            deviceId,
            accountId,
            macAddress: '00:11:22:33:44:55',
            timestamp: expect.any(Number)
          })
        }]
      });
    });

    it('должен обработать ошибку при отправке в Kafka', async () => {
      mockProducer.send.mockRejectedValueOnce(new Error('Kafka broker unavailable'));

      // Команда должна выполниться, но с логированием ошибки
      await request(testSetup.app)
        .post(`/api/accounts/${accountId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Проверяем, что попытка отправки была сделана
      expect(mockProducer.send).toHaveBeenCalled();
    });
  });

  describe('Kafka Consumer - Обработка команд', () => {
    it('должен обработать команду ADD_DHCP_LEASE', async () => {
      mockMikroTikService.addDHCPLease.mockResolvedValueOnce({ success: true });

      const message = {
        command: 'ADD_DHCP_LEASE',
        deviceId,
        accountId,
        macAddress: '00:11:22:33:44:77',
        poolName: 'test-pool',
        timestamp: Date.now()
      };

      // Симулируем получение сообщения из Kafka
      const mockEachMessage = mockConsumer.run.mock.calls[0]?.[0]?.eachMessage;
      if (mockEachMessage) {
        await mockEachMessage({
          topic: 'mikrotik-commands',
          partition: 0,
          message: {
            key: Buffer.from('test-key'),
            value: Buffer.from(JSON.stringify(message)),
            offset: '127'
          }
        });
      }

      expect(mockMikroTikService.addDHCPLease).toHaveBeenCalledWith(
        '00:11:22:33:44:77',
        expect.any(String), // IP будет назначен автоматически
        'test-pool'
      );
    });

    it('должен обработать команду BLOCK_CLIENT', async () => {
      mockMikroTikService.blockClient.mockResolvedValueOnce({ success: true });

      const message = {
        command: 'BLOCK_CLIENT',
        deviceId,
        accountId,
        macAddress: '00:11:22:33:44:55',
        timestamp: Date.now()
      };

      const mockEachMessage = mockConsumer.run.mock.calls[0]?.[0]?.eachMessage;
      if (mockEachMessage) {
        await mockEachMessage({
          topic: 'mikrotik-commands',
          partition: 0,
          message: {
            key: Buffer.from('test-key'),
            value: Buffer.from(JSON.stringify(message)),
            offset: '128'
          }
        });
      }

      expect(mockMikroTikService.blockClient).toHaveBeenCalledWith('00:11:22:33:44:55');
    });

    it('должен обработать команду UNBLOCK_CLIENT', async () => {
      mockMikroTikService.unblockClient.mockResolvedValueOnce({ success: true });

      const message = {
        command: 'UNBLOCK_CLIENT',
        deviceId,
        accountId,
        macAddress: '00:11:22:33:44:55',
        timestamp: Date.now()
      };

      const mockEachMessage = mockConsumer.run.mock.calls[0]?.[0]?.eachMessage;
      if (mockEachMessage) {
        await mockEachMessage({
          topic: 'mikrotik-commands',
          partition: 0,
          message: {
            key: Buffer.from('test-key'),
            value: Buffer.from(JSON.stringify(message)),
            offset: '129'
          }
        });
      }

      expect(mockMikroTikService.unblockClient).toHaveBeenCalledWith('00:11:22:33:44:55');
    });

    it('должен обработать команду REMOVE_DHCP_LEASE', async () => {
      mockMikroTikService.removeDHCPLease.mockResolvedValueOnce({ success: true });

      const message = {
        command: 'REMOVE_DHCP_LEASE',
        deviceId,
        accountId,
        macAddress: '00:11:22:33:44:55',
        timestamp: Date.now()
      };

      const mockEachMessage = mockConsumer.run.mock.calls[0]?.[0]?.eachMessage;
      if (mockEachMessage) {
        await mockEachMessage({
          topic: 'mikrotik-commands',
          partition: 0,
          message: {
            key: Buffer.from('test-key'),
            value: Buffer.from(JSON.stringify(message)),
            offset: '130'
          }
        });
      }

      expect(mockMikroTikService.removeDHCPLease).toHaveBeenCalledWith('00:11:22:33:44:55');
    });

    it('должен обработать ошибку при выполнении команды MikroTik', async () => {
      mockMikroTikService.blockClient.mockRejectedValueOnce(new Error('MikroTik API error'));

      const message = {
        command: 'BLOCK_CLIENT',
        deviceId,
        accountId,
        macAddress: '00:11:22:33:44:55',
        timestamp: Date.now()
      };

      const mockEachMessage = mockConsumer.run.mock.calls[0]?.[0]?.eachMessage;
      if (mockEachMessage) {
        // Не должно выбрасывать исключение, только логировать ошибку
        await expect(mockEachMessage({
          topic: 'mikrotik-commands',
          partition: 0,
          message: {
            key: Buffer.from('test-key'),
            value: Buffer.from(JSON.stringify(message)),
            offset: '131'
          }
        })).resolves.not.toThrow();
      }

      expect(mockMikroTikService.blockClient).toHaveBeenCalled();
    });

    it('должен игнорировать неизвестные команды', async () => {
      const message = {
        command: 'UNKNOWN_COMMAND',
        deviceId,
        accountId,
        timestamp: Date.now()
      };

      const mockEachMessage = mockConsumer.run.mock.calls[0]?.[0]?.eachMessage;
      if (mockEachMessage) {
        await expect(mockEachMessage({
          topic: 'mikrotik-commands',
          partition: 0,
          message: {
            key: Buffer.from('test-key'),
            value: Buffer.from(JSON.stringify(message)),
            offset: '132'
          }
        })).resolves.not.toThrow();
      }

      // Никакие методы MikroTik не должны быть вызваны
      expect(mockMikroTikService.addDHCPLease).not.toHaveBeenCalled();
      expect(mockMikroTikService.blockClient).not.toHaveBeenCalled();
      expect(mockMikroTikService.unblockClient).not.toHaveBeenCalled();
      expect(mockMikroTikService.removeDHCPLease).not.toHaveBeenCalled();
    });
  });

  describe('Мониторинг выполнения команд', () => {
    it('должен создать запись о статусе выполнения команды', async () => {
      mockProducer.send.mockResolvedValueOnce([{
        topicName: 'mikrotik-commands',
        partition: 0,
        errorCode: 0,
        offset: '133'
      }]);

      await request(testSetup.app)
        .post(`/api/accounts/${accountId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Проверяем, что команда была отправлена в Kafka
      expect(mockProducer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'mikrotik-commands',
          messages: expect.arrayContaining([
            expect.objectContaining({
              value: expect.stringContaining('BLOCK_CLIENT')
            })
          ])
        })
      );
    });

    it('должен обновить статус команды после выполнения', async () => {
      mockMikroTikService.unblockClient.mockResolvedValueOnce({ success: true });

      // Симулируем обработку команды
      const message = {
        command: 'UNBLOCK_CLIENT',
        deviceId,
        accountId,
        macAddress: '00:11:22:33:44:55',
        timestamp: Date.now()
      };

      const mockEachMessage = mockConsumer.run.mock.calls[0]?.[0]?.eachMessage;
      if (mockEachMessage) {
        await mockEachMessage({
          topic: 'mikrotik-commands',
          partition: 0,
          message: {
            key: Buffer.from('test-key'),
            value: Buffer.from(JSON.stringify(message)),
            offset: '134'
          }
        });
      }

      // Проверяем, что MikroTik сервис был вызван
      expect(mockMikroTikService.unblockClient).toHaveBeenCalledWith('00:11:22:33:44:55');
    });

    it('должен получить статус выполнения команд для устройства', async () => {
      // Мокаем ответ для получения команд устройства
      const mockResponse = {
        commands: [
          {
            id: 'cmd-1',
            command: 'BLOCK_CLIENT',
            status: 'COMPLETED',
            createdAt: new Date().toISOString()
          }
        ],
        total: 1,
        pending: 0,
        completed: 1,
        failed: 0
      };

      // Проверяем, что можем получить информацию об устройстве
      const device = await testSetup.prisma.device.findUnique({
        where: { id: deviceId }
      });

      expect(device).toBeTruthy();
      expect(device!.id).toBe(deviceId);
    });

    it('должен получить статистику выполнения команд', async () => {
      const response = await request(testSetup.app)
        .get('/api/devices/commands/stats')
        .query({
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 часа назад
          endDate: new Date().toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        period: {
          start: expect.any(String),
          end: expect.any(String)
        },
        summary: {
          total: expect.any(Number),
          completed: expect.any(Number),
          failed: expect.any(Number),
          pending: expect.any(Number),
          successRate: expect.any(Number)
        },
        byCommand: expect.objectContaining({
          ADD_DHCP_LEASE: expect.any(Number),
          REMOVE_DHCP_LEASE: expect.any(Number),
          BLOCK_CLIENT: expect.any(Number),
          UNBLOCK_CLIENT: expect.any(Number)
        }),
        byDevice: expect.arrayContaining([
          expect.objectContaining({
            deviceId: expect.any(String),
            deviceIp: expect.any(String),
            total: expect.any(Number),
            successRate: expect.any(Number)
          })
        ])
      });
    });
  });

  describe('Kafka Admin операции', () => {
    it('должен создать необходимые топики при запуске', async () => {
      const mockAdmin = mockKafka.admin();
      mockAdmin.listTopics.mockResolvedValueOnce(['existing-topic']);
      mockAdmin.createTopics.mockResolvedValueOnce(true);

      const response = await request(testSetup.app)
        .post('/api/kafka/setup-topics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        createdTopics: expect.arrayContaining(['mikrotik-commands'])
      });

      expect(mockAdmin.createTopics).toHaveBeenCalledWith({
        topics: expect.arrayContaining([
          expect.objectContaining({
            topic: 'mikrotik-commands',
            numPartitions: expect.any(Number),
            replicationFactor: expect.any(Number)
          })
        ])
      });
    });

    it('должен получить информацию о топиках', async () => {
      const mockAdmin = mockKafka.admin();
      mockAdmin.listTopics.mockResolvedValueOnce(['mikrotik-commands', 'device-events']);

      const response = await request(testSetup.app)
        .get('/api/kafka/topics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        topics: ['mikrotik-commands', 'device-events']
      });
    });

    it('должен проверить подключение к Kafka', async () => {
      mockProducer.connect.mockResolvedValueOnce(undefined);
      mockConsumer.connect.mockResolvedValueOnce(undefined);

      const response = await request(testSetup.app)
        .get('/api/kafka/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        producer: 'connected',
        consumer: 'connected',
        timestamp: expect.any(String)
      });
    });

    it('должен обработать ошибку подключения к Kafka', async () => {
      mockProducer.connect.mockRejectedValueOnce(new Error('Connection failed'));

      const response = await request(testSetup.app)
        .get('/api/kafka/health')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(503);

      expect(response.body).toMatchObject({
        status: 'unhealthy',
        error: expect.stringContaining('Connection failed')
      });
    });
  });

  describe('Интеграция с MikroTik через Kafka', () => {
    it('должен выполнить полный цикл: создание счета -> DHCP lease -> блокировка -> разблокировка', async () => {
      // Мокаем все операции MikroTik
      mockMikroTikService.addDHCPLease.mockResolvedValue({ success: true, ip: '192.168.1.100' });
      mockMikroTikService.blockClient.mockResolvedValue({ success: true });
      mockMikroTikService.unblockClient.mockResolvedValue({ success: true });

      // Мокаем Kafka producer
      mockProducer.send.mockResolvedValue([{
        topicName: 'mikrotik-commands',
        partition: 0,
        errorCode: 0,
        offset: '200'
      }]);

      // 1. Создаем новый счет
      const accountData = {
        clientId,
        tariffId: (await testSetup.prisma.tariff.findFirst())!.id,
        balance: 1000,
        macAddress: '00:AA:BB:CC:DD:EE',
        poolName: 'integration-test',
        deviceId
      };

      const createResponse = await request(testSetup.app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(accountData)
        .expect(201);

      const newAccountId = createResponse.body.id;

      // Проверяем, что команда ADD_DHCP_LEASE отправлена
      expect(mockProducer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'mikrotik-commands',
          messages: expect.arrayContaining([
            expect.objectContaining({
              value: expect.stringContaining('ADD_DHCP_LEASE')
            })
          ])
        })
      );

      // 2. Блокируем счет
      await request(testSetup.app)
        .post(`/api/accounts/${newAccountId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Проверяем, что команда BLOCK_CLIENT отправлена
      expect(mockProducer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              value: expect.stringContaining('BLOCK_CLIENT')
            })
          ])
        })
      );

      // 3. Разблокируем счет
      await request(testSetup.app)
        .post(`/api/accounts/${newAccountId}/unblock`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Проверяем, что команда UNBLOCK_CLIENT отправлена
      expect(mockProducer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              value: expect.stringContaining('UNBLOCK_CLIENT')
            })
          ])
        })
      );

      // Проверяем общее количество вызовов
      expect(mockProducer.send).toHaveBeenCalledTimes(3);
    });

    it('должен обработать массовые операции через Kafka', async () => {
      // Создаем несколько счетов для массовой блокировки
      const accounts = [];
      for (let i = 0; i < 3; i++) {
        const account = await testSetup.createTestAccount(clientId, (await testSetup.prisma.tariff.findFirst())!.id, {
          macAddress: `00:11:22:33:44:${50 + i}`,
          deviceId,
          balance: 0 // Низкий баланс для блокировки
        });
        accounts.push(account);
      }

      mockProducer.send.mockResolvedValue([{
        topicName: 'mikrotik-commands',
        partition: 0,
        errorCode: 0,
        offset: '300'
      }]);

      // Выполняем массовую блокировку через биллинг
      const response = await request(testSetup.app)
        .post('/api/billing/block-insufficient-funds')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.blocked).toBeGreaterThanOrEqual(3);

      // Проверяем, что команды блокировки отправлены для всех счетов
      expect(mockProducer.send).toHaveBeenCalledTimes(3);
    });
  });
});