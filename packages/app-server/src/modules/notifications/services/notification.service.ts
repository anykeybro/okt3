// Основной сервис уведомлений
import { PrismaClient } from '@prisma/client';
import { SMSService } from './sms.service';
import { TelegramService } from './telegram.service';
import { TemplateService } from './template.service';
import { TelegramBotService } from '../../telegram/services/telegram-bot.service';
import { 
  NotificationData, 
  NotificationResult, 
  NotificationType, 
  NotificationChannel, 
  NotificationStatus 
} from '../types';
import { config } from '../../../config/config';

export class NotificationService {
  private smsService: SMSService;
  private telegramService: TelegramService;
  private telegramBotService: TelegramBotService;
  private templateService: TemplateService;

  constructor(private prisma: PrismaClient) {
    this.smsService = new SMSService();
    this.telegramService = new TelegramService();
    this.telegramBotService = new TelegramBotService();
    this.templateService = new TemplateService(prisma);
  }

  /**
   * Отправка уведомления с приоритетом (Telegram -> SMS)
   */
  async sendNotification(data: NotificationData): Promise<NotificationResult> {
    try {
      // Получаем данные клиента
      const client = await this.prisma.client.findUnique({
        where: { id: data.clientId },
        include: {
          accounts: {
            include: {
              tariff: true,
            },
          },
        },
      });

      if (!client) {
        throw new Error(`Клиент с ID ${data.clientId} не найден`);
      }

      // Подготавливаем переменные для шаблона
      const templateVariables = this.prepareTemplateVariables(client, data.variables);

      // Пытаемся отправить через Telegram бота (приоритет 1)
      if (client.telegramId) {
        // Сначала пробуем отправить через бота (более интерактивно)
        const botResult = await this.sendTelegramBotNotification(
          data.clientId,
          templateVariables
        );

        if (botResult) {
          // Сохраняем в журнал
          await this.saveNotificationLog(
            data.clientId,
            data.type,
            NotificationChannel.TELEGRAM,
            'bot_notification',
            NotificationStatus.SENT
          );

          return {
            success: true,
            channel: NotificationChannel.TELEGRAM,
            messageId: 'bot_notification'
          };
        }

        // Если бот недоступен, используем обычный Telegram API
        const telegramResult = await this.sendTelegramNotification(
          client.telegramId,
          data.type,
          templateVariables
        );

        if (telegramResult.success) {
          // Сохраняем в журнал
          await this.saveNotificationLog(
            data.clientId,
            data.type,
            NotificationChannel.TELEGRAM,
            telegramResult.messageId || '',
            NotificationStatus.SENT
          );

          return telegramResult;
        }
      }

      // Если Telegram недоступен, отправляем SMS (приоритет 2)
      if (client.phones && client.phones.length > 0) {
        const smsResult = await this.sendSMSNotification(
          client.phones[0], // Берем первый номер телефона
          data.type,
          templateVariables
        );

        // Сохраняем в журнал
        await this.saveNotificationLog(
          data.clientId,
          data.type,
          NotificationChannel.SMS,
          smsResult.messageId || '',
          smsResult.success ? NotificationStatus.SENT : NotificationStatus.FAILED
        );

        return smsResult;
      }

      // Если нет ни Telegram, ни телефона
      throw new Error('У клиента нет доступных каналов для уведомлений');

    } catch (error) {
      console.error('❌ Ошибка отправки уведомления:', error);
      
      // Сохраняем ошибку в журнал
      await this.saveNotificationLog(
        data.clientId,
        data.type,
        NotificationChannel.TELEGRAM, // По умолчанию
        '',
        NotificationStatus.FAILED,
        error instanceof Error ? error.message : 'Неизвестная ошибка'
      );

      return {
        success: false,
        channel: NotificationChannel.TELEGRAM,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      };
    }
  }

  /**
   * Отправка уведомления через Telegram бота
   */
  private async sendTelegramBotNotification(
    clientId: string,
    variables: Record<string, any>
  ): Promise<boolean> {
    try {
      // Формируем сообщение для бота
      const message = this.formatBotNotificationMessage(variables);
      
      // Отправляем через бота
      return await this.telegramBotService.sendNotification(clientId, message);
    } catch (error) {
      console.error('❌ Ошибка отправки уведомления через бота:', error);
      return false;
    }
  }

  /**
   * Форматирование сообщения для бота
   */
  private formatBotNotificationMessage(variables: Record<string, any>): string {
    const { firstName, lastName, balance, tariffName, accountNumber } = variables;
    
    return `
🔔 <b>Уведомление OK-Telecom</b>

👤 <b>Абонент:</b> ${firstName} ${lastName}
🏷️ <b>Лицевой счет:</b> ${accountNumber}
💰 <b>Баланс:</b> ${balance} ₽
📊 <b>Тариф:</b> ${tariffName}

${variables.message || 'Проверьте состояние вашего счета в личном кабинете.'}
    `.trim();
  }

  /**
   * Отправка Telegram уведомления
   */
  private async sendTelegramNotification(
    telegramId: string,
    type: NotificationType,
    variables: Record<string, any>
  ): Promise<NotificationResult> {
    try {
      // Получаем шаблон
      const template = await this.templateService.getTemplate(type, NotificationChannel.TELEGRAM);
      if (!template) {
        throw new Error(`Шаблон Telegram для типа ${type} не найден`);
      }

      // Обрабатываем шаблон
      const processed = this.templateService.processTemplate(template, variables);
      
      // Отправляем сообщение
      const result = await this.telegramService.sendMessage(telegramId, processed.message);

      return {
        success: result.success,
        channel: NotificationChannel.TELEGRAM,
        messageId: result.messageId?.toString(),
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        channel: NotificationChannel.TELEGRAM,
        error: error instanceof Error ? error.message : 'Ошибка Telegram',
      };
    }
  }

  /**
   * Отправка SMS уведомления
   */
  private async sendSMSNotification(
    phone: string,
    type: NotificationType,
    variables: Record<string, any>
  ): Promise<NotificationResult> {
    try {
      // Получаем шаблон
      const template = await this.templateService.getTemplate(type, NotificationChannel.SMS);
      if (!template) {
        throw new Error(`Шаблон SMS для типа ${type} не найден`);
      }

      // Обрабатываем шаблон
      const processed = this.templateService.processTemplate(template, variables);
      
      // Отправляем SMS
      const result = await this.smsService.sendSMS(phone, processed.message);

      return {
        success: result.success,
        channel: NotificationChannel.SMS,
        messageId: result.messageId,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        channel: NotificationChannel.SMS,
        error: error instanceof Error ? error.message : 'Ошибка SMS',
      };
    }
  }

  /**
   * Подготовка переменных для шаблона
   */
  private prepareTemplateVariables(client: any, additionalVariables?: Record<string, any>): Record<string, any> {
    const account = client.accounts?.[0]; // Берем первый лицевой счет
    
    const baseVariables = {
      firstName: client.firstName,
      lastName: client.lastName,
      middleName: client.middleName || '',
      fullName: `${client.firstName} ${client.lastName}`,
      phone: client.phones?.[0] || '',
      email: client.email || '',
      accountNumber: account?.accountNumber || '',
      balance: account?.balance || 0,
      tariffName: account?.tariff?.name || '',
      tariffPrice: account?.tariff?.price || 0,
      currentDate: new Date().toLocaleDateString('ru-RU'),
      currentTime: new Date().toLocaleTimeString('ru-RU'),
    };

    return { ...baseVariables, ...additionalVariables };
  }

  /**
   * Сохранение записи в журнал уведомлений
   */
  private async saveNotificationLog(
    clientId: string,
    type: NotificationType,
    channel: NotificationChannel,
    externalId: string,
    status: NotificationStatus,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          clientId,
          type,
          channel,
          message: errorMessage || `Уведомление ${type} отправлено через ${channel}`,
          status,
          externalId: externalId || undefined,
          sentAt: status === NotificationStatus.SENT ? new Date() : undefined,
        },
      });
    } catch (error) {
      console.error('❌ Ошибка сохранения в журнал уведомлений:', error);
    }
  }

  /**
   * Массовая отправка уведомлений
   */
  async sendBulkNotifications(notifications: NotificationData[]): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    
    for (const notification of notifications) {
      try {
        const result = await this.sendNotification(notification);
        results.push(result);
        
        // Небольшая задержка между отправками для избежания rate limiting
        await new Promise(resolve => setTimeout(resolve, config.notifications.retryDelay / 10));
      } catch (error) {
        results.push({
          success: false,
          channel: NotificationChannel.TELEGRAM,
          error: error instanceof Error ? error.message : 'Ошибка массовой отправки',
        });
      }
    }

    return results;
  }

  /**
   * Получение журнала уведомлений
   */
  async getNotificationHistory(
    clientId?: string,
    type?: NotificationType,
    channel?: NotificationChannel,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const where: any = {};
      
      if (clientId) where.clientId = clientId;
      if (type) where.type = type;
      if (channel) where.channel = channel;

      return await this.prisma.notification.findMany({
        where,
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
              phones: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      console.error('❌ Ошибка получения журнала уведомлений:', error);
      throw error;
    }
  }

  /**
   * Статистика уведомлений
   */
  async getNotificationStats(dateFrom?: Date, dateTo?: Date): Promise<any> {
    try {
      const where: any = {};
      
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      const [total, byStatus, byChannel, byType] = await Promise.all([
        // Общее количество
        this.prisma.notification.count({ where }),
        
        // По статусам
        this.prisma.notification.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),
        
        // По каналам
        this.prisma.notification.groupBy({
          by: ['channel'],
          where,
          _count: { channel: true },
        }),
        
        // По типам
        this.prisma.notification.groupBy({
          by: ['type'],
          where,
          _count: { type: true },
        }),
      ]);

      return {
        total,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>),
        byChannel: byChannel.reduce((acc, item) => {
          acc[item.channel] = item._count.channel;
          return acc;
        }, {} as Record<string, number>),
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count.type;
          return acc;
        }, {} as Record<string, number>),
      };
    } catch (error) {
      console.error('❌ Ошибка получения статистики уведомлений:', error);
      throw error;
    }
  }

  /**
   * Проверка статуса внешних сервисов
   */
  async checkServicesStatus(): Promise<{ telegram: boolean; sms: boolean }> {
    const [telegramStatus, smsStatus] = await Promise.all([
      this.telegramService.checkBotStatus(),
      this.smsService.checkStatus(),
    ]);

    return {
      telegram: telegramStatus,
      sms: smsStatus,
    };
  }

  /**
   * Инициализация сервиса
   */
  async initialize(): Promise<void> {
    try {
      // Инициализируем базовые шаблоны
      await this.templateService.initializeDefaultTemplates();
      
      // Проверяем статус сервисов
      const status = await this.checkServicesStatus();
      console.log('📱 Статус сервисов уведомлений:', status);
      
      console.log('✅ Сервис уведомлений инициализирован');
    } catch (error) {
      console.error('❌ Ошибка инициализации сервиса уведомлений:', error);
      throw error;
    }
  }
}