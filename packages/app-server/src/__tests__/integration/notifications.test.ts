import request from 'supertest';
import { setupIntegrationTests, teardownIntegrationTests, testSetup } from './setup';

// Моки для внешних сервисов
jest.mock('axios');
const mockedAxios = jest.mocked(require('axios'));

// Мок для SMS сервиса
const mockSMSService = {
  sendSMS: jest.fn(),
  getStatus: jest.fn(),
  clearOutbox: jest.fn()
};

jest.mock('../../modules/notifications/services/sms.service', () => ({
  SMSService: jest.fn().mockImplementation(() => mockSMSService)
}));

describe('Интеграционные тесты: Система уведомлений', () => {
  let authToken: string;
  let clientId: string;
  let accountId: string;
  let clientWithTelegram: any;
  let clientWithoutTelegram: any;

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

    // Создаем клиентов для тестов
    clientWithTelegram = await testSetup.createTestClient({
      firstName: 'Telegram',
      lastName: 'Пользователь',
      phones: ['+79001111111'],
      telegramId: '123456789'
    });

    clientWithoutTelegram = await testSetup.createTestClient({
      firstName: 'SMS',
      lastName: 'Пользователь',
      phones: ['+79002222222'],
      telegramId: null
    });

    clientId = clientWithTelegram.id;

    // Создаем лицевой счет
    const tariffs = await testSetup.prisma.tariff.findMany();
    const account = await testSetup.createTestAccount(clientId, tariffs[0].id);
    accountId = account.id;
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Отправка уведомлений через Telegram', () => {
    it('должен отправить уведомление через Telegram Bot API', async () => {
      // Мокаем успешный ответ от Telegram API
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          ok: true,
          result: {
            message_id: 123,
            date: Math.floor(Date.now() / 1000),
            chat: { id: 123456789 },
            text: 'Тестовое уведомление'
          }
        }
      });

      const notificationData = {
        clientId: clientWithTelegram.id,
        type: 'PAYMENT',
        message: 'Ваш платеж на сумму 500 рублей успешно обработан'
      };

      const response = await request(testSetup.app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(notificationData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        status: 'SENT',
        channel: 'TELEGRAM',
        externalId: '123'
      });

      // Проверяем, что уведомление сохранено в базе
      const notification = await testSetup.prisma.notification.findUnique({
        where: { id: response.body.id }
      });

      expect(notification).toMatchObject({
        clientId: clientWithTelegram.id,
        type: 'PAYMENT',
        channel: 'TELEGRAM',
        status: 'SENT',
        externalId: '123'
      });

      // Проверяем вызов Telegram API
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`),
        expect.objectContaining({
          chat_id: '123456789',
          text: 'Ваш платеж на сумму 500 рублей успешно обработан',
          parse_mode: 'HTML'
        })
      );
    });

    it('должен обработать ошибку от Telegram API', async () => {
      // Мокаем ошибку от Telegram API
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            ok: false,
            error_code: 400,
            description: 'Bad Request: chat not found'
          }
        }
      });

      const notificationData = {
        clientId: clientWithTelegram.id,
        type: 'LOW_BALANCE',
        message: 'Низкий баланс на счете'
      };

      const response = await request(testSetup.app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(notificationData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        status: 'FAILED',
        channel: 'TELEGRAM',
        error: expect.stringContaining('chat not found')
      });
    });

    it('должен переключиться на SMS при недоступности Telegram', async () => {
      // Мокаем ошибку от Telegram API
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      // Мокаем успешную отправку SMS
      mockSMSService.sendSMS.mockResolvedValueOnce({
        messageId: 'sms-123',
        status: 'sent'
      });

      const notificationData = {
        clientId: clientWithTelegram.id,
        type: 'BLOCKED',
        message: 'Ваш счет заблокирован'
      };

      const response = await request(testSetup.app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(notificationData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        status: 'SENT',
        channel: 'SMS',
        externalId: 'sms-123'
      });

      // Проверяем, что SMS был отправлен
      expect(mockSMSService.sendSMS).toHaveBeenCalledWith(
        '+79001111111',
        'Ваш счет заблокирован'
      );
    });
  });

  describe('Отправка SMS уведомлений', () => {
    it('должен отправить SMS для клиента без Telegram', async () => {
      // Мокаем успешную отправку SMS
      mockSMSService.sendSMS.mockResolvedValueOnce({
        messageId: 'sms-456',
        status: 'sent'
      });

      const notificationData = {
        clientId: clientWithoutTelegram.id,
        type: 'WELCOME',
        message: 'Добро пожаловать в OK-Telecom!'
      };

      const response = await request(testSetup.app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(notificationData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        status: 'SENT',
        channel: 'SMS',
        externalId: 'sms-456'
      });

      expect(mockSMSService.sendSMS).toHaveBeenCalledWith(
        '+79002222222',
        'Добро пожаловать в OK-Telecom!'
      );
    });

    it('должен обработать ошибку SMS шлюза', async () => {
      // Мокаем ошибку SMS сервиса
      mockSMSService.sendSMS.mockRejectedValueOnce(new Error('SMS gateway unavailable'));

      const notificationData = {
        clientId: clientWithoutTelegram.id,
        type: 'PAYMENT',
        message: 'Платеж получен'
      };

      const response = await request(testSetup.app)
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send(notificationData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        status: 'FAILED',
        channel: 'SMS',
        error: expect.stringContaining('SMS gateway unavailable')
      });
    });

    it('должен проверить статус SMS сообщения', async () => {
      // Создаем уведомление в статусе PENDING
      const notification = await testSetup.prisma.notification.create({
        data: {
          clientId: clientWithoutTelegram.id,
          type: 'PAYMENT',
          channel: 'SMS',
          message: 'Тестовое SMS',
          status: 'PENDING',
          externalId: 'sms-789'
        }
      });

      // Мокаем проверку статуса
      mockSMSService.getStatus.mockResolvedValueOnce({
        messageId: 'sms-789',
        status: 'delivered',
        deliveredAt: new Date()
      });

      const response = await request(testSetup.app)
        .get(`/api/notifications/${notification.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: notification.id,
        status: 'SENT',
        externalStatus: 'delivered',
        deliveredAt: expect.any(String)
      });

      expect(mockSMSService.getStatus).toHaveBeenCalledWith('sms-789');
    });
  });

  describe('Шаблоны уведомлений', () => {
    it('должен использовать шаблон для генерации сообщения', async () => {
      // Обновляем шаблон с плейсхолдерами
      await testSetup.prisma.notificationTemplate.updateMany({
        where: {
          type: 'PAYMENT',
          channel: 'TELEGRAM'
        },
        data: {
          template: 'Уважаемый {{clientName}}, ваш платеж на сумму {{amount}} рублей успешно обработан. Баланс: {{balance}} рублей.'
        }
      });

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          ok: true,
          result: { message_id: 124 }
        }
      });

      const response = await request(testSetup.app)
        .post('/api/notifications/send-templated')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          clientId: clientWithTelegram.id,
          type: 'PAYMENT',
          variables: {
            clientName: 'Иван Петров',
            amount: 500,
            balance: 1500
          }
        })
        .expect(200);

      expect(response.body.status).toBe('SENT');

      // Проверяем, что сообщение было сформировано по шаблону
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          text: 'Уважаемый Иван Петров, ваш платеж на сумму 500 рублей успешно обработан. Баланс: 1500 рублей.'
        })
      );
    });

    it('должен создать новый шаблон уведомления', async () => {
      const templateData = {
        type: 'UNBLOCKED',
        channel: 'TELEGRAM',
        template: 'Ваш счет {{accountNumber}} разблокирован. Текущий баланс: {{balance}} рублей.',
        isActive: true
      };

      const response = await request(testSetup.app)
        .post('/api/notifications/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(templateData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        type: 'UNBLOCKED',
        channel: 'TELEGRAM',
        template: templateData.template,
        isActive: true
      });
    });

    it('должен обновить существующий шаблон', async () => {
      const template = await testSetup.prisma.notificationTemplate.findFirst({
        where: {
          type: 'WELCOME',
          channel: 'SMS'
        }
      });

      const updateData = {
        template: 'Добро пожаловать в OK-Telecom, {{clientName}}! Ваш номер счета: {{accountNumber}}',
        isActive: true
      };

      const response = await request(testSetup.app)
        .patch(`/api/notifications/templates/${template!.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: template!.id,
        template: updateData.template,
        isActive: true
      });
    });

    it('должен получить список всех шаблонов', async () => {
      const response = await request(testSetup.app)
        .get('/api/notifications/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        templates: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            type: expect.any(String),
            channel: expect.any(String),
            template: expect.any(String),
            isActive: expect.any(Boolean)
          })
        ]),
        total: expect.any(Number)
      });
    });
  });

  describe('Массовые уведомления', () => {
    it('должен отправить уведомления всем активным клиентам', async () => {
      // Мокаем успешные ответы
      mockedAxios.post.mockResolvedValue({
        data: { ok: true, result: { message_id: 125 } }
      });
      mockSMSService.sendSMS.mockResolvedValue({
        messageId: 'bulk-sms-1',
        status: 'sent'
      });

      const bulkData = {
        type: 'MAINTENANCE',
        message: 'Плановые технические работы 01.01.2024 с 02:00 до 04:00',
        filters: {
          status: 'ACTIVE'
        }
      };

      const response = await request(testSetup.app)
        .post('/api/notifications/send-bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body).toMatchObject({
        total: expect.any(Number),
        sent: expect.any(Number),
        failed: expect.any(Number),
        results: expect.arrayContaining([
          expect.objectContaining({
            clientId: expect.any(String),
            status: expect.stringMatching(/SENT|FAILED/),
            channel: expect.stringMatching(/TELEGRAM|SMS/)
          })
        ])
      });
    });

    it('должен отправить уведомления клиентам с определенным тарифом', async () => {
      const tariff = await testSetup.prisma.tariff.findFirst();

      mockedAxios.post.mockResolvedValue({
        data: { ok: true, result: { message_id: 126 } }
      });

      const bulkData = {
        type: 'TARIFF_UPDATE',
        message: 'Изменения в вашем тарифном плане',
        filters: {
          tariffId: tariff!.id
        }
      };

      const response = await request(testSetup.app)
        .post('/api/notifications/send-bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body.total).toBeGreaterThan(0);
    });
  });

  describe('Журнал уведомлений', () => {
    it('должен получить историю уведомлений клиента', async () => {
      const response = await request(testSetup.app)
        .get(`/api/notifications/history/${clientWithTelegram.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            type: expect.any(String),
            channel: expect.any(String),
            status: expect.any(String),
            createdAt: expect.any(String)
          })
        ]),
        total: expect.any(Number),
        page: 1,
        limit: 20
      });
    });

    it('должен фильтровать уведомления по типу и каналу', async () => {
      const response = await request(testSetup.app)
        .get(`/api/notifications/history/${clientWithTelegram.id}`)
        .query({
          type: 'PAYMENT',
          channel: 'TELEGRAM',
          status: 'SENT'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'PAYMENT',
            channel: 'TELEGRAM',
            status: 'SENT'
          })
        ])
      );
    });

    it('должен получить статистику уведомлений', async () => {
      const response = await request(testSetup.app)
        .get('/api/notifications/stats')
        .query({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 дней назад
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
          sent: expect.any(Number),
          failed: expect.any(Number),
          pending: expect.any(Number)
        },
        byChannel: {
          TELEGRAM: expect.any(Number),
          SMS: expect.any(Number)
        },
        byType: expect.objectContaining({
          WELCOME: expect.any(Number),
          PAYMENT: expect.any(Number),
          LOW_BALANCE: expect.any(Number),
          BLOCKED: expect.any(Number),
          UNBLOCKED: expect.any(Number)
        })
      });
    });
  });

  describe('Автоматические уведомления', () => {
    it('должен отправить уведомление при создании платежа', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { ok: true, result: { message_id: 127 } }
      });

      // Создаем платеж, который должен вызвать автоматическое уведомление
      await request(testSetup.app)
        .post('/api/payments/manual')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          accountId,
          amount: 1000,
          comment: 'Пополнение баланса'
        })
        .expect(201);

      // Проверяем, что уведомление было создано
      const notification = await testSetup.prisma.notification.findFirst({
        where: {
          clientId: clientWithTelegram.id,
          type: 'PAYMENT'
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(notification).toBeTruthy();
      expect(notification!.status).toBe('SENT');
    });

    it('должен отправить уведомление при блокировке счета', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { ok: true, result: { message_id: 128 } }
      });

      // Блокируем счет
      await request(testSetup.app)
        .post(`/api/accounts/${accountId}/block`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Проверяем, что уведомление о блокировке было отправлено
      const notification = await testSetup.prisma.notification.findFirst({
        where: {
          clientId: clientWithTelegram.id,
          type: 'BLOCKED'
        },
        orderBy: { createdAt: 'desc' }
      });

      expect(notification).toBeTruthy();
      expect(notification!.status).toBe('SENT');
    });
  });

  describe('Настройки уведомлений', () => {
    it('должен обновить настройки SMS шлюза', async () => {
      const settingsData = {
        smsGateway: {
          ip: '192.168.1.100',
          username: 'new_admin',
          password: 'new_password',
          enabled: true
        }
      };

      const response = await request(testSetup.app)
        .patch('/api/notifications/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(settingsData)
        .expect(200);

      expect(response.body).toMatchObject({
        smsGateway: {
          ip: '192.168.1.100',
          username: 'new_admin',
          enabled: true
        }
      });
    });

    it('должен протестировать подключение к SMS шлюзу', async () => {
      mockSMSService.sendSMS.mockResolvedValueOnce({
        messageId: 'test-sms',
        status: 'sent'
      });

      const response = await request(testSetup.app)
        .post('/api/notifications/test-sms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          phone: '+79999999999',
          message: 'Тестовое SMS сообщение'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        messageId: 'test-sms',
        status: 'sent'
      });
    });

    it('должен протестировать Telegram бота', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          ok: true,
          result: {
            id: 123456789,
            is_bot: true,
            first_name: 'OK-Telecom Bot',
            username: 'oktelecom_bot'
          }
        }
      });

      const response = await request(testSetup.app)
        .post('/api/notifications/test-telegram')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        botInfo: {
          id: 123456789,
          username: 'oktelecom_bot',
          first_name: 'OK-Telecom Bot'
        }
      });
    });
  });
});