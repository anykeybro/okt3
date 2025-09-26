// Контроллер для dashboard API
import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { ValidationError, NotFoundError } from '../../common/errors';
import { ApiResponse } from '../../common/types';
import { DashboardFilters } from './types';

export class DashboardController {
  private dashboardService: DashboardService;

  constructor(dashboardService: DashboardService) {
    this.dashboardService = dashboardService;
  }

  // Получение основных метрик dashboard
  getStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.dashboardService.getDashboardStats();
      
      const response: ApiResponse = {
        success: true,
        data: stats
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение статистики платежей
  getPaymentStats = async (req: Request, res: Response) => {
    try {
      const filters = this.parseFilters(req.query);
      const stats = await this.dashboardService.getPaymentStats(filters);
      
      const response: ApiResponse = {
        success: true,
        data: stats
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение статистики клиентов
  getClientStats = async (req: Request, res: Response) => {
    try {
      const filters = this.parseFilters(req.query);
      const stats = await this.dashboardService.getClientStats(filters);
      
      const response: ApiResponse = {
        success: true,
        data: stats
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение статистики заявок
  getRequestStats = async (req: Request, res: Response) => {
    try {
      const filters = this.parseFilters(req.query);
      const stats = await this.dashboardService.getRequestStats(filters);
      
      const response: ApiResponse = {
        success: true,
        data: stats
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение статистики по тарифам
  getTariffStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.dashboardService.getTariffStats();
      
      const response: ApiResponse = {
        success: true,
        data: stats
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение статистики по устройствам
  getDeviceStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.dashboardService.getDeviceStats();
      
      const response: ApiResponse = {
        success: true,
        data: stats
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение последней активности
  getRecentActivity = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      
      if (limit < 1 || limit > 50) {
        const response: ApiResponse = {
          success: false,
          error: 'Параметр limit должен быть от 1 до 50'
        };
        return res.status(400).json(response);
      }

      const activity = await this.dashboardService.getRecentActivity(limit);
      
      const response: ApiResponse = {
        success: true,
        data: activity
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение топ клиентов
  getTopClients = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      
      if (limit < 1 || limit > 50) {
        const response: ApiResponse = {
          success: false,
          error: 'Параметр limit должен быть от 1 до 50'
        };
        return res.status(400).json(response);
      }

      const topClients = await this.dashboardService.getTopClients(limit);
      
      const response: ApiResponse = {
        success: true,
        data: topClients
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение клиентов с низким балансом
  getLowBalanceClients = async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      
      if (limit < 1 || limit > 50) {
        const response: ApiResponse = {
          success: false,
          error: 'Параметр limit должен быть от 1 до 50'
        };
        return res.status(400).json(response);
      }

      const lowBalanceClients = await this.dashboardService.getLowBalanceClients(limit);
      
      const response: ApiResponse = {
        success: true,
        data: lowBalanceClients
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение данных для графиков
  getChartData = async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      
      if (!['payments', 'clients', 'requests'].includes(type)) {
        const response: ApiResponse = {
          success: false,
          error: 'Неподдерживаемый тип графика. Доступные: payments, clients, requests'
        };
        return res.status(400).json(response);
      }

      const filters = this.parseFilters(req.query);
      const chartData = await this.dashboardService.getChartData(type as any, filters);
      
      const response: ApiResponse = {
        success: true,
        data: chartData
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Очистка кеша
  clearCache = async (req: Request, res: Response) => {
    try {
      await this.dashboardService.clearCache();
      
      const response: ApiResponse = {
        success: true,
        message: 'Кеш успешно очищен'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение информации о кеше
  getCacheInfo = async (req: Request, res: Response) => {
    try {
      // Получаем статистику кеша из сервиса
      const cacheStats = (this.dashboardService as any).cacheService.getStats();
      
      const response: ApiResponse = {
        success: true,
        data: {
          ...cacheStats,
          description: 'Статистика кеширования dashboard'
        }
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Парсинг фильтров из query параметров
  private parseFilters(query: any): DashboardFilters {
    const filters: DashboardFilters = {};

    if (query.dateFrom) {
      const dateFrom = new Date(query.dateFrom as string);
      if (!isNaN(dateFrom.getTime())) {
        filters.dateFrom = dateFrom;
      }
    }

    if (query.dateTo) {
      const dateTo = new Date(query.dateTo as string);
      if (!isNaN(dateTo.getTime())) {
        filters.dateTo = dateTo;
      }
    }

    if (query.period && ['today', 'week', 'month', 'year', 'custom'].includes(query.period)) {
      filters.period = query.period as any;
    }

    return filters;
  }

  // Обработка ошибок
  private handleError(error: any, res: Response) {
    console.error('Ошибка в DashboardController:', error);

    if (error instanceof ValidationError) {
      const response: ApiResponse = {
        success: false,
        error: error.message,
        data: error.errors
      };
      res.status(400).json(response);
    } else if (error instanceof NotFoundError) {
      const response: ApiResponse = {
        success: false,
        error: error.message
      };
      res.status(404).json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: 'Внутренняя ошибка сервера'
      };
      res.status(500).json(response);
    }
  }
}