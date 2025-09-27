import request from 'supertest';
import { setupIntegrationTests, teardownIntegrationTests, testSetup } from './setup';

// Мокаем cron для контроля выполнения задач
jest.mock('node-cron');
const mockedCron = jest.mocked(require('node-cron'));

describe('Интеграционные тесты: Биллинговый цикл', () => {
  let authToken: string;
  let clientId: string;
  let monthlyAccountId: string;
  let hourlyAccountId: string;
  let monthlyTariffId: string;
  let hourlyTariffId: string;

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

    // Создаем тестового клиента
    const client = await testSetup.createTestClient();
    clientId = client.id;

    // Получаем тарифы
    const tariffs = await testSetup.prisma.tariff.findMany();
    monthlyTariffId = tariffs.find(t => t.billingType === 'PREPAID_MONTHLY')?.id!;
    
    // Создаем почасовой тариф для тестов
    const hourlyTariff = await testSetup.prisma.tariff.create({
      data: {
        name: 'Почасовой',
        description: 'Тариф с почасовой оплатой',
        price: 5, // 5 рублей в час
        billingType: 'HOURLY',
        speedDown: 30,
        speedUp: 5,
        isVisibleInLK: true,
        notificationDays: 1,
        isActive: true
      }
    });
    hourlyTariffId = hourlyTariff.id;

    // Создаем лицевые счета с разными типами тарификации
    const monthlyAccount = await testSetup.createTestAccount(clientId, monthlyTariffId, {
      balance: 1000,
      status: 'ACTIVE'
    });
    monthlyAccountId = monthlyAccount.id;

    const hourlyAccount = await testSetup.createTestAccount(clientId, hourlyTariffId, {
      balance: 500,
      status: 'ACTIVE'
    });
    hourlyAccountId = hourlyAccount.id;
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Предоплатная тарификация (месячная)', () => {
    it('должен списать абонентскую плату в начале месяца', async () => {
      // Получаем баланс до списания
      const accountBefore = await testSetup.prisma.account.findUnique({
        where: { id: monthlyAccountId },
        include: { tariff: true }
      });

      // Запускаем месячное списание
      const response = await request(testSetup.app)
        .post('/api/billing/process-monthly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        processed: expect.any(Number),
        totalAmount: expect.any(Number),
        errors: []
      });

      // Проверяем, что баланс уменьшился на стоимость тарифа
      const accountAfter = await testSetup.prisma.account.findUnique({
        where: { id: monthlyAccountId }
      });

      expect(accountAfter!.balance).toBe(
        accountBefore!.balance - accountBefore!.tariff.price
      );

      // Проверяем, что создана запись о списании
      const billingRecord = await testSetup.prisma.payment.findFirst({
        where: {
          accountId: monthlyAccountId,
          source: 'MANUAL',
          amount: { lt: 0 } // Отрицательная сумма для списания
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(billingRecord).toMatchObject({
        accountId: monthlyAccountId,
        amount: -accountBefore!.tariff.price,
        source: 'MANUAL',
        status: 'COMPLETED'
      });
    });

    it('должен заблокировать счет при недостатке средств', async () => {
      // Устанавливаем низкий баланс
      await testSetup.prisma.account.update({
        where: { id: monthlyAccountId },
        data: { balance: 100 } // Меньше стоимости тарифа
      });

      // Запускаем месячное списание
      const response = await request(testSetup.app)
        .post('/api/billing/process-monthly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0]).toMatchObject({
        accountId: monthlyAccountId,
        error: 'Недостаточно средств'
      });

      // Проверяем, что счет заблокирован
      const account = await testSetup.prisma.account.findUnique({
        where: { id: monthlyAccountId }
      });

      expect(account!.status).toBe('BLOCKED');
    });

    it('должен отправить уведомление о скором окончании средств', async () => {
      // Устанавливаем баланс, который закончится через 2 дня
      const tariff = await testSetup.prisma.tariff.findUnique({
        where: { id: monthlyTariffId }
      });
      
      await testSetup.prisma.account.update({
        where: { id: monthlyAccountId },
        data: { 
          balance: tariff!.price * 0.1, // 10% от стоимости тарифа
          status: 'ACTIVE'
        }
      });

      // Запускаем проверку уведомлений
      const response = await request(testSetup.app)
        .post('/api/billing/check-notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        sent: expect.any(Number),
        notifications: expect.arrayContaining([
          expect.objectContaining({
            accountId: monthlyAccountId,
            type: 'LOW_BALANCE'
          })
        ])
      });

      // Проверяем, что уведомление создано в базе
      const notification = await testSetup.prisma.notification.findFirst({
        where: {
          clientId,
          type: 'LOW_BALANCE'
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(notification).toBeTruthy();
    });
  });

  describe('Почасовая тарификация', () => {
    it('должен списывать средства каждый час', async () => {
      // Получаем баланс до списания
      const accountBefore = await testSetup.prisma.account.findUnique({
        where: { id: hourlyAccountId },
        include: { tariff: true }
      });

      // Запускаем почасовое списание
      const response = await request(testSetup.app)
        .post('/api/billing/process-hourly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        processed: expect.any(Number),
        totalAmount: expect.any(Number),
        errors: []
      });

      // Проверяем, что баланс уменьшился на почасовую стоимость
      const accountAfter = await testSetup.prisma.account.findUnique({
        where: { id: hourlyAccountId }
      });

      expect(accountAfter!.balance).toBe(
        accountBefore!.balance - accountBefore!.tariff.price
      );
    });

    it('должен заблокировать счет при недостатке средств для почасовой оплаты', async () => {
      // Устанавливаем баланс меньше почасовой стоимости
      await testSetup.prisma.account.update({
        where: { id: hourlyAccountId },
        data: { balance: 2 } // Меньше 5 рублей в час
      });

      // Запускаем почасовое списание
      const response = await request(testSetup.app)
        .post('/api/billing/process-hourly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.errors).toHaveLength(1);

      // Проверяем, что счет заблокирован
      const account = await testSetup.prisma.account.findUnique({
        where: { id: hourlyAccountId }
      });

      expect(account!.status).toBe('BLOCKED');
    });

    it('должен рассчитать правильную стоимость для частичного часа', async () => {
      // Создаем сессию длительностью 30 минут
      const sessionStart = new Date();
      const sessionEnd = new Date(sessionStart.getTime() + 30 * 60 * 1000); // +30 минут

      const response = await request(testSetup.app)
        .post('/api/billing/calculate-session-cost')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId: hourlyAccountId,
          startTime: sessionStart.toISOString(),
          endTime: sessionEnd.toISOString()
        })
        .expect(200);

      // 30 минут = 0.5 часа, стоимость = 5 * 0.5 = 2.5 рубля
      expect(response.body).toMatchObject({
        duration: 30, // минуты
        cost: 2.5,
        hourlyRate: 5
      });
    });
  });

  describe('Автоматическая блокировка и разблокировка', () => {
    it('должен автоматически разблокировать счет после пополнения', async () => {
      // Блокируем счет из-за недостатка средств
      await testSetup.prisma.account.update({
        where: { id: monthlyAccountId },
        data: { 
          status: 'BLOCKED',
          balance: 0
        }
      });

      // Пополняем баланс
      await request(testSetup.app)
        .post('/api/payments/manual')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId: monthlyAccountId,
          amount: 1000,
          comment: 'Пополнение для разблокировки'
        })
        .expect(201);

      // Проверяем, что счет автоматически разблокирован
      const account = await testSetup.prisma.account.findUnique({
        where: { id: monthlyAccountId }
      });

      expect(account!.status).toBe('ACTIVE');
      expect(account!.balance).toBe(1000);
    });

    it('должен учитывать порог блокировки при автоматической блокировке', async () => {
      // Устанавливаем порог блокировки
      await testSetup.prisma.account.update({
        where: { id: monthlyAccountId },
        data: { 
          blockThreshold: 100,
          balance: 150,
          status: 'ACTIVE'
        }
      });

      // Списываем средства, чтобы баланс стал меньше порога
      await request(testSetup.app)
        .post('/api/billing/debit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId: monthlyAccountId,
          amount: 60,
          comment: 'Тестовое списание'
        })
        .expect(200);

      // Проверяем, что счет заблокирован (баланс 90 < порог 100)
      const account = await testSetup.prisma.account.findUnique({
        where: { id: monthlyAccountId }
      });

      expect(account!.status).toBe('BLOCKED');
      expect(account!.balance).toBe(90);
    });
  });

  describe('Планировщик биллинговых задач', () => {
    it('должен настроить cron задачи для автоматического биллинга', async () => {
      // Проверяем, что cron задачи настроены
      expect(mockedCron.schedule).toHaveBeenCalledWith(
        '0 0 1 * *', // Каждое 1 число месяца в 00:00
        expect.any(Function),
        expect.objectContaining({
          scheduled: true,
          timezone: 'Europe/Moscow'
        })
      );

      expect(mockedCron.schedule).toHaveBeenCalledWith(
        '0 * * * *', // Каждый час
        expect.any(Function),
        expect.objectContaining({
          scheduled: true,
          timezone: 'Europe/Moscow'
        })
      );
    });

    it('должен выполнить ручной запуск биллинговых задач', async () => {
      const response = await request(testSetup.app)
        .post('/api/billing/run-tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tasks: ['monthly', 'hourly', 'notifications']
        })
        .expect(200);

      expect(response.body).toMatchObject({
        results: {
          monthly: expect.objectContaining({
            processed: expect.any(Number),
            totalAmount: expect.any(Number)
          }),
          hourly: expect.objectContaining({
            processed: expect.any(Number),
            totalAmount: expect.any(Number)
          }),
          notifications: expect.objectContaining({
            sent: expect.any(Number)
          })
        }
      });
    });
  });

  describe('Отчеты по биллингу', () => {
    it('должен сгенерировать отчет по списаниям за период', async () => {
      const startDate = new Date();
      startDate.setDate(1); // Начало месяца
      const endDate = new Date();

      const response = await request(testSetup.app)
        .get('/api/billing/reports/charges')
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: {
          totalCharges: expect.any(Number),
          totalAccounts: expect.any(Number),
          averageCharge: expect.any(Number)
        },
        charges: expect.arrayContaining([
          expect.objectContaining({
            accountId: expect.any(String),
            amount: expect.any(Number),
            date: expect.any(String),
            type: expect.stringMatching(/monthly|hourly/)
          })
        ])
      });
    });

    it('должен сгенерировать отчет по заблокированным счетам', async () => {
      const response = await request(testSetup.app)
        .get('/api/billing/reports/blocked-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        total: expect.any(Number),
        accounts: expect.arrayContaining([
          expect.objectContaining({
            accountId: expect.any(String),
            accountNumber: expect.any(String),
            clientName: expect.any(String),
            balance: expect.any(Number),
            blockedAt: expect.any(String),
            reason: expect.any(String)
          })
        ])
      });
    });

    it('должен сгенерировать прогноз доходов', async () => {
      const response = await request(testSetup.app)
        .get('/api/billing/reports/revenue-forecast')
        .query({ months: 3 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        forecast: expect.arrayContaining([
          expect.objectContaining({
            month: expect.any(String),
            projectedRevenue: expect.any(Number),
            activeAccounts: expect.any(Number),
            averageArpu: expect.any(Number)
          })
        ]),
        summary: {
          totalProjectedRevenue: expect.any(Number),
          growthRate: expect.any(Number)
        }
      });
    });
  });

  describe('Обработка ошибок биллинга', () => {
    it('должен обработать ошибку при недоступности базы данных', async () => {
      // Мокаем ошибку базы данных
      jest.spyOn(testSetup.prisma.account, 'findMany')
        .mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(testSetup.app)
        .post('/api/billing/process-monthly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Ошибка при обработке биллинга',
        details: expect.stringContaining('Database connection failed')
      });
    });

    it('должен продолжить обработку других счетов при ошибке в одном', async () => {
      // Создаем счет с некорректными данными
      const invalidAccount = await testSetup.createTestAccount(clientId, monthlyTariffId, {
        balance: null, // Некорректный баланс
        status: 'ACTIVE'
      });

      const response = await request(testSetup.app)
        .post('/api/billing/process-monthly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Должен обработать валидные счета и вернуть ошибки для невалидных
      expect(response.body.processed).toBeGreaterThan(0);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            accountId: invalidAccount.id,
            error: expect.any(String)
          })
        ])
      );
    });
  });
});