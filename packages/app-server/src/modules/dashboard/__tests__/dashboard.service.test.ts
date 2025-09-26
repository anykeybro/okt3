// Тесты для DashboardService
import { DashboardService } from '../dashboard.service';
import { CacheService } from '../cache.service';
import { PrismaClient } from '@prisma/client';

// Мокаем Prisma
const mockPrisma = {
  account: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    count: jest.fn(),
  },
  payment: {
    count: jest.fn(),
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  request: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  device: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  notification: {
    count: jest.fn(),
  },
  tariff: {
    findMany: jest.fn(),
  },
} as unknown as PrismaClient;

// Мокаем CacheService
jest.mock('../cache.service');

describe('DashboardService', () => {
  let dashboardService: DashboardService;
  let mockCacheService: jest.Mocked<CacheService>;

  beforeEach(() => {
    jest.clearAllMocks();
    dashboardService = new DashboardService(mockPrisma);
    mockCacheService = (dashboardService as any).cacheService;
  });

  describe('getDashboardStats', () => {
    it('должен возвращать статистику из кеша если она есть', async () => {
      const cachedStats = {
        activeClients: 100,
        blockedClients: 5,
        suspendedClients: 2,
        totalClients: 107,
        todayPayments: 10,
        todayPaymentsAmount: 5000,
        monthlyPayments: 150,
        monthlyPaymentsAmount: 75000,
        totalRevenue: 500000,
        averageBalance: 250,
        newRequests: 3,
        inProgressRequests: 5,
        completedRequestsToday: 2,
        totalRequests: 200,
        onlineDevices: 8,
        offlineDevices: 2,
        errorDevices: 0,
        totalDevices: 10,
        pendingNotifications: 5,
        sentNotificationsToday: 20,
        failedNotificationsToday: 1
      };

      mockCacheService.get.mockResolvedValue(cachedStats);

      const result = await dashboardService.getDashboardStats();

      expect(result).toEqual(cachedStats);
      expect(mockCacheService.get).toHaveBeenCalledWith('dashboard:stats');
    });

    it('должен вычислять статистику если кеш пуст', async () => {
      mockCacheService.get.mockResolvedValue(null);

      // Мокаем ответы Prisma
      (mockPrisma.account.groupBy as jest.Mock).mockResolvedValue([
        { status: 'ACTIVE', _count: 100 },
        { status: 'BLOCKED', _count: 5 },
        { status: 'SUSPENDED', _count: 2 }
      ]);

      (mockPrisma.payment.count as jest.Mock)
        .mockResolvedValueOnce(10) // todayPayments
        .mockResolvedValueOnce(150); // monthlyPayments

      (mockPrisma.payment.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { amount: 5000 } }) // todayPaymentsAmount
        .mockResolvedValueOnce({ _sum: { amount: 75000 } }) // monthlyPaymentsAmount
        .mockResolvedValueOnce({ _sum: { amount: 500000 } }); // totalRevenue

      (mockPrisma.request.count as jest.Mock)
        .mockResolvedValueOnce(3) // newRequests
        .mockResolvedValueOnce(5) // inProgressRequests
        .mockResolvedValueOnce(2) // completedRequestsToday
        .mockResolvedValueOnce(200); // totalRequests

      (mockPrisma.device.groupBy as jest.Mock).mockResolvedValue([
        { status: 'ONLINE', _count: 8 },
        { status: 'OFFLINE', _count: 2 },
        { status: 'ERROR', _count: 0 }
      ]);

      (mockPrisma.notification.count as jest.Mock)
        .mockResolvedValueOnce(5) // pendingNotifications
        .mockResolvedValueOnce(20) // sentNotificationsToday
        .mockResolvedValueOnce(1); // failedNotificationsToday

      (mockPrisma.account.aggregate as jest.Mock).mockResolvedValue({
        _avg: { balance: 250 }
      });

      const result = await dashboardService.getDashboardStats();

      expect(result.activeClients).toBe(100);
      expect(result.blockedClients).toBe(5);
      expect(result.suspendedClients).toBe(2);
      expect(result.totalClients).toBe(107);
      expect(result.todayPayments).toBe(10);
      expect(result.todayPaymentsAmount).toBe(5000);
      expect(result.monthlyPayments).toBe(150);
      expect(result.monthlyPaymentsAmount).toBe(75000);
      expect(result.totalRevenue).toBe(500000);
      expect(result.averageBalance).toBe(250);
      expect(result.newRequests).toBe(3);
      expect(result.inProgressRequests).toBe(5);
      expect(result.completedRequestsToday).toBe(2);
      expect(result.totalRequests).toBe(200);
      expect(result.onlineDevices).toBe(8);
      expect(result.offlineDevices).toBe(2);
      expect(result.errorDevices).toBe(0);
      expect(result.totalDevices).toBe(10);
      expect(result.pendingNotifications).toBe(5);
      expect(result.sentNotificationsToday).toBe(20);
      expect(result.failedNotificationsToday).toBe(1);

      expect(mockCacheService.set).toHaveBeenCalledWith('dashboard:stats', result, 300);
    });
  });

  describe('getPaymentStats', () => {
    it('должен возвращать статистику платежей по дням', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const mockPayments = [
        { amount: 1000, createdAt: new Date('2024-01-01T10:00:00Z') },
        { amount: 1500, createdAt: new Date('2024-01-01T15:00:00Z') },
        { amount: 2000, createdAt: new Date('2024-01-02T12:00:00Z') }
      ];

      (mockPrisma.payment.findMany as jest.Mock).mockResolvedValue(mockPayments);

      const filters = {
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-02')
      };

      const result = await dashboardService.getPaymentStats(filters);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2024-01-01',
        amount: 2500,
        count: 2
      });
      expect(result[1]).toEqual({
        date: '2024-01-02',
        amount: 2000,
        count: 1
      });
    });
  });

  describe('getRecentActivity', () => {
    it('должен возвращать последнюю активность', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const mockPayments = [
        {
          id: 'payment1',
          amount: 1000,
          createdAt: new Date('2024-01-01T12:00:00Z'),
          account: {
            client: {
              firstName: 'Иван',
              lastName: 'Иванов'
            }
          }
        }
      ];

      const mockRequests = [
        {
          id: 'request1',
          firstName: 'Петр',
          lastName: 'Петров',
          createdAt: new Date('2024-01-01T11:00:00Z'),
          client: null
        }
      ];

      (mockPrisma.payment.findMany as jest.Mock).mockResolvedValue(mockPayments);
      (mockPrisma.request.findMany as jest.Mock).mockResolvedValue(mockRequests);

      const result = await dashboardService.getRecentActivity(5);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('payment');
      expect(result[0].description).toBe('Платеж от Иван Иванов');
      expect(result[0].amount).toBe(1000);
      expect(result[1].type).toBe('request');
      expect(result[1].description).toBe('Новая заявка от Петр Петров');
    });
  });

  describe('getTariffStats', () => {
    it('должен возвращать статистику по тарифам', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const mockTariffs = [
        {
          id: 'tariff1',
          name: 'Базовый',
          price: 500,
          accounts: [
            {
              balance: 100,
              payments: [
                { amount: 500 },
                { amount: 300 }
              ]
            },
            {
              balance: 200,
              payments: [
                { amount: 500 }
              ]
            }
          ]
        }
      ];

      (mockPrisma.tariff.findMany as jest.Mock).mockResolvedValue(mockTariffs);

      const result = await dashboardService.getTariffStats();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        tariffId: 'tariff1',
        tariffName: 'Базовый',
        clientsCount: 2,
        revenue: 1300,
        averageBalance: 150
      });
    });
  });

  describe('clearCache', () => {
    it('должен очищать кеш', async () => {
      await dashboardService.clearCache();
      expect(mockCacheService.clear).toHaveBeenCalled();
    });
  });
});