// Маршруты для биллинга
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { BillingController } from './billing-controller';
import { authenticateToken, requirePermission } from '../auth/middleware';

export function createBillingRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const billingController = new BillingController(prisma);

  // Все маршруты требуют аутентификации
  router.use(authenticateToken);

  // Получение статистики биллинга (доступно всем авторизованным)
  router.get('/stats', billingController.getBillingStats);

  // Получение информации о следующем списании для аккаунта
  router.get('/next-charge/:accountId', billingController.getNextChargeInfo);

  // Получение аккаунтов с низким балансом
  router.get('/low-balance', billingController.getLowBalanceAccounts);

  // Получение статуса планировщика
  router.get('/scheduler/status', billingController.getSchedulerStatus);

  // Получение истории ошибок биллинга
  router.get('/errors', billingController.getBillingErrors);

  // Административные функции (только для суперадминов)
  router.post('/run', requirePermission('billing', 'create'), billingController.runManualBilling);
  router.post('/test', requirePermission('billing', 'create'), billingController.testBilling);
  router.post('/scheduler/start', requirePermission('billing', 'create'), billingController.startScheduler);
  router.post('/scheduler/stop', requirePermission('billing', 'create'), billingController.stopScheduler);

  // Webhook для обработки пополнения баланса (без аутентификации)
  router.post('/balance-topup', billingController.handleBalanceTopUp);

  return router;
}