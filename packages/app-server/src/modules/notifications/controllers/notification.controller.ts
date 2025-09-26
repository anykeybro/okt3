// Контроллер для API уведомлений
import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { TemplateService } from '../services/template.service';
import { NotificationType, NotificationChannel } from '../types';

export class NotificationController {
  constructor(
    private notificationService: NotificationService,
    private templateService: TemplateService
  ) {}

  /**
   * Отправка уведомления
   */
  sendNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { clientId, type, variables } = req.body;

      if (!clientId || !type) {
        res.status(400).json({
          error: 'Обязательные поля: clientId, type',
        });
        return;
      }

      if (!Object.values(NotificationType).includes(type)) {
        res.status(400).json({
          error: 'Недопустимый тип уведомления',
          allowedTypes: Object.values(NotificationType),
        });
        return;
      }

      const result = await this.notificationService.sendNotification({
        clientId,
        type,
        variables: variables || {},
      });

      res.json({
        success: result.success,
        channel: result.channel,
        messageId: result.messageId,
        error: result.error,
      });
    } catch (error) {
      console.error('❌ Ошибка отправки уведомления:', error);
      res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  /**
   * Массовая отправка уведомлений
   */
  sendBulkNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const { notifications } = req.body;

      if (!Array.isArray(notifications) || notifications.length === 0) {
        res.status(400).json({
          error: 'Поле notifications должно быть непустым массивом',
        });
        return;
      }

      // Валидация каждого уведомления
      for (const notification of notifications) {
        if (!notification.clientId || !notification.type) {
          res.status(400).json({
            error: 'Каждое уведомление должно содержать clientId и type',
          });
          return;
        }

        if (!Object.values(NotificationType).includes(notification.type)) {
          res.status(400).json({
            error: `Недопустимый тип уведомления: ${notification.type}`,
            allowedTypes: Object.values(NotificationType),
          });
          return;
        }
      }

      const results = await this.notificationService.sendBulkNotifications(notifications);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      res.json({
        total: results.length,
        success: successCount,
        failed: failureCount,
        results,
      });
    } catch (error) {
      console.error('❌ Ошибка массовой отправки уведомлений:', error);
      res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  /**
   * Получение журнала уведомлений
   */
  getNotificationHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        clientId,
        type,
        channel,
        limit = '100',
        offset = '0',
      } = req.query;

      const parsedLimit = Math.min(parseInt(limit as string, 10) || 100, 1000);
      const parsedOffset = parseInt(offset as string, 10) || 0;

      const history = await this.notificationService.getNotificationHistory(
        clientId as string,
        type as NotificationType,
        channel as NotificationChannel,
        parsedLimit,
        parsedOffset
      );

      res.json({
        notifications: history,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          total: history.length,
        },
      });
    } catch (error) {
      console.error('❌ Ошибка получения журнала уведомлений:', error);
      res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  /**
   * Статистика уведомлений
   */
  getNotificationStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { dateFrom, dateTo } = req.query;

      const parsedDateFrom = dateFrom ? new Date(dateFrom as string) : undefined;
      const parsedDateTo = dateTo ? new Date(dateTo as string) : undefined;

      const stats = await this.notificationService.getNotificationStats(
        parsedDateFrom,
        parsedDateTo
      );

      res.json(stats);
    } catch (error) {
      console.error('❌ Ошибка получения статистики уведомлений:', error);
      res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  /**
   * Получение всех шаблонов
   */
  getTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const templates = await this.templateService.getAllTemplates();
      res.json({ templates });
    } catch (error) {
      console.error('❌ Ошибка получения шаблонов:', error);
      res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  /**
   * Создание или обновление шаблона
   */
  upsertTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, channel, template, isActive = true } = req.body;

      if (!type || !channel || !template) {
        res.status(400).json({
          error: 'Обязательные поля: type, channel, template',
        });
        return;
      }

      if (!Object.values(NotificationType).includes(type)) {
        res.status(400).json({
          error: 'Недопустимый тип уведомления',
          allowedTypes: Object.values(NotificationType),
        });
        return;
      }

      if (!Object.values(NotificationChannel).includes(channel)) {
        res.status(400).json({
          error: 'Недопустимый канал уведомления',
          allowedChannels: Object.values(NotificationChannel),
        });
        return;
      }

      // Валидация шаблона
      const validation = this.templateService.validateTemplate(template);
      if (!validation.isValid) {
        res.status(400).json({
          error: 'Ошибки в шаблоне',
          details: validation.errors,
        });
        return;
      }

      await this.templateService.upsertTemplate(type, channel, template, isActive);

      res.json({
        success: true,
        message: 'Шаблон успешно сохранен',
      });
    } catch (error) {
      console.error('❌ Ошибка сохранения шаблона:', error);
      res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  /**
   * Удаление шаблона
   */
  deleteTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, channel } = req.params;

      if (!Object.values(NotificationType).includes(type as NotificationType)) {
        res.status(400).json({
          error: 'Недопустимый тип уведомления',
          allowedTypes: Object.values(NotificationType),
        });
        return;
      }

      if (!Object.values(NotificationChannel).includes(channel as NotificationChannel)) {
        res.status(400).json({
          error: 'Недопустимый канал уведомления',
          allowedChannels: Object.values(NotificationChannel),
        });
        return;
      }

      await this.templateService.deleteTemplate(
        type as NotificationType,
        channel as NotificationChannel
      );

      res.json({
        success: true,
        message: 'Шаблон успешно удален',
      });
    } catch (error) {
      console.error('❌ Ошибка удаления шаблона:', error);
      res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  /**
   * Проверка статуса сервисов
   */
  getServicesStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = await this.notificationService.checkServicesStatus();
      
      res.json({
        services: status,
        overall: status.telegram || status.sms ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Ошибка проверки статуса сервисов:', error);
      res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };

  /**
   * Тестовая отправка уведомления
   */
  testNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { clientId, type, channel, message } = req.body;

      if (!clientId || !type || !channel || !message) {
        res.status(400).json({
          error: 'Обязательные поля: clientId, type, channel, message',
        });
        return;
      }

      // Получаем данные клиента
      const client = await this.notificationService['prisma'].client.findUnique({
        where: { id: clientId },
      });

      if (!client) {
        res.status(404).json({
          error: 'Клиент не найден',
        });
        return;
      }

      let result;
      
      if (channel === NotificationChannel.TELEGRAM && client.telegramId) {
        result = await this.notificationService['telegramService'].sendMessage(
          client.telegramId,
          message
        );
      } else if (channel === NotificationChannel.SMS && client.phones?.length > 0) {
        result = await this.notificationService['smsService'].sendSMS(
          client.phones[0],
          message
        );
      } else {
        res.status(400).json({
          error: 'У клиента нет данных для выбранного канала уведомлений',
        });
        return;
      }

      res.json({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      });
    } catch (error) {
      console.error('❌ Ошибка тестовой отправки:', error);
      res.status(500).json({
        error: 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  };
}