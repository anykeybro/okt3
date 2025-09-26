// Маршруты для платежной системы
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { authenticateToken } from '../auth/auth.middleware';
import { requirePermission } from '../auth/middleware';

export function createPaymentRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const paymentsService = new PaymentsService(prisma);
  const paymentsController = new PaymentsController(paymentsService);

  // Публичные маршруты (без аутентификации)
  
  /**
   * POST /api/payments/robokassa/webhook
   * Обработка webhook от Robokassa
   */
  router.post('/robokassa/webhook', paymentsController.processRobokassaWebhook);

  // Защищенные маршруты (требуют аутентификации)
  
  /**
   * POST /api/payments/manual
   * Создание ручного платежа (только для кассиров и администраторов)
   */
  router.post('/manual', 
    authenticateToken,
    requirePermission('payments', 'create'),
    paymentsController.createManualPayment
  );

  /**
   * POST /api/payments/robokassa
   * Создание платежа через Robokassa
   */
  router.post('/robokassa',
    authenticateToken,
    requirePermission('payments', 'create'),
    paymentsController.createRobokassaPayment
  );

  /**
   * GET /api/payments/stats
   * Получение статистики платежей (только для администраторов)
   */
  router.get('/stats',
    authenticateToken,
    requirePermission('payments', 'read'),
    paymentsController.getPaymentStats
  );

  /**
   * GET /api/payments/account/:accountId
   * Получение платежей по лицевому счету
   */
  router.get('/account/:accountId',
    authenticateToken,
    requirePermission('payments', 'read'),
    paymentsController.getPaymentsByAccount
  );

  /**
   * GET /api/payments/:id
   * Получение платежа по ID
   */
  router.get('/:id',
    authenticateToken,
    requirePermission('payments', 'read'),
    paymentsController.getPaymentById
  );

  /**
   * GET /api/payments
   * Получение списка платежей с фильтрацией и пагинацией
   */
  router.get('/',
    authenticateToken,
    requirePermission('payments', 'read'),
    paymentsController.getPayments
  );

  return router;
}

// Экспорт для использования в основном приложении
export { PaymentsService, PaymentsController };