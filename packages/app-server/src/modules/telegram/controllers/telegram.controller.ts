// Контроллер для обработки Telegram webhook'ов
import { Request, Response } from 'express';
import { TelegramBotService } from '../services/telegram-bot.service';
import { TelegramUpdate } from '../types';

export class TelegramController {
  private telegramBotService: TelegramBotService;

  constructor() {
    this.telegramBotService = new TelegramBotService();
  }

  /**
   * Обработка webhook от Telegram
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const update: TelegramUpdate = req.body;
      
      console.log('📨 Получено обновление от Telegram:', JSON.stringify(update, null, 2));

      // Обрабатываем обновление асинхронно
      this.telegramBotService.processUpdate(update).catch(error => {
        console.error('❌ Ошибка обработки Telegram обновления:', error);
      });

      // Отвечаем Telegram сразу
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('❌ Ошибка в Telegram webhook:', error);
      res.status(500).json({ 
        ok: false, 
        error: 'Внутренняя ошибка сервера' 
      });
    }
  }

  /**
   * Установка webhook
   */
  async setWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { webhookUrl } = req.body;

      if (!webhookUrl) {
        res.status(400).json({
          success: false,
          error: 'Не указан URL webhook'
        });
        return;
      }

      // Используем TelegramService для установки webhook
      const telegramService = new (await import('../../notifications/services/telegram.service')).TelegramService();
      const success = await telegramService.setWebhook(webhookUrl);

      if (success) {
        res.json({
          success: true,
          message: 'Webhook успешно установлен'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Не удалось установить webhook'
        });
      }
    } catch (error) {
      console.error('❌ Ошибка установки webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Удаление webhook
   */
  async deleteWebhook(req: Request, res: Response): Promise<void> {
    try {
      const telegramService = new (await import('../../notifications/services/telegram.service')).TelegramService();
      const success = await telegramService.deleteWebhook();

      if (success) {
        res.json({
          success: true,
          message: 'Webhook успешно удален'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Не удалось удалить webhook'
        });
      }
    } catch (error) {
      console.error('❌ Ошибка удаления webhook:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Получение информации о боте
   */
  async getBotInfo(req: Request, res: Response): Promise<void> {
    try {
      const telegramService = new (await import('../../notifications/services/telegram.service')).TelegramService();
      const botInfo = await telegramService.getBotInfo();

      res.json({
        success: true,
        data: botInfo
      });
    } catch (error) {
      console.error('❌ Ошибка получения информации о боте:', error);
      res.status(500).json({
        success: false,
        error: 'Не удалось получить информацию о боте'
      });
    }
  }

  /**
   * Проверка статуса бота
   */
  async checkBotStatus(req: Request, res: Response): Promise<void> {
    try {
      const telegramService = new (await import('../../notifications/services/telegram.service')).TelegramService();
      const isOnline = await telegramService.checkBotStatus();

      res.json({
        success: true,
        data: {
          online: isOnline,
          status: isOnline ? 'Бот онлайн' : 'Бот недоступен'
        }
      });
    } catch (error) {
      console.error('❌ Ошибка проверки статуса бота:', error);
      res.status(500).json({
        success: false,
        error: 'Не удалось проверить статус бота'
      });
    }
  }

  /**
   * Отправка тестового сообщения
   */
  async sendTestMessage(req: Request, res: Response): Promise<void> {
    try {
      const { chatId, message } = req.body;

      if (!chatId || !message) {
        res.status(400).json({
          success: false,
          error: 'Не указаны chatId или message'
        });
        return;
      }

      const telegramService = new (await import('../../notifications/services/telegram.service')).TelegramService();
      const result = await telegramService.sendMessage(chatId, message);

      if (result.success) {
        res.json({
          success: true,
          message: 'Сообщение отправлено',
          messageId: result.messageId
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Не удалось отправить сообщение'
        });
      }
    } catch (error) {
      console.error('❌ Ошибка отправки тестового сообщения:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  }

  /**
   * Очистка сессий пользователей
   */
  async cleanupSessions(req: Request, res: Response): Promise<void> {
    try {
      this.telegramBotService.cleanupOldSessions();
      
      res.json({
        success: true,
        message: 'Старые сессии очищены'
      });
    } catch (error) {
      console.error('❌ Ошибка очистки сессий:', error);
      res.status(500).json({
        success: false,
        error: 'Не удалось очистить сессии'
      });
    }
  }
}