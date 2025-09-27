/**
 * Утилиты для интеграционных тестов
 */

import { PrismaClient } from '@prisma/client';
import { Express } from 'express';

export interface TestAccount {
  id: string;
  accountNumber: string;
  clientId: string;
  tariffId: string;
  balance: number;
  status: string;
  macAddress: string;
  poolName: string;
}

export interface TestClient {
  id: string;
  firstName: string;
  lastName: string;
  phones: string[];
  email?: string;
  telegramId?: string;
}

export interface TestPayment {
  id: string;
  accountId: string;
  amount: number;
  source: string;
  status: string;
}

/**
 * Утилиты для работы с тестовыми данными
 */
export class TestDataUtils {
  constructor(private prisma: PrismaClient) {}

  /**
   * Создает тестового клиента с несколькими лицевыми счетами
   */
  async createClientWithAccounts(accountsCount: number = 2): Promise<{
    client: TestClient;
    accounts: TestAccount[];
  }> {
    const client = await this.prisma.client.create({
      data: {
        firstName: 'Тест',
        lastName: 'Клиентов',
        middleName: 'Тестович',
        phones: ['+79001234567', '+79007654321'],
        email: 'test@example.com',
        address: 'ул. Тестовая, д. 1'
      }
    });

    const tariffs = await this.prisma.tariff.findMany({ take: accountsCount });
    const accounts = [];

    for (let i = 0; i < accountsCount; i++) {
      const account = await this.prisma.account.create({
        data: {
          accountNumber: `TEST${Date.now()}${i}`,
          clientId: client.id,
          tariffId: tariffs[i % tariffs.length].id,
          balance: 1000 + i * 500,
          status: 'ACTIVE',
          macAddress: `00:11:22:33:44:${50 + i}`,
          poolName: `test-pool-${i}`,
          blockThreshold: 0
        }
      });
      accounts.push(account);
    }

    return { client, accounts };
  }

  /**
   * Создает серию платежей для тестирования
   */
  async createPaymentHistory(accountId: string, paymentsCount: number = 5): Promise<TestPayment[]> {
    const payments = [];
    const sources = ['MANUAL', 'ROBOKASSA'];
    const statuses = ['COMPLETED', 'PENDING', 'FAILED'];

    for (let i = 0; i < paymentsCount; i++) {
      const payment = await this.prisma.payment.create({
        data: {
          accountId,
          amount: 100 + i * 50,
          source: sources[i % sources.length] as any,
          status: statuses[i % statuses.length] as any,
          comment: `Тестовый платеж ${i + 1}`,
          processedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000) // Каждый день назад
        }
      });
      payments.push(payment);
    }

    return payments;
  }

  /**
   * Создает тестовые уведомления
   */
  async createNotificationHistory(clientId: string, count: number = 10): Promise<any[]> {
    const notifications = [];
    const types = ['WELCOME', 'PAYMENT', 'LOW_BALANCE', 'BLOCKED', 'UNBLOCKED'];
    const channels = ['TELEGRAM', 'SMS'];
    const statuses = ['SENT', 'FAILED', 'PENDING'];

    for (let i = 0; i < count; i++) {
      const notification = await this.prisma.notification.create({
        data: {
          clientId,
          type: types[i % types.length] as any,
          channel: channels[i % channels.length] as any,
          status: statuses[i % statuses.length] as any,
          message: `Тестовое уведомление ${i + 1}`,
          externalId: `ext-${i}`,
          sentAt: statuses[i % statuses.length] === 'SENT' ? new Date() : null,
          createdAt: new Date(Date.now() - i * 60 * 60 * 1000) // Каждый час назад
        }
      });
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Создает тестовые заявки
   */
  async createTestRequests(count: number = 5): Promise<any[]> {
    const requests = [];
    const statuses = ['NEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

    for (let i = 0; i < count; i++) {
      const request = await this.prisma.request.create({
        data: {
          address: `ул. Заявочная, д. ${i + 1}`,
          firstName: `Заявка${i + 1}`,
          lastName: 'Тестовая',
          phone: `+7900123456${i}`,
          desiredServices: ['Интернет', 'IPTV'],
          status: statuses[i % statuses.length] as any,
          notes: `Тестовая заявка ${i + 1}`,
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        }
      });
      requests.push(request);
    }

    return requests;
  }

  /**
   * Очищает все тестовые данные
   */
  async cleanupTestData(): Promise<void> {
    // Удаляем в правильном порядке (учитывая зависимости)
    await this.prisma.notification.deleteMany({
      where: { message: { contains: 'Тестовое' } }
    });
    
    await this.prisma.payment.deleteMany({
      where: { comment: { contains: 'Тестовый' } }
    });
    
    await this.prisma.request.deleteMany({
      where: { firstName: { contains: 'Заявка' } }
    });
    
    await this.prisma.account.deleteMany({
      where: { accountNumber: { contains: 'TEST' } }
    });
    
    await this.prisma.client.deleteMany({
      where: { firstName: 'Тест' }
    });
  }
}

/**
 * Утилиты для HTTP тестирования
 */
export class HTTPTestUtils {
  constructor(private app: Express) {}

  /**
   * Выполняет авторизацию и возвращает токен
   */
  async authenticate(username: string = 'test_admin', password: string = 'test_password'): Promise<string> {
    const request = require('supertest');
    
    const response = await request(this.app)
      .post('/api/auth/login')
      .send({ username, password })
      .expect(200);

    return response.body.token;
  }

  /**
   * Создает авторизованный запрос
   */
  createAuthorizedRequest(token: string) {
    const request = require('supertest');
    return {
      get: (url: string) => request(this.app).get(url).set('Authorization', `Bearer ${token}`),
      post: (url: string) => request(this.app).post(url).set('Authorization', `Bearer ${token}`),
      patch: (url: string) => request(this.app).patch(url).set('Authorization', `Bearer ${token}`),
      delete: (url: string) => request(this.app).delete(url).set('Authorization', `Bearer ${token}`)
    };
  }

  /**
   * Ожидает определенное время (для асинхронных операций)
   */
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Повторяет запрос до получения ожидаемого результата
   */
  async waitForCondition(
    conditionFn: () => Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await conditionFn()) {
        return;
      }
      await this.wait(interval);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }
}

/**
 * Утилиты для проверки данных
 */
export class AssertionUtils {
  /**
   * Проверяет структуру ответа API
   */
  static expectApiResponse(response: any, expectedStructure: any): void {
    expect(response).toMatchObject(expectedStructure);
  }

  /**
   * Проверяет пагинацию
   */
  static expectPaginatedResponse(response: any, expectedFields: string[] = []): void {
    expect(response).toMatchObject({
      total: expect.any(Number),
      page: expect.any(Number),
      limit: expect.any(Number),
      data: expect.any(Array)
    });

    if (expectedFields.length > 0 && response.data.length > 0) {
      expectedFields.forEach(field => {
        expect(response.data[0]).toHaveProperty(field);
      });
    }
  }

  /**
   * Проверяет временные метки
   */
  static expectTimestamps(obj: any): void {
    expect(obj).toMatchObject({
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    });
  }

  /**
   * Проверяет UUID
   */
  static expectUUID(value: string): void {
    expect(value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  }

  /**
   * Проверяет номер телефона
   */
  static expectPhoneNumber(value: string): void {
    expect(value).toMatch(/^\+7\d{10}$/);
  }

  /**
   * Проверяет email
   */
  static expectEmail(value: string): void {
    expect(value).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  }

  /**
   * Проверяет MAC адрес
   */
  static expectMacAddress(value: string): void {
    expect(value).toMatch(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/);
  }
}

/**
 * Генераторы тестовых данных
 */
export class TestDataGenerator {
  /**
   * Генерирует случайный номер телефона
   */
  static generatePhoneNumber(): string {
    const number = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
    return `+7${number}`;
  }

  /**
   * Генерирует случайный email
   */
  static generateEmail(): string {
    const domains = ['example.com', 'test.ru', 'demo.org'];
    const username = Math.random().toString(36).substring(2, 8);
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${username}@${domain}`;
  }

  /**
   * Генерирует случайный MAC адрес
   */
  static generateMacAddress(): string {
    const hex = '0123456789ABCDEF';
    let mac = '';
    for (let i = 0; i < 6; i++) {
      if (i > 0) mac += ':';
      mac += hex[Math.floor(Math.random() * 16)];
      mac += hex[Math.floor(Math.random() * 16)];
    }
    return mac;
  }

  /**
   * Генерирует случайный IP адрес
   */
  static generateIPAddress(): string {
    return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  /**
   * Генерирует случайную сумму
   */
  static generateAmount(min: number = 100, max: number = 10000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}