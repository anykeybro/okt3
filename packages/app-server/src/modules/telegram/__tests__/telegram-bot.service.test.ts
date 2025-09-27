// Тесты для TelegramBotService
import { TelegramBotService } from '../services/telegram-bot.service';
import { TelegramUpdate, BotUserState, CallbackAction } from '../types';
import { PrismaClient } from '@prisma/client';

// Мокаем Prisma
jest.mock('@prisma/client');
const mockPrisma = {
  client: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  account: {
    findUnique: jest.fn(),
  },
  payment: {
    findMany: jest.fn(),
  },
  service: {
    findMany: jest.fn(),
  },
} as any;

// Мокаем TelegramService
jest.mock('../../notifications/services/telegram.service');

describe('TelegramBotService', () => {
  let telegramBotService: TelegramBotService;

  beforeEach(() => {
    jest.clearAllMocks();
    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
    telegramBotService = new TelegramBotService();
  });

  describe('processUpdate', () => {
    it('должен обрабатывать текстовые сообщения', async () => {
      const update: TelegramUpdate = {
        update_id: 1,
        message: {
          message_id: 1,
          from: {
            id: 123456789,
            is_bot: false,
            first_name: 'Тест',
            username: 'testuser'
          },
          chat: {
            id: 123456789,
            type: 'private',
            first_name: 'Тест'
          },
          date: Date.now(),
          text: '/start'
        }
      };

      await expect(telegramBotService.processUpdate(update)).resolves.not.toThrow();
    });

    it('должен обрабатывать callback query', async () => {
      const update: TelegramUpdate = {
        update_id: 2,
        callback_query: {
          id: 'callback_1',
          from: {
            id: 123456789,
            is_bot: false,
            first_name: 'Тест'
          },
          data: JSON.stringify({ action: CallbackAction.VIEW_BALANCE })
        }
      };

      await expect(telegramBotService.processUpdate(update)).resolves.not.toThrow();
    });
  });

  describe('handlePhoneContact', () => {
    it('должен найти клиента по номеру телефона', async () => {
      const mockClient = {
        id: 'client_1',
        firstName: 'Иван',
        lastName: 'Иванов',
        phones: ['+79001234567'],
        accounts: [{
          id: 'account_1',
          accountNumber: '12345',
          tariff: {
            name: 'Базовый',
            price: 500
          }
        }]
      };

      mockPrisma.client.findFirst.mockResolvedValue(mockClient);
      mockPrisma.client.update.mockResolvedValue(mockClient);

      const session = {
        chatId: '123456789',
        userId: 123456789,
        state: BotUserState.WAITING_PHONE,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Используем приватный метод через any
      await expect(
        (telegramBotService as any).handlePhoneContact('+79001234567', session)
      ).resolves.not.toThrow();

      expect(mockPrisma.client.findFirst).toHaveBeenCalledWith({
        where: {
          phones: {
            has: '+79001234567'
          }
        },
        include: {
          accounts: {
            include: {
              tariff: true
            }
          }
        }
      });
    });

    it('должен обработать случай, когда клиент не найден', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);

      const session = {
        chatId: '123456789',
        userId: 123456789,
        state: BotUserState.WAITING_PHONE,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(
        (telegramBotService as any).handlePhoneContact('+79001234567', session)
      ).resolves.not.toThrow();
    });
  });

  describe('handleViewBalance', () => {
    it('должен показать баланс аккаунта', async () => {
      const mockAccount = {
        id: 'account_1',
        accountNumber: '12345',
        balance: 1000,
        status: 'ACTIVE',
        tariff: {
          name: 'Базовый',
          price: 500,
          billingType: 'PREPAID_MONTHLY',
          speedDown: 100,
          speedUp: 50
        },
        client: {
          firstName: 'Иван',
          lastName: 'Иванов'
        }
      };

      mockPrisma.account.findUnique.mockResolvedValue(mockAccount);

      const session = {
        chatId: '123456789',
        userId: 123456789,
        state: BotUserState.AUTHENTICATED,
        selectedAccountId: 'account_1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(
        (telegramBotService as any).handleViewBalance(session)
      ).resolves.not.toThrow();

      expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'account_1' },
        include: {
          tariff: true,
          client: true
        }
      });
    });

    it('должен предложить выбрать аккаунт, если не выбран', async () => {
      const session = {
        chatId: '123456789',
        userId: 123456789,
        state: BotUserState.AUTHENTICATED,
        clientId: 'client_1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.client.findUnique.mockResolvedValue({
        id: 'client_1',
        accounts: []
      });

      await expect(
        (telegramBotService as any).handleViewBalance(session)
      ).resolves.not.toThrow();
    });
  });

  describe('handleViewPayments', () => {
    it('должен показать историю платежей', async () => {
      const mockPayments = [
        {
          id: 'payment_1',
          amount: 500,
          source: 'ROBOKASSA',
          createdAt: new Date(),
          comment: 'Пополнение баланса',
          account: {
            accountNumber: '12345'
          }
        }
      ];

      mockPrisma.payment.findMany.mockResolvedValue(mockPayments);

      const session = {
        chatId: '123456789',
        userId: 123456789,
        state: BotUserState.AUTHENTICATED,
        selectedAccountId: 'account_1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(
        (telegramBotService as any).handleViewPayments(session)
      ).resolves.not.toThrow();

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
        where: { 
          accountId: 'account_1',
          status: 'COMPLETED'
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          account: true
        }
      });
    });

    it('должен обработать пустую историю платежей', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);

      const session = {
        chatId: '123456789',
        userId: 123456789,
        state: BotUserState.AUTHENTICATED,
        selectedAccountId: 'account_1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(
        (telegramBotService as any).handleViewPayments(session)
      ).resolves.not.toThrow();
    });
  });

  describe('handleViewTariff', () => {
    it('должен показать информацию о тарифе', async () => {
      const mockAccount = {
        id: 'account_1',
        tariff: {
          name: 'Базовый',
          price: 500,
          billingType: 'PREPAID_MONTHLY',
          speedDown: 100,
          speedUp: 50,
          serviceIds: ['service_1', 'service_2'],
          description: 'Базовый тариф'
        }
      };

      const mockServices = [
        {
          id: 'service_1',
          name: 'Интернет',
          type: 'INTERNET'
        },
        {
          id: 'service_2',
          name: 'IPTV',
          type: 'IPTV'
        }
      ];

      mockPrisma.account.findUnique.mockResolvedValue(mockAccount);
      mockPrisma.service.findMany.mockResolvedValue(mockServices);

      const session = {
        chatId: '123456789',
        userId: 123456789,
        state: BotUserState.AUTHENTICATED,
        selectedAccountId: 'account_1',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(
        (telegramBotService as any).handleViewTariff(session)
      ).resolves.not.toThrow();

      expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['service_1', 'service_2'] }
        }
      });
    });
  });

  describe('normalizePhoneNumber', () => {
    it('должен нормализовать российские номера', () => {
      const normalize = (telegramBotService as any).normalizePhoneNumber;
      
      expect(normalize('89001234567')).toBe('+79001234567');
      expect(normalize('79001234567')).toBe('+79001234567');
      expect(normalize('+79001234567')).toBe('+79001234567');
      expect(normalize('8 (900) 123-45-67')).toBe('+79001234567');
    });
  });

  describe('getStatusText', () => {
    it('должен возвращать правильный текст статуса', () => {
      const getStatusText = (telegramBotService as any).getStatusText;
      
      expect(getStatusText('ACTIVE')).toBe('Активен');
      expect(getStatusText('BLOCKED')).toBe('Заблокирован');
      expect(getStatusText('SUSPENDED')).toBe('Приостановлен');
      expect(getStatusText('UNKNOWN')).toBe('Неизвестно');
    });
  });

  describe('cleanupOldSessions', () => {
    it('должен очищать старые сессии', () => {
      // Создаем старую сессию
      const oldSession = {
        chatId: '123456789',
        userId: 123456789,
        state: BotUserState.INITIAL,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 часов назад
        updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000)
      };

      // Добавляем сессию в приватное поле
      (telegramBotService as any).userSessions.set('123456789_123456789', oldSession);

      expect((telegramBotService as any).userSessions.size).toBe(1);

      telegramBotService.cleanupOldSessions();

      expect((telegramBotService as any).userSessions.size).toBe(0);
    });
  });

  describe('sendNotification', () => {
    it('должен отправить уведомление клиенту', async () => {
      const mockClient = {
        id: 'client_1',
        telegramId: '123456789'
      };

      mockPrisma.client.findUnique.mockResolvedValue(mockClient);

      const result = await telegramBotService.sendNotification('client_1', 'Тестовое уведомление');

      expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: 'client_1' }
      });
    });

    it('должен вернуть false, если у клиента нет Telegram ID', async () => {
      const mockClient = {
        id: 'client_1',
        telegramId: null
      };

      mockPrisma.client.findUnique.mockResolvedValue(mockClient);

      const result = await telegramBotService.sendNotification('client_1', 'Тестовое уведомление');

      expect(result).toBe(false);
    });
  });
});