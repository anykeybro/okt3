import { Request, Response } from 'express';
import { auditService } from './audit.service';
import { validate } from '../../common/middleware/validation.middleware';
import { validatePagination, validateDateRange } from '../../common/validators/common.validators';
import { query } from 'express-validator';

export class AuditController {
  /**
   * Получить журнал аудита
   */
  async getAuditLog(req: Request, res: Response) {
    const {
      userId,
      action,
      resource,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const result = await auditService.getAuditLog({
      userId: userId as string,
      action: action as string,
      resource: resource as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({
      success: true,
      data: result,
    });
  }

  /**
   * Получить статистику аудита
   */
  async getAuditStats(req: Request, res: Response) {
    const { period = 'day' } = req.query;

    const stats = await auditService.getAuditStats(period as 'day' | 'week' | 'month');

    res.json({
      success: true,
      data: stats,
    });
  }

  /**
   * Очистить старые записи аудита
   */
  async cleanupOldLogs(req: Request, res: Response) {
    const { retentionDays = 90 } = req.body;

    const deletedCount = await auditService.cleanupOldLogs(retentionDays);

    res.json({
      success: true,
      data: {
        deletedCount,
        message: `Удалено ${deletedCount} старых записей аудита`,
      },
    });
  }
}

// Валидаторы для аудита
export const auditValidators = {
  getAuditLog: validate([
    ...validatePagination,
    ...validateDateRange,
    query('userId')
      .optional()
      .isMongoId()
      .withMessage('Некорректный формат ID пользователя'),
    query('action')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Действие должно быть строкой от 1 до 100 символов'),
    query('resource')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Ресурс должен быть строкой от 1 до 100 символов'),
  ]),

  getAuditStats: validate([
    query('period')
      .optional()
      .isIn(['day', 'week', 'month'])
      .withMessage('Период должен быть day, week или month'),
  ]),

  cleanupOldLogs: validate([
    query('retentionDays')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Период хранения должен быть от 1 до 365 дней')
      .toInt(),
  ]),
};

export const auditController = new AuditController();