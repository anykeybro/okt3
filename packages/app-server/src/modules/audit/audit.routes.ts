import { Router } from 'express';
import { auditController, auditValidators } from './audit.controller';
import { authMiddleware, requirePermission } from '../auth/middleware';

const router = Router();

// Все маршруты аудита требуют аутентификации
router.use(authMiddleware);

/**
 * @route GET /api/audit/logs
 * @desc Получить журнал аудита
 * @access Требует права audit:read
 */
router.get(
  '/logs',
  requirePermission('audit', 'read'),
  auditValidators.getAuditLog,
  auditController.getAuditLog
);

/**
 * @route GET /api/audit/stats
 * @desc Получить статистику аудита
 * @access Требует права audit:read
 */
router.get(
  '/stats',
  requirePermission('audit', 'read'),
  auditValidators.getAuditStats,
  auditController.getAuditStats
);

/**
 * @route POST /api/audit/cleanup
 * @desc Очистить старые записи аудита
 * @access Требует права audit:delete
 */
router.post(
  '/cleanup',
  requirePermission('audit', 'delete'),
  auditValidators.cleanupOldLogs,
  auditController.cleanupOldLogs
);

export { router as auditRoutes };