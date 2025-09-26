// Маршруты для dashboard API
import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { authMiddleware, requirePermission } from '../auth/middleware';
import prisma from '../../common/database';

const router = Router();

// Инициализация сервиса и контроллера
const dashboardService = new DashboardService(prisma);
const dashboardController = new DashboardController(dashboardService);

// Применяем middleware аутентификации ко всем маршрутам
router.use(authMiddleware);

// Основные метрики dashboard
router.get('/stats', 
  requirePermission('dashboard', 'read'),
  dashboardController.getStats
);

// Статистика платежей
router.get('/stats/payments', 
  requirePermission('dashboard', 'read'),
  dashboardController.getPaymentStats
);

// Статистика клиентов
router.get('/stats/clients', 
  requirePermission('dashboard', 'read'),
  dashboardController.getClientStats
);

// Статистика заявок
router.get('/stats/requests', 
  requirePermission('dashboard', 'read'),
  dashboardController.getRequestStats
);

// Статистика по тарифам
router.get('/stats/tariffs', 
  requirePermission('dashboard', 'read'),
  dashboardController.getTariffStats
);

// Статистика по устройствам
router.get('/stats/devices', 
  requirePermission('dashboard', 'read'),
  dashboardController.getDeviceStats
);

// Последняя активность
router.get('/activity', 
  requirePermission('dashboard', 'read'),
  dashboardController.getRecentActivity
);

// Топ клиенты
router.get('/top-clients', 
  requirePermission('dashboard', 'read'),
  dashboardController.getTopClients
);

// Клиенты с низким балансом
router.get('/low-balance', 
  requirePermission('dashboard', 'read'),
  dashboardController.getLowBalanceClients
);

// Данные для графиков
router.get('/charts/:type', 
  requirePermission('dashboard', 'read'),
  dashboardController.getChartData
);

// Управление кешем (только для суперадминов)
router.delete('/cache', 
  requirePermission('system', 'admin'),
  dashboardController.clearCache
);

router.get('/cache/info', 
  requirePermission('system', 'admin'),
  dashboardController.getCacheInfo
);

export default router;