import { PrismaClient } from '@prisma/client';
import { Express } from 'express';
import express from 'express';
import { config } from '../../config/config';

export class IntegrationTestSetup {
  public app!: Express;
  public prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'mongodb://localhost:27017/test_billing'
        }
      }
    });
  }

  async setup(): Promise<void> {
    // Создаем простое Express приложение для тестов
    this.app = express();
    this.app.use(express.json());
    
    // Подключаемся к тестовой базе данных
    await this.prisma.$connect();
    
    // Очищаем базу данных перед тестами
    await this.cleanDatabase();
    
    // Создаем тестовые данные
    await this.seedTestData();
  }

  async teardown(): Promise<void> {
    // Очищаем базу данных после тестов
    await this.cleanDatabase();
    
    // Отключаемся от базы данных
    await this.prisma.$disconnect();
  }

  private async cleanDatabase(): Promise<void> {
    // Очищаем все коллекции в правильном порядке (учитывая зависимости)
    const collections = [
      'Payment',
      'Notification',
      'Request',
      'Account',
      'Client',
      'Device',
      'Tariff',
      'TariffGroup',
      'Service',
      'SystemUser',
      'Role',
      'Permission',
      'NotificationTemplate'
    ];

    for (const collection of collections) {
      try {
        await (this.prisma as any)[collection.toLowerCase()]?.deleteMany({});
      } catch (error) {
        // Игнорируем ошибки если коллекция не существует
        console.warn(`Не удалось очистить коллекцию ${collection}:`, error);
      }
    }
  }

  private async seedTestData(): Promise<void> {
    // Создаем тестовые роли и права
    const adminRole = await this.prisma.role.create({
      data: {
        name: 'Суперадмин',
        description: 'Полный доступ к системе',
        permissions: {
          create: [
            { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'clients', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'tariffs', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'payments', actions: ['create', 'read', 'update', 'delete'] },
            { resource: 'devices', actions: ['create', 'read', 'update', 'delete'] }
          ]
        }
      }
    });

    // Создаем тестового администратора
    await this.prisma.systemUser.create({
      data: {
        username: 'test_admin',
        passwordHash: '$2b$10$test.hash.for.testing.purposes.only',
        roleId: adminRole.id,
        isActive: true
      }
    });

    // Создаем тестовые услуги
    const internetService = await this.prisma.service.create({
      data: {
        name: 'Интернет',
        description: 'Доступ в интернет',
        type: 'INTERNET',
        isActive: true
      }
    });

    const iptvService = await this.prisma.service.create({
      data: {
        name: 'IPTV',
        description: 'Цифровое телевидение',
        type: 'IPTV',
        isActive: true
      }
    });

    // Создаем тестовую группу тарифов
    const tariffGroup = await this.prisma.tariffGroup.create({
      data: {
        name: 'Домашние тарифы',
        description: 'Тарифы для домашнего использования'
      }
    });

    // Создаем тестовые тарифы
    await this.prisma.tariff.create({
      data: {
        name: 'Базовый',
        description: 'Базовый тариф для дома',
        price: 500,
        billingType: 'PREPAID_MONTHLY',
        speedDown: 50,
        speedUp: 10,
        groupId: tariffGroup.id,
        isVisibleInLK: true,
        notificationDays: 3,
        isActive: true,
        serviceIds: [internetService.id]
      }
    });

    await this.prisma.tariff.create({
      data: {
        name: 'Премиум',
        description: 'Премиум тариф с IPTV',
        price: 800,
        billingType: 'PREPAID_MONTHLY',
        speedDown: 100,
        speedUp: 20,
        groupId: tariffGroup.id,
        isVisibleInLK: true,
        notificationDays: 5,
        isActive: true,
        serviceIds: [internetService.id, iptvService.id]
      }
    });

    // Создаем тестовое устройство
    await this.prisma.device.create({
      data: {
        ipAddress: '192.168.1.1',
        username: 'admin',
        passwordHash: '$2b$10$test.device.hash',
        description: 'Тестовое устройство MikroTik',
        status: 'ONLINE',
        lastCheck: new Date()
      }
    });

    // Создаем шаблоны уведомлений
    const notificationTypes = ['WELCOME', 'PAYMENT', 'LOW_BALANCE', 'BLOCKED', 'UNBLOCKED'];
    const channels = ['TELEGRAM', 'SMS'];

    for (const type of notificationTypes) {
      for (const channel of channels) {
        await this.prisma.notificationTemplate.create({
          data: {
            type: type as any,
            channel: channel as any,
            template: `Тестовый шаблон ${type} для ${channel}: {{message}}`,
            isActive: true
          }
        });
      }
    }
  }

  // Вспомогательные методы для создания тестовых данных
  async createTestClient(data: Partial<any> = {}): Promise<any> {
    return await this.prisma.client.create({
      data: {
        firstName: 'Тест',
        lastName: 'Клиентов',
        middleName: 'Тестович',
        phones: ['+79001234567'],
        email: 'test@example.com',
        address: 'ул. Тестовая, д. 1',
        coordinates: {
          latitude: 55.7558,
          longitude: 37.6176
        },
        ...data
      }
    });
  }

  async createTestAccount(clientId: string, tariffId: string, data: Partial<any> = {}): Promise<any> {
    return await this.prisma.account.create({
      data: {
        accountNumber: `TEST${Date.now()}`,
        clientId,
        tariffId,
        balance: 1000,
        status: 'ACTIVE',
        macAddress: '00:11:22:33:44:55',
        poolName: 'test-pool',
        blockThreshold: 0,
        ...data
      }
    });
  }

  async createTestPayment(accountId: string, data: Partial<any> = {}): Promise<any> {
    return await this.prisma.payment.create({
      data: {
        accountId,
        amount: 500,
        source: 'MANUAL',
        comment: 'Тестовый платеж',
        status: 'COMPLETED',
        processedAt: new Date(),
        ...data
      }
    });
  }

  async createTestRequest(data: Partial<any> = {}): Promise<any> {
    return await this.prisma.request.create({
      data: {
        address: 'ул. Заявочная, д. 1',
        firstName: 'Заявка',
        lastName: 'Тестовая',
        phone: '+79009876543',
        desiredServices: ['Интернет', 'IPTV'],
        status: 'NEW',
        ...data
      }
    });
  }
}

// Глобальная переменная для использования в тестах
export let testSetup: IntegrationTestSetup;

// Функции для использования в beforeAll/afterAll
export const setupIntegrationTests = async (): Promise<void> => {
  testSetup = new IntegrationTestSetup();
  await testSetup.setup();
};

export const teardownIntegrationTests = async (): Promise<void> => {
  if (testSetup) {
    await testSetup.teardown();
  }
};