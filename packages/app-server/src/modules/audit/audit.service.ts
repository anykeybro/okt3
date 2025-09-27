import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

export interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  /**
   * Записать действие в журнал аудита
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          oldValues: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          newValues: entry.newValues ? JSON.stringify(entry.newValues) : null,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Ошибка записи в журнал аудита:', error);
      // Не прерываем выполнение основной операции из-за ошибки аудита
    }
  }

  /**
   * Получить журнал аудита с фильтрацией
   */
  async getAuditLog(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      action,
      resource,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;

    const where: any = {};

    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (resource) where.resource = { contains: resource, mode: 'insensitive' };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map(log => ({
        ...log,
        oldValues: log.oldValues ? JSON.parse(log.oldValues) : null,
        newValues: log.newValues ? JSON.parse(log.newValues) : null,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Получить статистику аудита
   */
  async getAuditStats(period: 'day' | 'week' | 'month' = 'day') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const [
      totalActions,
      actionsByType,
      actionsByUser,
      actionsByResource,
    ] = await Promise.all([
      // Общее количество действий
      prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),

      // Действия по типам
      prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: {
          action: true,
        },
        orderBy: {
          _count: {
            action: 'desc',
          },
        },
      }),

      // Действия по пользователям
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: {
          userId: true,
        },
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: 10,
      }),

      // Действия по ресурсам
      prisma.auditLog.groupBy({
        by: ['resource'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: {
          resource: true,
        },
        orderBy: {
          _count: {
            resource: 'desc',
          },
        },
      }),
    ]);

    // Получаем информацию о пользователях
    const userIds = actionsByUser.map(item => item.userId);
    const users = await prisma.systemUser.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });

    const usersMap = new Map(users.map(user => [user.id, user.username]));

    return {
      totalActions,
      actionsByType: actionsByType.map(item => ({
        action: item.action,
        count: item._count.action,
      })),
      actionsByUser: actionsByUser.map(item => ({
        userId: item.userId,
        username: usersMap.get(item.userId) || 'Неизвестный',
        count: item._count.userId,
      })),
      actionsByResource: actionsByResource.map(item => ({
        resource: item.resource,
        count: item._count.resource,
      })),
      period,
      startDate,
      endDate: now,
    };
  }

  /**
   * Очистить старые записи аудита
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`Удалено ${result.count} старых записей аудита`);
    return result.count;
  }
}

/**
 * Типы действий для аудита
 */
export const AuditActions = {
  // Аутентификация
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  PASSWORD_CHANGED: 'password_changed',

  // Пользователи
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_ACTIVATED: 'user_activated',
  USER_DEACTIVATED: 'user_deactivated',

  // Клиенты
  CLIENT_CREATED: 'client_created',
  CLIENT_UPDATED: 'client_updated',
  CLIENT_DELETED: 'client_deleted',

  // Лицевые счета
  ACCOUNT_CREATED: 'account_created',
  ACCOUNT_UPDATED: 'account_updated',
  ACCOUNT_BLOCKED: 'account_blocked',
  ACCOUNT_UNBLOCKED: 'account_unblocked',
  ACCOUNT_DELETED: 'account_deleted',

  // Тарифы
  TARIFF_CREATED: 'tariff_created',
  TARIFF_UPDATED: 'tariff_updated',
  TARIFF_DELETED: 'tariff_deleted',

  // Платежи
  PAYMENT_CREATED: 'payment_created',
  PAYMENT_PROCESSED: 'payment_processed',
  PAYMENT_CANCELLED: 'payment_cancelled',

  // Устройства
  DEVICE_CREATED: 'device_created',
  DEVICE_UPDATED: 'device_updated',
  DEVICE_DELETED: 'device_deleted',

  // Заявки
  REQUEST_CREATED: 'request_created',
  REQUEST_UPDATED: 'request_updated',
  REQUEST_ASSIGNED: 'request_assigned',
  REQUEST_COMPLETED: 'request_completed',

  // Настройки
  SETTINGS_UPDATED: 'settings_updated',
  TEMPLATE_UPDATED: 'template_updated',

  // Системные действия
  SYSTEM_BACKUP: 'system_backup',
  SYSTEM_RESTORE: 'system_restore',
  SYSTEM_MAINTENANCE: 'system_maintenance',
} as const;

/**
 * Ресурсы для аудита
 */
export const AuditResources = {
  USER: 'user',
  CLIENT: 'client',
  ACCOUNT: 'account',
  TARIFF: 'tariff',
  PAYMENT: 'payment',
  DEVICE: 'device',
  REQUEST: 'request',
  NOTIFICATION: 'notification',
  TEMPLATE: 'template',
  SYSTEM: 'system',
} as const;

// Синглтон экземпляр
export const auditService = new AuditService();