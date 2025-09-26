// Сервис для работы с шаблонами уведомлений
import { PrismaClient } from '@prisma/client';
import { NotificationType, NotificationChannel, ProcessedTemplate } from '../types';

export class TemplateService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Получение шаблона уведомления
   */
  async getTemplate(type: NotificationType, channel: NotificationChannel): Promise<string | null> {
    try {
      const template = await this.prisma.notificationTemplate.findUnique({
        where: {
          type_channel: {
            type,
            channel,
          },
        },
      });

      return template?.isActive ? template.template : null;
    } catch (error) {
      console.error('❌ Ошибка получения шаблона:', error);
      return null;
    }
  }

  /**
   * Обработка шаблона с подстановкой переменных
   */
  processTemplate(template: string, variables: Record<string, any>): ProcessedTemplate {
    let processedMessage = template;
    const usedVariables: Record<string, any> = {};

    // Заменяем плейсхолдеры вида {{variable}} на значения
    processedMessage = processedMessage.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
      if (variables.hasOwnProperty(variableName)) {
        usedVariables[variableName] = variables[variableName];
        return String(variables[variableName]);
      }
      return match; // Оставляем плейсхолдер если переменная не найдена
    });

    return {
      message: processedMessage,
      variables: usedVariables,
    };
  }

  /**
   * Создание или обновление шаблона
   */
  async upsertTemplate(
    type: NotificationType,
    channel: NotificationChannel,
    template: string,
    isActive: boolean = true
  ): Promise<void> {
    try {
      await this.prisma.notificationTemplate.upsert({
        where: {
          type_channel: {
            type,
            channel,
          },
        },
        update: {
          template,
          isActive,
        },
        create: {
          type,
          channel,
          template,
          isActive,
        },
      });

      console.log(`✅ Шаблон ${type}/${channel} обновлен`);
    } catch (error) {
      console.error('❌ Ошибка сохранения шаблона:', error);
      throw error;
    }
  }

  /**
   * Получение всех шаблонов
   */
  async getAllTemplates(): Promise<any[]> {
    try {
      return await this.prisma.notificationTemplate.findMany({
        orderBy: [
          { type: 'asc' },
          { channel: 'asc' },
        ],
      });
    } catch (error) {
      console.error('❌ Ошибка получения шаблонов:', error);
      throw error;
    }
  }

  /**
   * Удаление шаблона
   */
  async deleteTemplate(type: NotificationType, channel: NotificationChannel): Promise<void> {
    try {
      await this.prisma.notificationTemplate.delete({
        where: {
          type_channel: {
            type,
            channel,
          },
        },
      });

      console.log(`✅ Шаблон ${type}/${channel} удален`);
    } catch (error) {
      console.error('❌ Ошибка удаления шаблона:', error);
      throw error;
    }
  }

  /**
   * Инициализация базовых шаблонов
   */
  async initializeDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      // Telegram шаблоны
      {
        type: NotificationType.WELCOME,
        channel: NotificationChannel.TELEGRAM,
        template: `🎉 <b>Добро пожаловать в OK-Telecom!</b>

Здравствуйте, {{firstName}} {{lastName}}!

Ваш лицевой счет: <code>{{accountNumber}}</code>
Тариф: <b>{{tariffName}}</b>
Текущий баланс: <b>{{balance}} ₽</b>

Спасибо за выбор наших услуг! 🚀`,
      },
      {
        type: NotificationType.PAYMENT,
        channel: NotificationChannel.TELEGRAM,
        template: `💰 <b>Платеж зачислен</b>

Лицевой счет: <code>{{accountNumber}}</code>
Сумма: <b>+{{amount}} ₽</b>
Баланс: <b>{{balance}} ₽</b>

Спасибо за оплату! ✅`,
      },
      {
        type: NotificationType.LOW_BALANCE,
        channel: NotificationChannel.TELEGRAM,
        template: `⚠️ <b>Низкий баланс</b>

Лицевой счет: <code>{{accountNumber}}</code>
Текущий баланс: <b>{{balance}} ₽</b>

Пожалуйста, пополните счет для продолжения пользования услугами.`,
      },
      {
        type: NotificationType.BLOCKED,
        channel: NotificationChannel.TELEGRAM,
        template: `🚫 <b>Услуги заблокированы</b>

Лицевой счет: <code>{{accountNumber}}</code>
Причина: недостаточно средств на счете

Для разблокировки пополните баланс.`,
      },
      {
        type: NotificationType.UNBLOCKED,
        channel: NotificationChannel.TELEGRAM,
        template: `✅ <b>Услуги разблокированы</b>

Лицевой счет: <code>{{accountNumber}}</code>
Баланс: <b>{{balance}} ₽</b>

Добро пожаловать обратно! 🎉`,
      },

      // SMS шаблоны
      {
        type: NotificationType.WELCOME,
        channel: NotificationChannel.SMS,
        template: `OK-Telecom: Добро пожаловать! Л/С: {{accountNumber}}, Тариф: {{tariffName}}, Баланс: {{balance}} руб.`,
      },
      {
        type: NotificationType.PAYMENT,
        channel: NotificationChannel.SMS,
        template: `OK-Telecom: Платеж +{{amount}} руб. зачислен. Л/С: {{accountNumber}}, Баланс: {{balance}} руб.`,
      },
      {
        type: NotificationType.LOW_BALANCE,
        channel: NotificationChannel.SMS,
        template: `OK-Telecom: Низкий баланс {{balance}} руб. Л/С: {{accountNumber}}. Пополните счет.`,
      },
      {
        type: NotificationType.BLOCKED,
        channel: NotificationChannel.SMS,
        template: `OK-Telecom: Услуги заблокированы. Л/С: {{accountNumber}}. Пополните баланс для разблокировки.`,
      },
      {
        type: NotificationType.UNBLOCKED,
        channel: NotificationChannel.SMS,
        template: `OK-Telecom: Услуги разблокированы. Л/С: {{accountNumber}}, Баланс: {{balance}} руб.`,
      },
    ];

    try {
      for (const template of defaultTemplates) {
        await this.upsertTemplate(
          template.type,
          template.channel,
          template.template
        );
      }

      console.log('✅ Базовые шаблоны уведомлений инициализированы');
    } catch (error) {
      console.error('❌ Ошибка инициализации шаблонов:', error);
      throw error;
    }
  }

  /**
   * Валидация шаблона
   */
  validateTemplate(template: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Проверяем на наличие незакрытых плейсхолдеров
    const openBraces = (template.match(/\{\{/g) || []).length;
    const closeBraces = (template.match(/\}\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push('Несоответствие открывающих и закрывающих скобок в плейсхолдерах');
    }

    // Проверяем на пустые плейсхолдеры
    if (template.includes('{{}}')) {
      errors.push('Найдены пустые плейсхолдеры');
    }

    // Проверяем длину сообщения для SMS (ограничение 160 символов без учета плейсхолдеров)
    const messageWithoutPlaceholders = template.replace(/\{\{\w+\}\}/g, '');
    if (messageWithoutPlaceholders.length > 160) {
      errors.push('Шаблон SMS слишком длинный (более 160 символов без учета переменных)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}