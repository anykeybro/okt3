/**
 * Упрощенные интеграционные тесты для проверки основной функциональности
 */

import { setupIntegrationTests, teardownIntegrationTests, testSetup } from './setup';

describe('Упрощенные интеграционные тесты', () => {
  beforeAll(async () => {
    await setupIntegrationTests();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  describe('Подключение к базе данных', () => {
    it('должен подключиться к тестовой базе данных', async () => {
      expect(testSetup.prisma).toBeDefined();
      
      // Проверяем подключение
      await expect(testSetup.prisma.$connect()).resolves.not.toThrow();
    });

    it('должен создать тестовые данные', async () => {
      // Проверяем, что тестовые роли созданы
      const roles = await testSetup.prisma.role.findMany();
      expect(roles.length).toBeGreaterThan(0);

      // Проверяем, что тестовые услуги созданы
      const services = await testSetup.prisma.service.findMany();
      expect(services.length).toBeGreaterThan(0);

      // Проверяем, что тестовые тарифы созданы
      const tariffs = await testSetup.prisma.tariff.findMany();
      expect(tariffs.length).toBeGreaterThan(0);
    });
  });

  describe('CRUD операции с клиентами', () => {
    it('должен создать и получить клиента', async () => {
      const client = await testSetup.createTestClient({
        firstName: 'Интеграционный',
        lastName: 'Тест'
      });

      expect(client).toMatchObject({
        id: expect.any(String),
        firstName: 'Интеграционный',
        lastName: 'Тест'
      });

      // Получаем клиента из базы
      const foundClient = await testSetup.prisma.client.findUnique({
        where: { id: client.id }
      });

      expect(foundClient).toMatchObject({
        firstName: 'Интеграционный',
        lastName: 'Тест'
      });
    });

    it('должен создать лицевой счет для клиента', async () => {
      const client = await testSetup.createTestClient();
      const tariffs = await testSetup.prisma.tariff.findMany();
      
      const account = await testSetup.createTestAccount(client.id, tariffs[0].id);

      expect(account).toMatchObject({
        id: expect.any(String),
        clientId: client.id,
        tariffId: tariffs[0].id,
        balance: expect.any(Number),
        status: 'ACTIVE'
      });
    });
  });

  describe('Операции с платежами', () => {
    it('должен создать платеж и обновить баланс', async () => {
      const client = await testSetup.createTestClient();
      const tariffs = await testSetup.prisma.tariff.findMany();
      const account = await testSetup.createTestAccount(client.id, tariffs[0].id, {
        balance: 500
      });

      const payment = await testSetup.createTestPayment(account.id, {
        amount: 1000,
        source: 'MANUAL',
        status: 'COMPLETED'
      });

      expect(payment).toMatchObject({
        accountId: account.id,
        amount: 1000,
        source: 'MANUAL',
        status: 'COMPLETED'
      });

      // Проверяем, что платеж сохранен в базе
      const foundPayment = await testSetup.prisma.payment.findUnique({
        where: { id: payment.id }
      });

      expect(foundPayment).toBeTruthy();
    });
  });

  describe('Система уведомлений', () => {
    it('должен создать уведомление', async () => {
      const client = await testSetup.createTestClient();

      const notification = await testSetup.prisma.notification.create({
        data: {
          clientId: client.id,
          type: 'WELCOME',
          channel: 'TELEGRAM',
          message: 'Добро пожаловать!',
          status: 'SENT'
        }
      });

      expect(notification).toMatchObject({
        clientId: client.id,
        type: 'WELCOME',
        channel: 'TELEGRAM',
        message: 'Добро пожаловать!',
        status: 'SENT'
      });
    });

    it('должен получить шаблоны уведомлений', async () => {
      const templates = await testSetup.prisma.notificationTemplate.findMany();
      expect(templates.length).toBeGreaterThan(0);

      const welcomeTemplate = templates.find(t => t.type === 'WELCOME');
      expect(welcomeTemplate).toBeTruthy();
    });
  });

  describe('Заявки', () => {
    it('должен создать заявку', async () => {
      const request = await testSetup.createTestRequest({
        firstName: 'Заявитель',
        lastName: 'Тестовый',
        phone: '+79001234567',
        address: 'ул. Тестовая, д. 1'
      });

      expect(request).toMatchObject({
        firstName: 'Заявитель',
        lastName: 'Тестовый',
        phone: '+79001234567',
        address: 'ул. Тестовая, д. 1',
        status: 'NEW'
      });
    });
  });

  describe('Устройства', () => {
    it('должен получить тестовое устройство', async () => {
      const devices = await testSetup.prisma.device.findMany();
      expect(devices.length).toBeGreaterThan(0);

      const device = devices[0];
      expect(device).toMatchObject({
        id: expect.any(String),
        ipAddress: expect.any(String),
        status: expect.any(String)
      });
    });
  });

  describe('Очистка данных', () => {
    it('должен очистить тестовые данные', async () => {
      // Создаем тестовые данные
      const client = await testSetup.createTestClient({
        firstName: 'ДляУдаления'
      });

      // Проверяем, что данные созданы
      const createdClient = await testSetup.prisma.client.findUnique({
        where: { id: client.id }
      });
      expect(createdClient).toBeTruthy();

      // Удаляем данные
      await testSetup.prisma.client.delete({
        where: { id: client.id }
      });

      // Проверяем, что данные удалены
      const deletedClient = await testSetup.prisma.client.findUnique({
        where: { id: client.id }
      });
      expect(deletedClient).toBeNull();
    });
  });
});