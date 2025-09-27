import request from 'supertest';
import { setupIntegrationTests, teardownIntegrationTests, testSetup } from './setup';
import * as crypto from 'crypto';

// Моки для внешних API
jest.mock('axios');
const mockedAxios = jest.mocked(require('axios'));

describe('Интеграционные тесты: Внешние API', () => {
  let authToken: string;
  let clientId: string;
  let accountId: string;

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

    // Создаем тестового клиента и счет
    const client = await testSetup.createTestClient();
    clientId = client.id;

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

  describe('Интеграция с Robokassa', () => {
    describe('Генерация ссылки для оплаты', () => {
      it('должен сгенерировать корректную ссылку для оплаты', async () => {
        const paymentData = {
          accountId,
          amount: 1000,
          description: 'Пополнение баланса'
        };

        const response = await request(testSetup.app)
          .post('/api/payments/robokassa/generate-url')
          .set('Authorization', `Bearer ${authToken}`)
          .send(paymentData)
          .expect(200);

        expect(response.body).toMatchObject({
          paymentUrl: expect.stringContaining('https://auth.robokassa.ru/Merchant/Index.aspx'),
          invoiceId: expect.any(String),
          amount: 1000
        });

        // Проверяем, что платеж создан в базе со статусом PENDING
        const payment = await testSetup.prisma.payment.findFirst({
          where: { externalId: response.body.invoiceId }
        });

        expect(payment).toMatchObject({
          accountId,
          amount: 1000,
          source: 'ROBOKASSA',
          status: 'PENDING'
        });
      });

      it('должен вернуть ошибку для несуществующего лицевого счета', async () => {
        const paymentData = {
          accountId: 'non-existent-account',
          amount: 1000,
          description: 'Пополнение баланса'
        };

        await request(testSetup.app)
          .post('/api/payments/robokassa/generate-url')
          .set('Authorization', `Bearer ${authToken}`)
          .send(paymentData)
          .expect(404);
      });
    });

    describe('Обработка webhook от Robokassa', () => {
      it('должен успешно обработать webhook об успешной оплате', async () => {
        // Создаем тестовый платеж в статусе PENDING
        const payment = await testSetup.createTestPayment(accountId, {
          source: 'ROBOKASSA',
          status: 'PENDING',
          externalId: 'test-invoice-123',
          processedAt: null
        });

        // Получаем баланс до платежа
        const accountBefore = await testSetup.prisma.account.findUnique({
          where: { id: accountId }
        });

        // Формируем webhook данные
        const webhookData = {
          OutSum: '1000.00',
          InvId: payment.externalId,
          SignatureValue: 'test-signature'
        };

        // Мокаем проверку подписи
        jest.spyOn(require('../../modules/payments/robokassa.service'), 'verifySignature')
          .mockReturnValue(true);

        const response = await request(testSetup.app)
          .post('/api/payments/robokassa/webhook')
          .send(webhookData)
          .expect(200);

        expect(response.text).toBe('OK');

        // Проверяем, что платеж обновился
        const updatedPayment = await testSetup.prisma.payment.findUnique({
          where: { id: payment.id }
        });

        expect(updatedPayment).toMatchObject({
          status: 'COMPLETED',
          processedAt: expect.any(Date)
        });

        // Проверяем, что баланс увеличился
        const accountAfter = await testSetup.prisma.account.findUnique({
          where: { id: accountId }
        });

        expect(accountAfter!.balance).toBe(accountBefore!.balance + 1000);
      });

      it('должен отклонить webhook с неверной подписью', async () => {
        const webhookData = {
          OutSum: '1000.00',
          InvId: 'test-invoice-456',
          SignatureValue: 'invalid-signature'
        };

        // Мокаем неуспешную проверку подписи
        jest.spyOn(require('../../modules/payments/robokassa.service'), 'verifySignature')
          .mockReturnValue(false);

        await request(testSetup.app)
          .post('/api/payments/robokassa/webhook')
          .send(webhookData)
          .expect(400);
      });

      it('должен обработать webhook для несуществующего платежа', async () => {
        const webhookData = {
          OutSum: '1000.00',
          InvId: 'non-existent-invoice',
          SignatureValue: 'test-signature'
        };

        jest.spyOn(require('../../modules/payments/robokassa.service'), 'verifySignature')
          .mockReturnValue(true);

        await request(testSetup.app)
          .post('/api/payments/robokassa/webhook')
          .send(webhookData)
          .expect(404);
      });
    });

    describe('Проверка статуса платежа', () => {
      it('должен проверить статус платежа через Robokassa API', async () => {
        const payment = await testSetup.createTestPayment(accountId, {
          source: 'ROBOKASSA',
          status: 'PENDING',
          externalId: 'test-invoice-789'
        });

        // Мокаем ответ от Robokassa API
        mockedAxios.get.mockResolvedValueOnce({
          data: {
            State: {
              Code: 5, // Успешно завершен
              RequestDate: '2024-01-01T12:00:00Z',
              StateDate: '2024-01-01T12:05:00Z'
            }
          }
        });

        const response = await request(testSetup.app)
          .get(`/api/payments/${payment.id}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          status: 'COMPLETED',
          externalStatus: 'SUCCESS',
          lastCheck: expect.any(String)
        });

        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpState'),
          expect.objectContaining({
            params: expect.objectContaining({
              MerchantLogin: process.env.ROBOKASSA_MERCHANT_ID,
              InvoiceID: payment.externalId
            })
          })
        );
      });
    });
  });

  describe('Интеграция с Telegram Bot API', () => {
    describe('Отправка сообщений', () => {
      it('должен отправить сообщение через Telegram Bot API', async () => {
        // Обновляем клиента с Telegram ID
        await testSetup.prisma.client.update({
          where: { id: clientId },
          data: { telegramId: '123456789' }
        });

        // Мокаем успешный ответ от Telegram API
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            ok: true,
            result: {
              message_id: 123,
              date: Math.floor(Date.now() / 1000),
              chat: { id: 123456789 },
              text: 'Тестовое сообщение'
            }
          }
        });

        const notificationData = {
          clientId,
          type: 'PAYMENT',
          message: 'Ваш платеж успешно обработан'
        };

        const response = await request(testSetup.app)
          .post('/api/notifications/send')
          .set('Authorization', `Bearer ${authToken}`)
          .send(notificationData)
          .expect(200);

        expect(response.body).toMatchObject({
          id: expect.any(String),
          status: 'SENT',
          channel: 'TELEGRAM'
        });

        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`),
          expect.objectContaining({
            chat_id: '123456789',
            text: 'Ваш платеж успешно обработан'
          })
        );
      });

      it('должен переключиться на SMS при недоступности Telegram', async () => {
        // Мокаем ошибку от Telegram API
        mockedAxios.post.mockRejectedValueOnce(new Error('Telegram API недоступен'));

        // Мокаем успешную отправку SMS
        jest.spyOn(require('../../modules/notifications/services/sms.service'), 'sendSMS')
          .mockResolvedValue({ messageId: 'sms-123', status: 'sent' });

        const notificationData = {
          clientId,
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
          status: 'SENT',
          channel: 'SMS'
        });
      });
    });

    describe('Обработка webhook от Telegram', () => {
      it('должен обработать команду /start от пользователя', async () => {
        const telegramUpdate = {
          update_id: 123456,
          message: {
            message_id: 1,
            from: {
              id: 987654321,
              is_bot: false,
              first_name: 'Тест',
              username: 'testuser'
            },
            chat: {
              id: 987654321,
              first_name: 'Тест',
              type: 'private'
            },
            date: Math.floor(Date.now() / 1000),
            text: '/start'
          }
        };

        // Мокаем ответ Telegram API
        mockedAxios.post.mockResolvedValueOnce({
          data: { ok: true, result: { message_id: 2 } }
        });

        const response = await request(testSetup.app)
          .post('/api/telegram/webhook')
          .send(telegramUpdate)
          .expect(200);

        expect(response.body).toMatchObject({
          status: 'processed'
        });

        // Проверяем, что был отправлен приветственный ответ
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/sendMessage'),
          expect.objectContaining({
            chat_id: 987654321,
            text: expect.stringContaining('Добро пожаловать')
          })
        );
      });

      it('должен обработать авторизацию по номеру телефона', async () => {
        const telegramUpdate = {
          update_id: 123457,
          message: {
            message_id: 2,
            from: {
              id: 987654321,
              is_bot: false,
              first_name: 'Тест'
            },
            chat: {
              id: 987654321,
              first_name: 'Тест',
              type: 'private'
            },
            date: Math.floor(Date.now() / 1000),
            contact: {
              phone_number: '79001234567',
              first_name: 'Тест',
              user_id: 987654321
            }
          }
        };

        mockedAxios.post.mockResolvedValueOnce({
          data: { ok: true, result: { message_id: 3 } }
        });

        const response = await request(testSetup.app)
          .post('/api/telegram/webhook')
          .send(telegramUpdate)
          .expect(200);

        expect(response.body).toMatchObject({
          status: 'processed'
        });

        // Проверяем, что клиент был найден и привязан к Telegram ID
        const updatedClient = await testSetup.prisma.client.findFirst({
          where: { phones: { has: '+79001234567' } }
        });

        expect(updatedClient?.telegramId).toBe('987654321');
      });

      it('должен обработать запрос баланса', async () => {
        // Привязываем Telegram ID к клиенту
        await testSetup.prisma.client.update({
          where: { id: clientId },
          data: { telegramId: '987654321' }
        });

        const telegramUpdate = {
          update_id: 123458,
          message: {
            message_id: 3,
            from: {
              id: 987654321,
              is_bot: false,
              first_name: 'Тест'
            },
            chat: {
              id: 987654321,
              first_name: 'Тест',
              type: 'private'
            },
            date: Math.floor(Date.now() / 1000),
            text: '/balance'
          }
        };

        mockedAxios.post.mockResolvedValueOnce({
          data: { ok: true, result: { message_id: 4 } }
        });

        const response = await request(testSetup.app)
          .post('/api/telegram/webhook')
          .send(telegramUpdate)
          .expect(200);

        expect(response.body).toMatchObject({
          status: 'processed'
        });

        // Проверяем, что был отправлен ответ с балансом
        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/sendMessage'),
          expect.objectContaining({
            chat_id: 987654321,
            text: expect.stringContaining('Баланс')
          })
        );
      });
    });

    describe('Настройка webhook', () => {
      it('должен установить webhook для Telegram бота', async () => {
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            ok: true,
            result: true,
            description: 'Webhook was set'
          }
        });

        const response = await request(testSetup.app)
          .post('/api/telegram/set-webhook')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            url: 'https://example.com/api/telegram/webhook'
          })
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Webhook установлен успешно'
        });

        expect(mockedAxios.post).toHaveBeenCalledWith(
          expect.stringContaining('/setWebhook'),
          expect.objectContaining({
            url: 'https://example.com/api/telegram/webhook'
          })
        );
      });
    });
  });

  describe('Интеграция с Yandex Maps API', () => {
    it('должен получить координаты по адресу', async () => {
      // Мокаем ответ от Yandex Maps API
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          response: {
            GeoObjectCollection: {
              featureMember: [{
                GeoObject: {
                  Point: {
                    pos: '37.6176 55.7558'
                  },
                  metaDataProperty: {
                    GeocoderMetaData: {
                      text: 'Россия, Москва, улица Ленина, 10'
                    }
                  }
                }
              }]
            }
          }
        }
      });

      const response = await request(testSetup.app)
        .get('/api/clients/geocode')
        .query({ address: 'Москва, улица Ленина, 10' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        coordinates: {
          latitude: 55.7558,
          longitude: 37.6176
        },
        formattedAddress: 'Россия, Москва, улица Ленина, 10'
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('https://geocode-maps.yandex.ru/1.x/'),
        expect.objectContaining({
          params: expect.objectContaining({
            apikey: process.env.YANDEX_MAPS_API_KEY,
            geocode: 'Москва, улица Ленина, 10',
            format: 'json'
          })
        })
      );
    });

    it('должен вернуть ошибку при недоступности Yandex Maps API', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API недоступен'));

      await request(testSetup.app)
        .get('/api/clients/geocode')
        .query({ address: 'Несуществующий адрес' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);
    });
  });
});