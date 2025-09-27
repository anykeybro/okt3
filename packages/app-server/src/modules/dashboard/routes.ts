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

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Получить основные метрики dashboard
 *     description: Возвращает основную статистику системы для отображения на главной странице
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Успешно получены метрики
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardStats'
 *       401:
 *         description: Не авторизован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Недостаточно прав
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/stats', 
  requirePermission('dashboard', 'read'),
  dashboardController.getStats
);

/**
 * @swagger
 * /api/dashboard/stats/payments:
 *   get:
 *     summary: Получить статистику платежей
 *     description: Возвращает детальную статистику по платежам
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Успешно получена статистика платежей
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 todayPayments:
 *                   type: number
 *                   description: Количество платежей за сегодня
 *                 todayAmount:
 *                   type: number
 *                   description: Сумма платежей за сегодня
 *                 monthPayments:
 *                   type: number
 *                   description: Количество платежей за месяц
 *                 monthAmount:
 *                   type: number
 *                   description: Сумма платежей за месяц
 *                 averagePayment:
 *                   type: number
 *                   description: Средний размер платежа
 *       401:
 *         description: Не авторизован
 *       403:
 *         description: Недостаточно прав
 */
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