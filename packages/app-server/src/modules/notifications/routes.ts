// Маршруты для API уведомлений
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { NotificationController } from './controllers/notification.controller';
import { NotificationService } from './services/notification.service';
import { TemplateService } from './services/template.service';
import { authMiddleware, requirePermission } from '../auth/middleware';

export function createNotificationRoutes(prisma: PrismaClient): Router {
  const router = Router();
  
  // Инициализация сервисов
  const notificationService = new NotificationService(prisma);
  const templateService = new TemplateService(prisma);
  const controller = new NotificationController(notificationService, templateService);

  // Инициализация сервиса уведомлений
  notificationService.initialize().catch(error => {
    console.error('❌ Ошибка инициализации сервиса уведомлений:', error);
  });

  // Middleware для всех маршрутов
  router.use(authMiddleware);

  // === ОТПРАВКА УВЕДОМЛЕНИЙ ===
  
  /**
   * POST /api/notifications/send
   * Отправка одиночного уведомления
   */
  router.post('/send', 
    requirePermission('notifications', 'create'),
    controller.sendNotification
  );

  /**
   * POST /api/notifications/send-bulk
   * Массовая отправка уведомлений
   */
  router.post('/send-bulk',
    requirePermission('notifications', 'create'),
    controller.sendBulkNotifications
  );

  /**
   * POST /api/notifications/test
   * Тестовая отправка уведомления
   */
  router.post('/test',
    requirePermission('notifications', 'create'),
    controller.testNotification
  );

  // === ЖУРНАЛ УВЕДОМЛЕНИЙ ===

  /**
   * GET /api/notifications/history
   * Получение журнала уведомлений
   */
  router.get('/history',
    requirePermission('notifications', 'read'),
    controller.getNotificationHistory
  );

  /**
   * GET /api/notifications/stats
   * Статистика уведомлений
   */
  router.get('/stats',
    requirePermission('notifications', 'read'),
    controller.getNotificationStats
  );

  // === ШАБЛОНЫ УВЕДОМЛЕНИЙ ===

  /**
   * GET /api/notifications/templates
   * Получение всех шаблонов
   */
  router.get('/templates',
    requirePermission('notifications', 'read'),
    controller.getTemplates
  );

  /**
   * POST /api/notifications/templates
   * Создание или обновление шаблона
   */
  router.post('/templates',
    requirePermission('notifications', 'update'),
    controller.upsertTemplate
  );

  /**
   * DELETE /api/notifications/templates/:type/:channel
   * Удаление шаблона
   */
  router.delete('/templates/:type/:channel',
    requirePermission('notifications', 'delete'),
    controller.deleteTemplate
  );

  // === СТАТУС СЕРВИСОВ ===

  /**
   * GET /api/notifications/status
   * Проверка статуса внешних сервисов
   */
  router.get('/status',
    requirePermission('notifications', 'read'),
    controller.getServicesStatus
  );

  // === WEBHOOK ENDPOINTS ===

  /**
   * POST /api/notifications/webhook/telegram
   * Webhook для Telegram бота
   */
  router.post('/webhook/telegram', async (req, res) => {
    try {
      // Здесь будет обработка webhook'ов от Telegram
      // Пока что просто возвращаем OK
      res.json({ ok: true });
    } catch (error) {
      console.error('❌ Ошибка обработки Telegram webhook:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  });

  return router;
}

export { NotificationService, TemplateService };