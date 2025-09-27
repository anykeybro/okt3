import request from 'supertest';
import { setupIntegrationTests, teardownIntegrationTests, testSetup } from './setup';

describe('Интеграционные тесты: Полный цикл работы с абонентами', () => {
  let authToken: string;
  let clientId: string;
  let accountId: string;
  let tariffId: string;

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

    // Получаем ID тарифа для тестов
    const tariffs = await testSetup.prisma.tariff.findMany();
    tariffId = tariffs[0].id;
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  describe('1. Создание абонента', () => {
    it('должен создать нового абонента с валидными данными', async () => {
      const clientData = {
        firstName: 'Иван',
        lastName: 'Петров',
        middleName: 'Сергеевич',
        phones: ['+79001234567', '+79007654321'],
        email: 'ivan.petrov@example.com',
        address: 'ул. Ленина, д. 10, кв. 5',
        coordinates: {
          latitude: 55.7558,
          longitude: 37.6176
        }
      };

      const response = await request(testSetup.app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(clientData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        middleName: clientData.middleName,
        phones: clientData.phones,
        email: clientData.email,
        address: clientData.address
      });

      clientId = response.body.id;
    });

    it('должен вернуть ошибку при создании абонента с невалидными данными', async () => {
      const invalidData = {
        firstName: '', // Пустое имя
        lastName: 'Петров',
        phones: ['invalid-phone'] // Невалидный телефон
      };

      await request(testSetup.app)
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('2. Создание лицевого счета', () => {
    it('должен создать лицевой счет для абонента', async () => {
      const accountData = {
        clientId,
        tariffId,
        balance: 1000,
        macAddress: '00:11:22:33:44:55',
        poolName: 'home-users',
        blockThreshold: 0
      };

      const response = await request(testSetup.app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(accountData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        accountNumber: expect.any(String),
        clientId,
        tariffId,
        balance: 1000,
        status: 'ACTIVE',
        macAddress: accountData.macAddress,
        poolName: accountData.poolName
      });

      accountId = response.body.id;
    });

    it('должен вернуть ошибку при создании счета с несуществующим тарифом', async () => {
      const invalidAccountData = {
        clientId,
        tariffId: 'non-existent-tariff-id',
        balance: 1000,
        macAddress: '00:11:22:33:44:66',
        poolName: 'home-users'
      };

      await request(testSetup.app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidAccountData)
        .expect(400);
    });
  });

  describe('3. Управление балансом', () => {
    it('должен пополнить баланс лицевого счета', async () => {
      const paymentData = {
        accountId,
        amount: 500,
        comment: 'Пополнение через кассу'
      };

      const response = await request(testSetup.app)
        .post('/api/payments/manual')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        accountId,
        amount: 500,
        source: 'MANUAL',
        status: 'COMPLETED'
      });

      // Проверяем, что баланс обновился
      const accountResponse = await request(testSetup.app)
        .get(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(accountResponse.body.balance).toBe(1500); // 1000 + 500
    });

    it('должен списать средства с лицевого счета', async () => {
      const debitData = {
        accountId,
        amount: 300,
        comment: 'Списание за услуги'
      };

      await request(testSetup.app)
        .post('/api/billing/debit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(debitData)
        .expect(200);

      // Проверяем, что баланс уменьшился
      const accountResponse = await request(testSetup.app)
        .get(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(accountResponse.body.balance).toBe(1200); // 1500 - 300
    });
  });

  describe('4. Смена тарифа', () => {
    it('должен изменить тариф лицевого счета', async () => {
      // Получаем другой тариф
      const tariffs = await testSetup.prisma.tariff.findMany();
      const newTariffId = tariffs.find(t => t.id !== tariffId)?.id;

      const updateData = {
        tariffId: newTariffId
      };

      const response = await request(testSetup.app)
        .patch(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.tariffId).toBe(newTariffId);
    });
  });

  describe('5. Блокировка и разблокировка', () => {
    it('должен заблокировать лицевой счет', async () => {
      await request(testSetup.app)
        .post(`/api/accounts/${accountId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Проверяем статус
      const accountResponse = await request(testSetup.app)
        .get(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(accountResponse.body.status).toBe('BLOCKED');
    });

    it('должен разблокировать лицевой счет', async () => {
      await request(testSetup.app)
        .post(`/api/accounts/${accountId}/unblock`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Проверяем статус
      const accountResponse = await request(testSetup.app)
        .get(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(accountResponse.body.status).toBe('ACTIVE');
    });
  });

  describe('6. История операций', () => {
    it('должен получить историю платежей по лицевому счету', async () => {
      const response = await request(testSetup.app)
        .get(`/api/accounts/${accountId}/payments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        payments: expect.arrayContaining([
          expect.objectContaining({
            accountId,
            amount: expect.any(Number),
            source: expect.any(String),
            status: 'COMPLETED'
          })
        ]),
        total: expect.any(Number),
        page: 1,
        limit: 20
      });
    });

    it('должен получить историю действий по абоненту', async () => {
      const response = await request(testSetup.app)
        .get(`/api/clients/${clientId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        history: expect.arrayContaining([
          expect.objectContaining({
            action: expect.any(String),
            timestamp: expect.any(String),
            details: expect.any(Object)
          })
        ]),
        total: expect.any(Number)
      });
    });
  });

  describe('7. Поиск и фильтрация', () => {
    it('должен найти абонента по номеру телефона', async () => {
      const response = await request(testSetup.app)
        .get('/api/clients/search')
        .query({ phone: '+79001234567' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.clients).toHaveLength(1);
      expect(response.body.clients[0].id).toBe(clientId);
    });

    it('должен найти абонента по адресу', async () => {
      const response = await request(testSetup.app)
        .get('/api/clients/search')
        .query({ address: 'Ленина' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.clients).toHaveLength(1);
      expect(response.body.clients[0].id).toBe(clientId);
    });

    it('должен фильтровать абонентов по статусу', async () => {
      const response = await request(testSetup.app)
        .get('/api/clients')
        .query({ status: 'ACTIVE' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.clients).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            accounts: expect.arrayContaining([
              expect.objectContaining({
                status: 'ACTIVE'
              })
            ])
          })
        ])
      );
    });
  });

  describe('8. Удаление данных', () => {
    it('должен деактивировать лицевой счет', async () => {
      await request(testSetup.app)
        .delete(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Проверяем, что счет деактивирован
      const accountResponse = await request(testSetup.app)
        .get(`/api/accounts/${accountId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(accountResponse.body.status).toBe('SUSPENDED');
    });

    it('должен деактивировать абонента', async () => {
      await request(testSetup.app)
        .delete(`/api/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Проверяем, что абонент помечен как неактивный
      const clientResponse = await request(testSetup.app)
        .get(`/api/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(clientResponse.body.isActive).toBe(false);
    });
  });
});