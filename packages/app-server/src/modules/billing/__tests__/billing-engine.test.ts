// Тесты для биллингового движка
import { PrismaClient, AccountStatus, BillingType } from '@prisma/client';
import { BillingEngine } from '../billing-engine';
import { AccountBillingInfo } from '../types';

// Мокаем Prisma
const mockPrisma = {
  account: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  payment: {
    create: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
  $runCommandRaw: jest.fn(),
} as unknown as PrismaClient;

describe('BillingEngine', () => {
  let billingEngine: BillingEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    billingEngine = new BillingEngine(mockPrisma, { dryRun: false }); // Отключаем dryRun для тестов
  });

  describe('processBilling', () => {
    it('должен обработать активные аккаунты', async () => {
      const mockAccounts: AccountBillingInfo[] = [
        {
          id: '1',
          accountNumber: 'ACC001',
          balance: 1000,
          tariffPrice: 500,
          billingType: 'PREPAID_MONTHLY',
          status: 'ACTIVE',
          blockThreshold: 0,
          notificationDays: 3,
          clientId: 'client1',
          clientName: 'Иван Иванов',
          clientPhones: ['+79001234567'],
        },
      ];

      // Мокаем получение аккаунтов
      (mockPrisma.account.findMany as jest.Mock).mockResolvedValue([
        {
          id: '1',
          accountNumber: 'ACC001',
          balance: 1000,
          blockThreshold: 0,
          status: 'ACTIVE',
          clientId: 'client1',
          client: {
            firstName: 'Иван',
            lastName: 'Иванов',
            phones: ['+79001234567'],
            telegramId: null,
          },
          tariff: {
            price: 500,
            billingType: 'PREPAID_MONTHLY',
            notificationDays: 3,
          },
          payments: [],
        },
      ]);

      const stats = await billingEngine.processBilling();

      expect(stats.totalProcessed).toBe(1);
      expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
        where: { status: AccountStatus.ACTIVE },
        include: {
          client: true,
          tariff: true,
          payments: {
            where: { amount: { lt: 0 } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
    });

    it('должен обработать ошибки gracefully', async () => {
      (mockPrisma.account.findMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(billingEngine.processBilling()).rejects.toThrow('Database error');
    });
  });

  describe('processAccount', () => {
    it('должен списать средства для предоплатного тарифа без предыдущих списаний', async () => {
      const account: AccountBillingInfo = {
        id: '1',
        accountNumber: 'ACC001',
        balance: 1000,
        tariffPrice: 500,
        billingType: 'PREPAID_MONTHLY',
        status: 'ACTIVE',
        blockThreshold: 0,
        notificationDays: 3,
        clientId: 'client1',
        clientName: 'Иван Иванов',
        clientPhones: ['+79001234567'],
      };

      // Мокаем транзакцию для списания
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          account: {
            update: jest.fn().mockResolvedValue({}),
          },
          payment: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      (mockPrisma.notification.create as jest.Mock).mockResolvedValue({});

      const results = await billingEngine.processAccount(account);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].action).toBe('charge');
      expect(results[0].amount).toBe(500);
    });

    it('должен заблокировать аккаунт при недостатке средств', async () => {
      const account: AccountBillingInfo = {
        id: '1',
        accountNumber: 'ACC001',
        balance: 10, // Меньше порога блокировки
        tariffPrice: 500,
        billingType: 'PREPAID_MONTHLY',
        status: 'ACTIVE',
        blockThreshold: 50,
        notificationDays: 3,
        clientId: 'client1',
        clientName: 'Иван Иванов',
        clientPhones: ['+79001234567'],
      };

      // Создаем новый движок с включенной автоблокировкой
      const blockingEngine = new BillingEngine(mockPrisma, { 
        dryRun: false, 
        autoBlockEnabled: true 
      });

      (mockPrisma.account.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.notification.create as jest.Mock).mockResolvedValue({});

      const results = await blockingEngine.processAccount(account);

      // Должно быть уведомление о низком балансе
      expect(results.some(r => r.action === 'notify')).toBe(true);
    });

    it('должен отправить уведомление о низком балансе', async () => {
      const account: AccountBillingInfo = {
        id: '1',
        accountNumber: 'ACC001',
        balance: 50, // В пороге уведомлений
        tariffPrice: 500,
        billingType: 'PREPAID_MONTHLY',
        status: 'ACTIVE',
        blockThreshold: 0,
        notificationDays: 3,
        clientId: 'client1',
        clientName: 'Иван Иванов',
        clientPhones: ['+79001234567'],
      };

      (mockPrisma.notification.create as jest.Mock).mockResolvedValue({});

      const results = await billingEngine.processAccount(account);

      expect(results.some(r => r.action === 'notify')).toBe(true);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          clientId: 'client1',
          type: 'LOW_BALANCE',
          channel: 'SMS',
          message: expect.stringContaining('остается 50 руб'),
          status: 'PENDING',
        },
      });
    });
  });

  describe('unblockAccount', () => {
    it('должен разблокировать аккаунт с достаточным балансом', async () => {
      const mockAccount = {
        id: '1',
        accountNumber: 'ACC001',
        balance: 1000,
        blockThreshold: 50,
        status: 'BLOCKED',
        clientId: 'client1',
        client: {
          telegramId: null,
        },
      };

      (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (mockPrisma.account.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.notification.create as jest.Mock).mockResolvedValue({});

      const result = await billingEngine.unblockAccount('1');

      expect(result.success).toBe(true);
      expect(result.action).toBe('unblock');
      expect(mockPrisma.account.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: AccountStatus.ACTIVE,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('должен отклонить разблокировку при недостатке средств', async () => {
      const mockAccount = {
        id: '1',
        accountNumber: 'ACC001',
        balance: 10, // Меньше порога
        blockThreshold: 50,
        status: 'BLOCKED',
        clientId: 'client1',
        client: {
          telegramId: null,
        },
      };

      (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      const result = await billingEngine.unblockAccount('1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Недостаточно средств для разблокировки');
    });

    it('должен отклонить разблокировку незаблокированного аккаунта', async () => {
      const mockAccount = {
        id: '1',
        accountNumber: 'ACC001',
        balance: 1000,
        blockThreshold: 50,
        status: 'ACTIVE', // Не заблокирован
        clientId: 'client1',
        client: {
          telegramId: null,
        },
      };

      (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      const result = await billingEngine.unblockAccount('1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Аккаунт не заблокирован');
    });
  });

  describe('calculateCharge - почасовая тарификация', () => {
    it('должен рассчитать почасовое списание', async () => {
      const account: AccountBillingInfo = {
        id: '1',
        accountNumber: 'ACC001',
        balance: 1000,
        tariffPrice: 720, // 720 руб/месяц = 1 руб/час
        billingType: 'HOURLY',
        status: 'ACTIVE',
        blockThreshold: 0,
        notificationDays: 3,
        lastChargeDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 часа назад
        clientId: 'client1',
        clientName: 'Иван Иванов',
        clientPhones: ['+79001234567'],
      };

      const results = await billingEngine.processAccount(account);

      // Должно списать за 2 часа
      expect(results[0].amount).toBeCloseTo(2, 1); // 2 рубля за 2 часа
    });
  });

  describe('calculateCharge - предоплатная тарификация', () => {
    it('должен списать за месяц если прошел месяц с последнего списания', async () => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(lastMonth.getDate() - 1); // Чуть больше месяца

      const account: AccountBillingInfo = {
        id: '1',
        accountNumber: 'ACC001',
        balance: 1000,
        tariffPrice: 500,
        billingType: 'PREPAID_MONTHLY',
        status: 'ACTIVE',
        blockThreshold: 0,
        notificationDays: 3,
        lastChargeDate: lastMonth,
        clientId: 'client1',
        clientName: 'Иван Иванов',
        clientPhones: ['+79001234567'],
      };

      const results = await billingEngine.processAccount(account);

      expect(results[0].amount).toBe(500);
      expect(results[0].success).toBe(true);
    });

    it('не должен списывать если месяц еще не прошел', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 15); // 15 дней назад

      const account: AccountBillingInfo = {
        id: '1',
        accountNumber: 'ACC001',
        balance: 1000,
        tariffPrice: 500,
        billingType: 'PREPAID_MONTHLY',
        status: 'ACTIVE',
        blockThreshold: 0,
        notificationDays: 3,
        lastChargeDate: recentDate,
        clientId: 'client1',
        clientName: 'Иван Иванов',
        clientPhones: ['+79001234567'],
      };

      const results = await billingEngine.processAccount(account);

      // Не должно быть списаний
      expect(results.filter(r => r.action === 'charge')).toHaveLength(0);
    });
  });
});