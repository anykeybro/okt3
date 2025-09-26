// Telegram сервис для отправки уведомлений
import axios, { AxiosInstance } from 'axios';
import { config } from '../../../config/config';
import { TelegramResponse } from '../types';

export class TelegramService {
  private client: AxiosInstance;
  private botToken: string;

  constructor() {
    this.botToken = config.notifications.telegram.botToken;
    this.client = axios.create({
      baseURL: `${config.notifications.telegram.apiUrl}${this.botToken}`,
      timeout: 10000,
    });
  }

  /**
   * Отправка сообщения в Telegram
   */
  async sendMessage(chatId: string, message: string): Promise<TelegramResponse> {
    try {
      const response = await this.client.post('/sendMessage', {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });

      if (response.data.ok) {
        console.log(`✅ Telegram сообщение отправлено в чат ${chatId}`);
        return {
          success: true,
          messageId: response.data.result.message_id,
        };
      } else {
        throw new Error(response.data.description || 'Неизвестная ошибка Telegram API');
      }
    } catch (error) {
      console.error('❌ Ошибка отправки Telegram сообщения:', error);
      
      let errorMessage = 'Неизвестная ошибка';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.description || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Отправка сообщения с клавиатурой
   */
  async sendMessageWithKeyboard(
    chatId: string, 
    message: string, 
    keyboard: any[][]
  ): Promise<TelegramResponse> {
    try {
      const response = await this.client.post('/sendMessage', {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });

      if (response.data.ok) {
        console.log(`✅ Telegram сообщение с клавиатурой отправлено в чат ${chatId}`);
        return {
          success: true,
          messageId: response.data.result.message_id,
        };
      } else {
        throw new Error(response.data.description || 'Неизвестная ошибка Telegram API');
      }
    } catch (error) {
      console.error('❌ Ошибка отправки Telegram сообщения с клавиатурой:', error);
      
      let errorMessage = 'Неизвестная ошибка';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.description || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Проверка статуса бота
   */
  async checkBotStatus(): Promise<boolean> {
    try {
      const response = await this.client.get('/getMe');
      return response.data.ok;
    } catch (error) {
      console.error('❌ Telegram бот недоступен:', error);
      return false;
    }
  }

  /**
   * Установка webhook для бота
   */
  async setWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const response = await this.client.post('/setWebhook', {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
      });

      if (response.data.ok) {
        console.log(`✅ Telegram webhook установлен: ${webhookUrl}`);
        return true;
      } else {
        console.error('❌ Ошибка установки webhook:', response.data.description);
        return false;
      }
    } catch (error) {
      console.error('❌ Ошибка установки Telegram webhook:', error);
      return false;
    }
  }

  /**
   * Удаление webhook
   */
  async deleteWebhook(): Promise<boolean> {
    try {
      const response = await this.client.post('/deleteWebhook');
      
      if (response.data.ok) {
        console.log('✅ Telegram webhook удален');
        return true;
      } else {
        console.error('❌ Ошибка удаления webhook:', response.data.description);
        return false;
      }
    } catch (error) {
      console.error('❌ Ошибка удаления Telegram webhook:', error);
      return false;
    }
  }

  /**
   * Получение информации о боте
   */
  async getBotInfo(): Promise<any> {
    try {
      const response = await this.client.get('/getMe');
      
      if (response.data.ok) {
        return response.data.result;
      } else {
        throw new Error(response.data.description || 'Не удалось получить информацию о боте');
      }
    } catch (error) {
      console.error('❌ Ошибка получения информации о боте:', error);
      throw error;
    }
  }

  /**
   * Форматирование сообщения для Telegram (экранирование HTML)
   */
  formatMessage(message: string): string {
    return message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Создание inline клавиатуры
   */
  createInlineKeyboard(buttons: Array<{ text: string; callback_data?: string; url?: string }>[]): any[][] {
    return buttons.map(row => 
      row.map(button => ({
        text: button.text,
        ...(button.callback_data && { callback_data: button.callback_data }),
        ...(button.url && { url: button.url }),
      }))
    );
  }
}