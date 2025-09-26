// Тесты для DashboardController
import { Request, Response } from 'express';
import { DashboardController } from '../dashboard.controller';
import { DashboardService } from '../dashboard.service';

// Мокаем DashboardService
const mockDashboardService = {
  getDashboardStats: jest.fn(),
  getPaymentStats: jest.fn(),
  getClientStats: jest.fn(),
  getRequestStats: jest.fn(),
  getTariffStats: jest.fn(),
  getDeviceStats: jest.fn(),
  getRecentActivity: jest.fn(),
  getTopClients: jest.fn(),
  getLowBalanceClients: jest.fn(),
  getChartData: jest.fn(),
  clearCache: jest.fn(),
} as unknown as jest.Mocked<DashboardService>;

describe('DashboardController', () => {
  let dashboardController: DashboardController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    dashboardController = new DashboardController(mockDashboardService);
    
    mockRequest = {
      query: {},
      params: {}
    };
    
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getStats', () => {
    it('должен возвращать статистику dashboard', async () => {
      const mockStats = {
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

      mockDashboardService.getDashboardStats.mockResolvedValue(mockStats);

      await dashboardController.getStats(mockRequest as Request, mockResponse as Response);

      expect(mockDashboardService.getDashboardStats).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });

    it('должен обрабатывать ошибки', async () => {
      const error = new Error('Database error');
      mockDashboardService.getDashboardStats.mockRejectedValue(error);

      await dashboardController.getStats(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    });
  });

  describe('getPaymentStats', () => {
    it('должен возвращать статистику платежей с фильтрами', async () => {
      const mockStats = [
        { date: '2024-01-01', amount: 5000, count: 10 },
        { date: '2024-01-02', amount: 3000, count: 6 }
      ];

      mockRequest.query = {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-02',
        period: 'custom'
      };

      mockDashboardService.getPaymentStats.mockResolvedValue(mockStats);

      await dashboardController.getPaymentStats(mockRequest as Request, mockResponse as Response);

      expect(mockDashboardService.getPaymentStats).toHaveBeenCalledWith({
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-02'),
        period: 'custom'
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });
  });

  describe('getRecentActivity', () => {
    it('должен возвращать последнюю активность с лимитом по умолчанию', async () => {
      const mockActivity = [
        {
          id: '1',
          type: 'payment' as const,
          description: 'Платеж от Иван Иванов',
          amount: 1000,
          clientName: 'Иван Иванов',
          timestamp: new Date()
        }
      ];

      mockDashboardService.getRecentActivity.mockResolvedValue(mockActivity);

      await dashboardController.getRecentActivity(mockRequest as Request, mockResponse as Response);

      expect(mockDashboardService.getRecentActivity).toHaveBeenCalledWith(10);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockActivity
      });
    });

    it('должен использовать переданный лимит', async () => {
      mockRequest.query = { limit: '5' };

      const mockActivity: any[] = [];
      mockDashboardService.getRecentActivity.mockResolvedValue(mockActivity);

      await dashboardController.getRecentActivity(mockRequest as Request, mockResponse as Response);

      expect(mockDashboardService.getRecentActivity).toHaveBeenCalledWith(5);
    });

    it('должен валидировать лимит', async () => {
      mockRequest.query = { limit: '100' };

      await dashboardController.getRecentActivity(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Параметр limit должен быть от 1 до 50'
      });
    });
  });

  describe('getChartData', () => {
    it('должен возвращать данные для графика платежей', async () => {
      mockRequest.params = { type: 'payments' };
      mockRequest.query = { period: 'month' };

      const mockChartData = {
        labels: ['2024-01-01', '2024-01-02'],
        datasets: [
          {
            label: 'Сумма платежей',
            data: [5000, 3000],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2
          }
        ]
      };

      mockDashboardService.getChartData.mockResolvedValue(mockChartData);

      await dashboardController.getChartData(mockRequest as Request, mockResponse as Response);

      expect(mockDashboardService.getChartData).toHaveBeenCalledWith('payments', {
        period: 'month'
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockChartData
      });
    });

    it('должен валидировать тип графика', async () => {
      mockRequest.params = { type: 'invalid-type' };

      await dashboardController.getChartData(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Неподдерживаемый тип графика. Доступные: payments, clients, requests'
      });
    });
  });

  describe('clearCache', () => {
    it('должен очищать кеш', async () => {
      mockDashboardService.clearCache.mockResolvedValue();

      await dashboardController.clearCache(mockRequest as Request, mockResponse as Response);

      expect(mockDashboardService.clearCache).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Кеш успешно очищен'
      });
    });
  });

  describe('getCacheInfo', () => {
    it('должен возвращать информацию о кеше', async () => {
      const mockCacheStats = {
        size: 5,
        keys: ['key1', 'key2'],
        memoryUsage: '1.2 KB'
      };

      // Мокаем доступ к cacheService через приватное свойство
      (dashboardController as any).dashboardService.cacheService = {
        getStats: jest.fn().mockReturnValue(mockCacheStats)
      };

      await dashboardController.getCacheInfo(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          ...mockCacheStats,
          description: 'Статистика кеширования dashboard'
        }
      });
    });
  });
});