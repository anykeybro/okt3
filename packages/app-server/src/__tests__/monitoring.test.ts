// Тесты для системы мониторинга и логирования
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import { createMonitoringRoutes } from '../modules/monitoring';
import { mainLogger } from '../common/logger';
import { metricsCollector } from '../common/metrics';
import { healthChecker } from '../common/health';

// Мокаем Prisma
const mockPrisma = {
  $runCommandRaw: jest.fn(),
  account: {
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  payment: {
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  request: {
    count: jest.fn(),
  },
  notification: {
    groupBy: jest.fn(),
  },
  device: {
    count: jest.fn(),
  },
  tariff: {
    count: jest.fn(),
    aggregate: jest.fn(),
  },
} as any;

describe('Система мониторинга и логирования', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Мокаем middleware аутентификации
    app.use((req: any, res, next) => {
      req.user = { id: 'test-user', role: { permissions: [{ resource: 'monitoring', actions: ['read', 'write'] }] } };
      req.logger = mainLogger;
      req.requestId = 'test-request-id';
      next();
    });
    
    // Мокаем createMonitoringRoutes чтобы не запускать периодический мониторинг
    const MonitoringService = require('../modules/monitoring/monitoring.service').default;
    const MonitoringController = require('../modules/monitoring/monitoring.controller').default;
    const { Router } = require('express');
    
    const router = Router();
    const monitoringService = new MonitoringService(mockPrisma);
    const monitoringController = new MonitoringController(monitoringService);
    
    // НЕ запускаем периодический мониторинг в тестах
    // monitoringService.startPeriodicMonitoring();
    
    // Добавляем только нужные маршруты для тестов
    router.get('/health', require('../common/health').healthCheckHandler);
    router.get('/health/live', require('../common/health').livenessHandler);
    router.get('/health/ready', require('../common/health').readinessHandler);
    router.get('/metrics', monitoringController.getMetrics.bind(monitoringController));
    router.get('/metrics/system', monitoringController.getSystemMetrics.bind(monitoringController));
    router.get('/metrics/business', monitoringController.getBusinessMetrics.bind(monitoringController));
    router.get('/metrics/performance', monitoringController.getPerformanceMetrics.bind(monitoringController));
    router.get('/alerts', monitoringController.getAlerts.bind(monitoringController));
    router.post('/metrics/send-to-zabbix', monitoringController.sendMetricsToZabbix.bind(monitoringController));
    router.get('/logs', monitoringController.getLogs.bind(monitoringController));
    router.get('/api-stats', monitoringController.getApiStats.bind(monitoringController));
    
    app.use('/api/monitoring', router);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('должен возвращать статус здоровья системы', async () => {
      mockPrisma.$runCommandRaw.mockResolvedValue({ ok: 1 });

      const response = await request(app)
        .get('/api/monitoring/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('services');
      expect(Array.isArray(response.body.services)).toBe(true);
    });

    it('должен возвращать статус unhealthy при ошибке базы данных', async () => {
      mockPrisma.$runCommandRaw.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/monitoring/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
    });

    it('должен включать метрики при запросе', async () => {
      mockPrisma.$runCommandRaw.mockResolvedValue({ ok: 1 });

      const response = await request(app)
        .get('/api/monitoring/health?metrics=true')
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
    });
  });

  describe('Liveness и Readiness Probes', () => {
    it('должен отвечать на liveness probe', async () => {
      const response = await request(app)
        .get('/api/monitoring/health/live')
        .expect(200);

      expect(response.body.status).toBe('alive');
      expect(response.body).toHaveProperty('uptime');
    });

    it('должен отвечать на readiness probe', async () => {
      mockPrisma.$runCommandRaw.mockResolvedValue({ ok: 1 });

      const response = await request(app)
        .get('/api/monitoring/health/ready')
        .expect(200);

      expect(response.body.status).toBe('ready');
    });

    it('должен возвращать not_ready при недоступности базы данных', async () => {
      mockPrisma.$runCommandRaw.mockRejectedValue(new Error('Database not ready'));

      const response = await request(app)
        .get('/api/monitoring/health/ready')
        .expect(503);

      expect(response.body.status).toBe('not_ready');
    });
  });

  describe('Метрики', () => {
    beforeEach(() => {
      // Мокаем данные для бизнес-метрик
      mockPrisma.account.count.mockResolvedValue(100);
      mockPrisma.account.aggregate.mockResolvedValue({ _sum: { amount: 50000 }, _avg: { balance: 500 } });
      mockPrisma.payment.count.mockResolvedValue(25);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 10000 } });
      mockPrisma.request.count.mockResolvedValue(5);
      mockPrisma.notification.groupBy.mockResolvedValue([
        { status: 'sent', _count: 20 },
        { status: 'failed', _count: 2 },
      ]);
      mockPrisma.device.count.mockResolvedValue(10);
      mockPrisma.tariff.count.mockResolvedValue(15);
      mockPrisma.tariff.aggregate.mockResolvedValue({ _avg: { price: 800 } });
    });

    it('должен возвращать все метрики', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('systemMetrics');
      expect(response.body).toHaveProperty('businessMetrics');
      expect(response.body).toHaveProperty('healthStatus');
      expect(response.body).toHaveProperty('customMetrics');
    });

    it('должен возвращать системные метрики', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics/system')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
      expect(response.body.memory).toHaveProperty('used');
      expect(response.body.memory).toHaveProperty('total');
      expect(response.body.memory).toHaveProperty('percentage');
    });

    it('должен возвращать бизнес-метрики', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics/business')
        .expect(200);

      expect(response.body).toHaveProperty('activeClients');
      expect(response.body).toHaveProperty('blockedClients');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('dailyRevenue');
      expect(response.body).toHaveProperty('monthlyRevenue');
      expect(response.body).toHaveProperty('paymentsToday');
      expect(response.body).toHaveProperty('newRequestsToday');
      expect(response.body).toHaveProperty('notificationsSent');
      expect(response.body).toHaveProperty('notificationsFailed');
    });

    it('должен возвращать метрики производительности', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics/performance')
        .expect(200);

      expect(response.body).toHaveProperty('averageResponseTime');
      expect(response.body).toHaveProperty('errorRate');
      expect(response.body).toHaveProperty('throughput');
      expect(response.body).toHaveProperty('slowQueries');
    });
  });

  describe('Алерты', () => {
    it('должен возвращать список алертов', async () => {
      // Мокаем данные для алертов
      mockPrisma.account.count.mockResolvedValue(100);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 10000 } });

      const response = await request(app)
        .get('/api/monitoring/alerts')
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('timestamp');
      expect(Array.isArray(response.body.alerts)).toBe(true);
    });
  });

  describe('Отправка метрик в Zabbix', () => {
    it('должен отправлять метрики в Zabbix', async () => {
      // Мокаем все необходимые данные
      mockPrisma.account.count.mockResolvedValue(100);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 10000 } });

      const response = await request(app)
        .post('/api/monitoring/metrics/send-to-zabbix')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('успешно отправлены');
    });
  });

  describe('Логи', () => {
    it('должен возвращать логи', async () => {
      const response = await request(app)
        .get('/api/monitoring/logs')
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('level');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    it('должен фильтровать логи по уровню', async () => {
      const response = await request(app)
        .get('/api/monitoring/logs?level=error&limit=50')
        .expect(200);

      expect(response.body.level).toBe('error');
      expect(response.body.limit).toBe(50);
    });
  });

  describe('Статистика API', () => {
    it('должен возвращать статистику API', async () => {
      const response = await request(app)
        .get('/api/monitoring/api-stats')
        .expect(200);

      expect(response.body).toHaveProperty('totalRequests');
      expect(response.body).toHaveProperty('successfulRequests');
      expect(response.body).toHaveProperty('failedRequests');
      expect(response.body).toHaveProperty('averageResponseTime');
      expect(response.body).toHaveProperty('mostUsedEndpoint');
    });
  });
});

describe('Logger', () => {
  it('должен создавать структурированные логи', () => {
    const logger = mainLogger.child({ module: 'test' });
    
    // Тестируем что логгер не выбрасывает ошибки
    expect(() => {
      logger.info('Test message', { additional: 'data' });
      logger.error('Test error', new Error('Test error'));
      logger.warn('Test warning');
      logger.debug('Test debug');
    }).not.toThrow();
  });

  it('должен логировать бизнес-события', () => {
    expect(() => {
      mainLogger.logBusinessEvent('user_created', { userId: 'test-123' });
      mainLogger.logAudit('create_user', 'admin-123', 'users', 'user-456');
    }).not.toThrow();
  });
});

describe('MetricsCollector', () => {
  it('должен регистрировать запросы и ошибки', () => {
    expect(() => {
      metricsCollector.recordRequest(150);
      metricsCollector.recordError();
    }).not.toThrow();
  });

  it('должен возвращать метрики производительности', () => {
    const metrics = metricsCollector.getPerformanceMetrics();
    
    expect(metrics).toHaveProperty('timestamp');
    expect(metrics).toHaveProperty('averageResponseTime');
    expect(metrics).toHaveProperty('errorRate');
    expect(metrics).toHaveProperty('throughput');
    expect(typeof metrics.averageResponseTime).toBe('number');
    expect(typeof metrics.errorRate).toBe('number');
  });
});

describe('HealthChecker', () => {
  it('должен проверять состояние системы', async () => {
    const healthStatus = await healthChecker.getHealthStatus(false);
    
    expect(healthStatus).toHaveProperty('status');
    expect(healthStatus).toHaveProperty('timestamp');
    expect(healthStatus).toHaveProperty('uptime');
    expect(healthStatus).toHaveProperty('services');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(healthStatus.status);
  });

  it('должен включать метрики при запросе', async () => {
    const healthStatus = await healthChecker.getHealthStatus(true);
    
    expect(healthStatus).toHaveProperty('metrics');
  });
});