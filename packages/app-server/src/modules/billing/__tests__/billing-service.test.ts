// Тесты для биллингового сервиса
import { PrismaClient } from '@prisma/client';
import { BillingService } from '../billing-service';

// Мокаем Prisma
const mockPrisma = {
  account: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  payment: {
    findMany: jest.fn(),
  },
} as unknown as PrismaClient;

// Мокаем BillingEngine
jest.mock('../billing-engine', () => ({
  BillingEngine: jest.fn().mockImplementation(() => ({
    processBilling: jest.fn().mockResolvedValue({
      totalProcessed: 5,
      successfulCharges: 4,
      failedCharges: 1,
      blockedAccounts: 0,
      notificationsSent: 2,
      totalAmount: 2000,
    }),
    unblockAccount: jest.fn().mockResolvedValue({
      accountId: '1',
      success: true,
      action: 'unblock',
    }),
  })),
}));

// Мокаем BillingScheduler
jest.mock('../billing-scheduler', () => ({
  BillingScheduler: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    getStatus: jest.fn().mockReturnValue({
      isRunning: true,
      nextRun: new Date(),
    }),
    getLastStats: jest.fn().mockResolvedValue({
      timestamp: new Date(),
      stats: { totalProcessed: 5 },
    }),
    getErrorHistory: jest.fn().mockResolvedValue([]),
  })),
}));

describe('BillingService', () => {
  let billingService: BillingService;

  beforeEach(() => {
    jest.clearAllMocks();
    billingService = new BillingService(mockPrisma);
  });

  describe('runManualBilling', () => {
    it('должен запустить ручной биллинг', async () => {
      const stats = await billingService.runManualBilling();

      expect(stats.totalProcessed).toBe(5);
      expect(stats.successfulCharges).toBe(4);
      expect(stats.totalAmount).toBe(2000);
    });
  });

  describe('handleBalanceTopUp', () => {
    it('должен разблокировать заблокированный аккаунт', async () => {
      const mockAccount = {
        id: '1',
        status: 'BLOCKED',
      };

      (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      const result = await billingService.handleBalanceTopUp('1');

      expect(result).toBeTruthy();
      expect(result?.success).toBe(true);
      expect(result?.action).toBe('unblock');
    });

    it('должен вернуть null для активного аккаунта', async () => {
      const mockAccount = {
        id: '1',
        status: 'ACTIVE',
      };

      (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      const result = await billingService.handleBalanceTopUp('1');

      expect(result).toBeNull();
    });

    it('должен выбросить ошибку для несуществующего аккаунта', async () => {
      (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(billingService.handleBalanceTopUp('nonexistent')).rejects.toThrow(
        'Аккаунт не найден'
      );
    });
  });

  describe('getNextChargeInfo', () => {
    it('должен рассчитать следующее списание для предоплатного тарифа', async () => {
      const lastCharge = new Date();
      lastCharge.setDate(lastCharge.getDate() - 15); // 15 дней назад

      const mockAccount = {
        id: '1',
        tariff: {
          price: 500,
          billingType: 'PREPAID_MONTHLY',
        },
        payments: [
          {
            createdAt: lastCharge,
          },
        ],
      };

      (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      const chargeInfo = await billingService.getNextChargeInfo('1');

      expect(chargeInfo.nextChargeAmount).toBe(500);
      expect(chargeInfo.daysUntilCharge).toBeGreaterThan(10);
      expect(chargeInfo.nextChargeDate).toBeTruthy();
    });

    it('должен обработать аккаунт без предыдущих списаний', async () => {
      const mockAccount = {
        id: '1',
        tariff: {
          price: 500,
          billingType: 'PREPAID_MONTHLY',
        },
        payments: [],
      };

      (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      const chargeInfo = await billingService.getNextChargeInfo('1');

      expect(chargeInfo.nextChargeAmount).toBe(500);
      expect(chargeInfo.daysUntilCharge).toBe(0); // Должно списать сейчас
    });

    it('должен обработать почасовой тариф', async () => {
      const mockAccount = {
        id: '1',
        tariff: {
          price: 720, // 720 руб/месяц
          billingType: 'HOURLY',
        },
        payments: [],
      };

      (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      const chargeInfo = await billingService.getNextChargeInfo('1');

      expect(chargeInfo.nextChargeAmount).toBe(720);
      expect(chargeInfo.nextChargeDate).toBeNull(); // Для почасовой тарификации
      expect(chargeInfo.daysUntilCharge).toBeNull();
    });
  });

  describe('getBillingStatistics', () => {
    it('должен получить статистику биллинга', async () => {
      const mockPayments = [
        { amount: -500 },
        { amount: -300 },
        { amount: -200 },
      ];

      const mockAccounts = [
        { balance: 1000 },
        { balance: 500 },
        { balance: 200 },
      ];

      (mockPrisma.payment.findMany as jest.Mock).mockResolvedValue(mockPayments);
      (mockPrisma.account.count as jest.Mock).mockResolvedValue(2); // 2 заблокированных
      (mockPrisma.account.findMany as jest.Mock).mockResolvedValue(mockAccounts);

      const stats = await billingService.getBillingStatistics(30);

      expect(stats.totalCharges).toBe(3);
      expect(stats.totalAmount).toBe(1000); // Сумма абсолютных значений
      expect(stats.blockedAccounts).toBe(2);
      expect(stats.averageBalance).toBe(566.67); // (1000+500+200)/3 округлено
    });
  });

  describe('checkLowBalanceAccounts', () => {
    it('должен найти аккаунты с низким балансом', async () => {
      const mockAccounts = [
        {
          id: '1',
          accountNumber: 'ACC001',
          balance: 50, // Меньше стоимости тарифа
          blockThreshold: 0,
          client: {
            firstName: 'Иван',
            lastName: 'Иванов',
          },
          tariff: {
            price: 500,
          },
        },
        {
          id: '2',
          accountNumber: 'ACC002',
          balance: 1000, // Достаточно средств
          blockThreshold: 0,
          client: {
            firstName: 'Петр',
            lastName: 'Петров',
          },
          tariff: {
            price: 500,
          },
        },
      ];

      (mockPrisma.account.findMany as jest.Mock).mockResolvedValue(mockAccounts);

      const lowBalanceAccounts = await billingService.checkLowBalanceAccounts();

      expect(lowBalanceAccounts).toHaveLength(1);
      expect(lowBalanceAccounts[0].accountNumber).toBe('ACC001');
      expect(lowBalanceAccounts[0].balance).toBe(50);
      expect(lowBalanceAccounts[0].threshold).toBe(500);
    });

    it('должен учитывать порог блокировки', async () => {
      const mockAccounts = [
        {
          id: '1',
          accountNumber: 'ACC001',
          balance: 400, // Больше стоимости тарифа, но меньше порога блокировки
          blockThreshold: 600,
          client: {
            firstName: 'Иван',
            lastName: 'Иванов',
          },
          tariff: {
            price: 300,
          },
        },
      ];

      (mockPrisma.account.findMany as jest.Mock).mockResolvedValue(mockAccounts);

      const lowBalanceAccounts = await billingService.checkLowBalanceAccounts();

      expect(lowBalanceAccounts).toHaveLength(1);
      expect(lowBalanceAccounts[0].threshold).toBe(600); // Максимум из цены тарифа и порога
    });
  });

  describe('scheduler methods', () => {
    it('должен запустить планировщик', () => {
      billingService.startScheduler();
      // Проверяем что метод вызывается без ошибок
      expect(true).toBe(true);
    });

    it('должен остановить планировщик', () => {
      billingService.stopScheduler();
      // Проверяем что метод вызывается без ошибок
      expect(true).toBe(true);
    });

    it('должен получить статус планировщика', () => {
      const status = billingService.getSchedulerStatus();
      expect(status.isRunning).toBe(true);
      expect(status.nextRun).toBeTruthy();
    });
  });
});