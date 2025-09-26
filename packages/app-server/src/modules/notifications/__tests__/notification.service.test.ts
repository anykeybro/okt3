// Тесты для NotificationService
import { NotificationService } from '../services/notification.service';
import { NotificationType, NotificationChannel, NotificationStatus } from '../types';

// Мокаем зависимости
jest.mock('../services/sms.service');
jest.mock('../services/telegram.service');
jest.mock('../services/template.service');

const mockPrisma = {
  client: {
    findUnique: jest.fn(),
  },
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
} as any;

const mockSMSService = {
  sendSMS: jest.fn(),
  checkStatus: jest.fn(),
};

const mockTelegramService = {
  sendMessage: jest.fn(),
  checkBotStatus: jest.fn(),
};

const mockTemplateService = {
  getTemplate: jest.fn(),
  processTemplate: jest.fn(),
  initializeDefaultTemplates: jest.fn(),
};

describe('NotificationService', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    notificationService = new NotificationService(mockPrisma);
    
    // Заменяем приватные сервисы на моки
    (notificationService as any).smsService = mockSMSService;
    (notificationService as any).telegramService = mockTelegramService;
    (notificationService as any).templateService = mockTemplateService;
    
    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    const mockClient = {
      id: 'client1',
      firstName: 'Иван',
      lastName: 'Петров',
      phones: ['+79123456789'],
      telegramId: '12345',
      accounts: [{
        accountNumber: 'ACC001',
        balance: 100,
        tariff: {
          name: 'Базовый',
          price: 500,
        },
      }],
    };

    beforeEach(() => {
      mockPrisma.client.findUnique.mockResolvedValue(mockClient);
      mockTemplateService.getTemplate.mockResolvedValue('Привет, {{firstName}}!');
      mockTemplateService.processTemplate.mockReturnValue({
        message: 'Привет, Иван!',
        variables: { firstName: 'Иван' },
      });
    });

    it('должен отправлять уведомление через Telegram (приоритет 1)', async () => {
      mockTelegramService.sendMessage.mockResolvedValue({
        success: true,
        messageId: 123,
      });

      const result = await notificationService.sendNotification({
        clientId: 'client1',
        type: NotificationType.WELCOME,
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.TELEGRAM);
      expect(result.messageId).toBe('123');
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith('12345', 'Привет, Иван!');
      expect(mockSMSService.sendSMS).not.toHaveBeenCalled();
    });

    it('должен отправлять SMS если Telegram недоступен', async () => {
      // Убираем Telegram ID
      const clientWithoutTelegram = { ...mockClient, telegramId: null };
      mockPrisma.client.findUnique.mockResolvedValue(clientWithoutTelegram);

      mockSMSService.sendSMS.mockResolvedValue({
        success: true,
        messageId: 'sms_123',
      });

      const result = await notificationService.sendNotification({
        clientId: 'client1',
        type: NotificationType.WELCOME,
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.SMS);
      expect(result.messageId).toBe('sms_123');
      expect(mockSMSService.sendSMS).toHaveBeenCalledWith('+79123456789', 'Привет, Иван!');
    });

    it('должен отправлять SMS если Telegram не работает', async () => {
      mockTelegramService.sendMessage.mockResolvedValue({
        success: false,
        error: 'Bot blocked',
      });

      mockSMSService.sendSMS.mockResolvedValue({
        success: true,
        messageId: 'sms_123',
      });

      const result = await notificationService.sendNotification({
        clientId: 'client1',
        type: NotificationType.WELCOME,
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.SMS);
      expect(mockTelegramService.sendMessage).toHaveBeenCalled();
      expect(mockSMSService.sendSMS).toHaveBeenCalled();
    });

    it('должен возвращать ошибку если нет каналов связи', async () => {
      const clientWithoutContacts = {
        ...mockClient,
        telegramId: null,
        phones: [],
      };
      mockPrisma.client.findUnique.mockResolvedValue(clientWithoutContacts);

      const result = await notificationService.sendNotification({
        clientId: 'client1',
        type: NotificationType.WELCOME,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('нет доступных каналов');
    });

    it('должен обрабатывать ошибку если клиент не найден', async () => {
      mockPrisma.client.findUnique.mockResolvedValue(null);

      const result = await notificationService.sendNotification({
        clientId: 'nonexistent',
        type: NotificationType.WELCOME,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('не найден');
    });

    it('должен сохранять запись в журнал при успешной отправке', async () => {
      mockTelegramService.sendMessage.mockResolvedValue({
        success: true,
        messageId: 123,
      });

      await notificationService.sendNotification({
        clientId: 'client1',
        type: NotificationType.WELCOME,
      });

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          clientId: 'client1',
          type: NotificationType.WELCOME,
          channel: NotificationChannel.TELEGRAM,
          message: expect.any(String),
          status: NotificationStatus.SENT,
          externalId: '123',
          sentAt: expect.any(Date),
        },
      });
    });
  });

  describe('prepareTemplateVariables', () => {
    it('должен подготавливать переменные для шаблона', () => {
      const client = {
        firstName: 'Иван',
        lastName: 'Петров',
        middleName: 'Сергеевич',
        phones: ['+79123456789'],
        email: 'ivan@example.com',
        accounts: [{
          accountNumber: 'ACC001',
          balance: 100,
          tariff: {
            name: 'Базовый',
            price: 500,
          },
        }],
      };

      const additionalVars = { customVar: 'test' };

      const result = (notificationService as any).prepareTemplateVariables(client, additionalVars);

      expect(result).toMatchObject({
        firstName: 'Иван',
        lastName: 'Петров',
        middleName: 'Сергеевич',
        fullName: 'Иван Петров',
        phone: '+79123456789',
        email: 'ivan@example.com',
        accountNumber: 'ACC001',
        balance: 100,
        tariffName: 'Базовый',
        tariffPrice: 500,
        customVar: 'test',
      });

      expect(result.currentDate).toBeDefined();
      expect(result.currentTime).toBeDefined();
    });

    it('должен обрабатывать клиента без данных', () => {
      const client = {
        firstName: 'Иван',
        lastName: 'Петров',
        accounts: [],
      };

      const result = (notificationService as any).prepareTemplateVariables(client);

      expect(result).toMatchObject({
        firstName: 'Иван',
        lastName: 'Петров',
        middleName: '',
        phone: '',
        email: '',
        accountNumber: '',
        balance: 0,
        tariffName: '',
        tariffPrice: 0,
      });
    });
  });

  describe('sendBulkNotifications', () => {
    it('должен отправлять массовые уведомления', async () => {
      const notifications = [
        { clientId: 'client1', type: NotificationType.WELCOME },
        { clientId: 'client2', type: NotificationType.PAYMENT },
      ];

      // Мокаем успешную отправку для каждого уведомления
      jest.spyOn(notificationService, 'sendNotification')
        .mockResolvedValueOnce({
          success: true,
          channel: NotificationChannel.TELEGRAM,
          messageId: '123',
        })
        .mockResolvedValueOnce({
          success: true,
          channel: NotificationChannel.SMS,
          messageId: 'sms_456',
        });

      const results = await notificationService.sendBulkNotifications(notifications);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  describe('getNotificationHistory', () => {
    it('должен получать историю уведомлений', async () => {
      const mockHistory = [
        {
          id: '1',
          clientId: 'client1',
          type: NotificationType.WELCOME,
          channel: NotificationChannel.TELEGRAM,
          status: NotificationStatus.SENT,
          createdAt: new Date(),
        },
      ];

      mockPrisma.notification.findMany.mockResolvedValue(mockHistory);

      const result = await notificationService.getNotificationHistory('client1');

      expect(result).toEqual(mockHistory);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { clientId: 'client1' },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
              phones: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });
  });

  describe('getNotificationStats', () => {
    it('должен получать статистику уведомлений', async () => {
      mockPrisma.notification.count.mockResolvedValue(100);
      mockPrisma.notification.groupBy
        .mockResolvedValueOnce([
          { status: NotificationStatus.SENT, _count: { status: 80 } },
          { status: NotificationStatus.FAILED, _count: { status: 20 } },
        ])
        .mockResolvedValueOnce([
          { channel: NotificationChannel.TELEGRAM, _count: { channel: 60 } },
          { channel: NotificationChannel.SMS, _count: { channel: 40 } },
        ])
        .mockResolvedValueOnce([
          { type: NotificationType.WELCOME, _count: { type: 30 } },
          { type: NotificationType.PAYMENT, _count: { type: 70 } },
        ]);

      const result = await notificationService.getNotificationStats();

      expect(result).toEqual({
        total: 100,
        byStatus: {
          [NotificationStatus.SENT]: 80,
          [NotificationStatus.FAILED]: 20,
        },
        byChannel: {
          [NotificationChannel.TELEGRAM]: 60,
          [NotificationChannel.SMS]: 40,
        },
        byType: {
          [NotificationType.WELCOME]: 30,
          [NotificationType.PAYMENT]: 70,
        },
      });
    });
  });

  describe('checkServicesStatus', () => {
    it('должен проверять статус сервисов', async () => {
      mockTelegramService.checkBotStatus.mockResolvedValue(true);
      mockSMSService.checkStatus.mockResolvedValue(false);

      const result = await notificationService.checkServicesStatus();

      expect(result).toEqual({
        telegram: true,
        sms: false,
      });
    });
  });

  describe('initialize', () => {
    it('должен инициализировать сервис', async () => {
      mockTemplateService.initializeDefaultTemplates.mockResolvedValue(undefined);
      mockTelegramService.checkBotStatus.mockResolvedValue(true);
      mockSMSService.checkStatus.mockResolvedValue(true);

      await expect(notificationService.initialize()).resolves.not.toThrow();

      expect(mockTemplateService.initializeDefaultTemplates).toHaveBeenCalled();
    });
  });
});