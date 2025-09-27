// Маршруты для мониторинга
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import MonitoringService from './monitoring.service';
import MonitoringController from './monitoring.controller';
import { healthCheckHandler, livenessHandler, readinessHandler } from '../../common/health';
import { authMiddleware, requirePermission } from '../auth/middleware';
import { apiRateLimiter, auditLogger } from '../../common/middleware';

export function createMonitoringRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const monitoringService = new MonitoringService(prisma);
  const monitoringController = new MonitoringController(monitoringService);

  // Запускаем периодический мониторинг
  monitoringService.startPeriodicMonitoring();

  // Публичные health check эндпоинты (без аутентификации)
  router.get('/health', healthCheckHandler);
  router.get('/health/live', livenessHandler);
  router.get('/health/ready', readinessHandler);

  // Применяем rate limiting для всех остальных эндпоинтов
  router.use(apiRateLimiter);

  // Защищенные эндпоинты мониторинга (требуют аутентификации)
  router.use(authMiddleware);

  // Получение всех метрик (только для администраторов)
  router.get('/metrics',
    requirePermission('monitoring', 'read'),
    auditLogger('view_metrics', 'monitoring'),
    monitoringController.getMetrics.bind(monitoringController)
  );

  // Получение системных метрик
  router.get('/metrics/system',
    requirePermission('monitoring', 'read'),
    monitoringController.getSystemMetrics.bind(monitoringController)
  );

  // Получение бизнес-метрик
  router.get('/metrics/business',
    requirePermission('monitoring', 'read'),
    monitoringController.getBusinessMetrics.bind(monitoringController)
  );

  // Получение метрик производительности
  router.get('/metrics/performance',
    requirePermission('monitoring', 'read'),
    monitoringController.getPerformanceMetrics.bind(monitoringController)
  );

  // Получение алертов
  router.get('/alerts',
    requirePermission('monitoring', 'read'),
    monitoringController.getAlerts.bind(monitoringController)
  );

  // Принудительная отправка метрик в Zabbix
  router.post('/metrics/send-to-zabbix',
    requirePermission('monitoring', 'write'),
    auditLogger('send_metrics_to_zabbix', 'monitoring'),
    monitoringController.sendMetricsToZabbix.bind(monitoringController)
  );

  // Получение логов
  router.get('/logs',
    requirePermission('monitoring', 'read'),
    monitoringController.getLogs.bind(monitoringController)
  );

  // Получение статистики API
  router.get('/api-stats',
    requirePermission('monitoring', 'read'),
    monitoringController.getApiStats.bind(monitoringController)
  );

  return router;
}

export default createMonitoringRoutes;