// Контроллер для эндпоинтов мониторинга
import { Request, Response } from 'express';
import MonitoringService from './monitoring.service';
import { healthChecker } from '../../common/health';
import { metricsCollector } from '../../common/metrics';
import { mainLogger } from '../../common/logger';

export class MonitoringController {
  constructor(private monitoringService: MonitoringService) {}

  // Получение всех метрик
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.monitoringService.getAllMetrics();
      res.json(metrics);
    } catch (error) {
      req.logger.error('Ошибка получения метрик', error as Error);
      res.status(500).json({
        error: 'Ошибка получения метрик',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.requestId,
      });
    }
  }

  // Получение системных метрик
  async getSystemMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await metricsCollector.getSystemMetrics();
      res.json(metrics);
    } catch (error) {
      req.logger.error('Ошибка получения системных метрик', error as Error);
      res.status(500).json({
        error: 'Ошибка получения системных метрик',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.requestId,
      });
    }
  }

  // Получение бизнес-метрик
  async getBusinessMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.monitoringService.getBusinessMetrics();
      res.json(metrics);
    } catch (error) {
      req.logger.error('Ошибка получения бизнес-метрик', error as Error);
      res.status(500).json({
        error: 'Ошибка получения бизнес-метрик',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.requestId,
      });
    }
  }

  // Получение метрик производительности
  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = metricsCollector.getPerformanceMetrics();
      res.json(metrics);
    } catch (error) {
      req.logger.error('Ошибка получения метрик производительности', error as Error);
      res.status(500).json({
        error: 'Ошибка получения метрик производительности',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.requestId,
      });
    }
  }

  // Health check с полной информацией
  async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const includeMetrics = req.query.metrics === 'true';
      const healthStatus = await healthChecker.getHealthStatus(includeMetrics);
      
      const statusCode = healthStatus.status === 'healthy' ? 200 :
                        healthStatus.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(healthStatus);
    } catch (error) {
      req.logger.error('Ошибка health check', error as Error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.requestId,
      });
    }
  }

  // Получение алертов
  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const alerts = await this.monitoringService.getAlerts();
      res.json({
        alerts,
        count: alerts.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      req.logger.error('Ошибка получения алертов', error as Error);
      res.status(500).json({
        error: 'Ошибка получения алертов',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.requestId,
      });
    }
  }

  // Принудительная отправка метрик в Zabbix
  async sendMetricsToZabbix(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.monitoringService.getAllMetrics();
      await this.monitoringService.sendToZabbix(metrics);
      
      req.logger.info('Метрики принудительно отправлены в Zabbix');
      
      res.json({
        message: 'Метрики успешно отправлены в Zabbix',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    } catch (error) {
      req.logger.error('Ошибка отправки метрик в Zabbix', error as Error);
      res.status(500).json({
        error: 'Ошибка отправки метрик в Zabbix',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.requestId,
      });
    }
  }

  // Получение логов (последние записи)
  async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const level = req.query.level as string || 'info';
      const limit = parseInt(req.query.limit as string) || 100;
      
      // Здесь будет чтение логов из файла
      // Пока возвращаем заглушку
      const logs = [
        {
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Application started',
          module: 'app',
        },
        {
          timestamp: new Date().toISOString(),
          level: 'error',
          message: 'Database connection failed',
          module: 'database',
        },
      ];

      res.json({
        logs: logs.slice(0, limit),
        level,
        limit,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      req.logger.error('Ошибка получения логов', error as Error);
      res.status(500).json({
        error: 'Ошибка получения логов',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.requestId,
      });
    }
  }

  // Получение статистики по API эндпоинтам
  async getApiStats(req: Request, res: Response): Promise<void> {
    try {
      // Здесь будет статистика по эндпоинтам
      // Пока возвращаем заглушку
      const stats = {
        totalRequests: 1000,
        successfulRequests: 950,
        failedRequests: 50,
        averageResponseTime: 150,
        slowestEndpoint: '/api/dashboard/analytics',
        fastestEndpoint: '/api/health',
        mostUsedEndpoint: '/api/clients',
        timestamp: new Date().toISOString(),
      };

      res.json(stats);
    } catch (error) {
      req.logger.error('Ошибка получения статистики API', error as Error);
      res.status(500).json({
        error: 'Ошибка получения статистики API',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId: req.requestId,
      });
    }
  }
}

export default MonitoringController;