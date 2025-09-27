// Тесты для TelegramController
import { Request, Response } from 'express';
import { TelegramController } from '../controllers/telegram.controller';
import { TelegramUpdate } from '../types';

// Мокаем TelegramBotService
jest.mock('../services/telegram-bot.service');
const mockTelegramBotService = {
  processUpdate: jest.fn(),
  cleanupOldSessions: jest.fn(),
};

// Мокаем TelegramService
jest.mock('../../notifications/services/telegram.service');
const mockTelegramService = {
  setWebhook: jest.fn(),
  deleteWebhook: jest.fn(),
  getBotInfo: jest.fn(),
  checkBotStatus: jest.fn(),
  sendMessage: jest.fn(),
};

describe('TelegramController', () => {
  let telegramController: TelegramController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Мокаем конструктор TelegramBotService
    (require('../services/telegram-bot.service').TelegramBotService as jest.Mock)
      .mockImplementation(() => mockTelegramBotService);

    telegramController = new TelegramController();

    mockRequest = {
      body: {},
      params: {},
      query: {}
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('handleWebhook', () => {
    it('должен обработать валидный webhook', async () => {
      const update: TelegramUpdate = {
        update_id: 1,
        message: {
          message_id: 1,
          from: {
            id: 123456789,
            is_bot: false,
            first_name: 'Тест'
          },
          chat: {
            id: 123456789,
            type: 'private'
          },
          date: Date.now(),
          text: '/start'
        }
      };

      mockRequest.body = update;
      mockTelegramBotService.processUpdate.mockResolvedValue(undefined);

      await telegramController.handleWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockTelegramBotService.processUpdate).toHaveBeenCalledWith(update);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ ok: true });
    });

    it('должен обработать ошибку в webhook', async () => {
      // Мокаем ошибку в JSON.stringify или другой синхронной операции
      const originalStringify = JSON.stringify;
      JSON.stringify = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      mockRequest.body = { invalid: 'data' };

      await telegramController.handleWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Внутренняя ошибка сервера'
      });

      // Восстанавливаем оригинальный JSON.stringify
      JSON.stringify = originalStringify;
    });
  });

  describe('setWebhook', () => {
    beforeEach(() => {
      // Мокаем динамический импорт
      jest.doMock('../../notifications/services/telegram.service', () => ({
        TelegramService: jest.fn().mockImplementation(() => mockTelegramService)
      }));
    });

    it('должен установить webhook', async () => {
      mockRequest.body = { webhookUrl: 'https://example.com/webhook' };
      mockTelegramService.setWebhook.mockResolvedValue(true);

      await telegramController.setWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockTelegramService.setWebhook).toHaveBeenCalledWith('https://example.com/webhook');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Webhook успешно установлен'
      });
    });

    it('должен обработать отсутствие URL webhook', async () => {
      mockRequest.body = {};

      await telegramController.setWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Не указан URL webhook'
      });
    });

    it('должен обработать ошибку установки webhook', async () => {
      mockRequest.body = { webhookUrl: 'https://example.com/webhook' };
      mockTelegramService.setWebhook.mockResolvedValue(false);

      await telegramController.setWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Не удалось установить webhook'
      });
    });
  });

  describe('deleteWebhook', () => {
    beforeEach(() => {
      jest.doMock('../../notifications/services/telegram.service', () => ({
        TelegramService: jest.fn().mockImplementation(() => mockTelegramService)
      }));
    });

    it('должен удалить webhook', async () => {
      mockTelegramService.deleteWebhook.mockResolvedValue(true);

      await telegramController.deleteWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockTelegramService.deleteWebhook).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Webhook успешно удален'
      });
    });

    it('должен обработать ошибку удаления webhook', async () => {
      mockTelegramService.deleteWebhook.mockResolvedValue(false);

      await telegramController.deleteWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Не удалось удалить webhook'
      });
    });
  });

  describe('getBotInfo', () => {
    beforeEach(() => {
      jest.doMock('../../notifications/services/telegram.service', () => ({
        TelegramService: jest.fn().mockImplementation(() => mockTelegramService)
      }));
    });

    it('должен получить информацию о боте', async () => {
      const botInfo = {
        id: 123456789,
        is_bot: true,
        first_name: 'TestBot',
        username: 'testbot'
      };

      mockTelegramService.getBotInfo.mockResolvedValue(botInfo);

      await telegramController.getBotInfo(mockRequest as Request, mockResponse as Response);

      expect(mockTelegramService.getBotInfo).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: botInfo
      });
    });

    it('должен обработать ошибку получения информации о боте', async () => {
      mockTelegramService.getBotInfo.mockRejectedValue(new Error('Bot info error'));

      await telegramController.getBotInfo(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Не удалось получить информацию о боте'
      });
    });
  });

  describe('checkBotStatus', () => {
    beforeEach(() => {
      jest.doMock('../../notifications/services/telegram.service', () => ({
        TelegramService: jest.fn().mockImplementation(() => mockTelegramService)
      }));
    });

    it('должен проверить статус бота (онлайн)', async () => {
      mockTelegramService.checkBotStatus.mockResolvedValue(true);

      await telegramController.checkBotStatus(mockRequest as Request, mockResponse as Response);

      expect(mockTelegramService.checkBotStatus).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          online: true,
          status: 'Бот онлайн'
        }
      });
    });

    it('должен проверить статус бота (офлайн)', async () => {
      mockTelegramService.checkBotStatus.mockResolvedValue(false);

      await telegramController.checkBotStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          online: false,
          status: 'Бот недоступен'
        }
      });
    });
  });

  describe('sendTestMessage', () => {
    beforeEach(() => {
      jest.doMock('../../notifications/services/telegram.service', () => ({
        TelegramService: jest.fn().mockImplementation(() => mockTelegramService)
      }));
    });

    it('должен отправить тестовое сообщение', async () => {
      mockRequest.body = {
        chatId: '123456789',
        message: 'Тестовое сообщение'
      };

      mockTelegramService.sendMessage.mockResolvedValue({
        success: true,
        messageId: 123
      });

      await telegramController.sendTestMessage(mockRequest as Request, mockResponse as Response);

      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith('123456789', 'Тестовое сообщение');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Сообщение отправлено',
        messageId: 123
      });
    });

    it('должен обработать отсутствие параметров', async () => {
      mockRequest.body = {};

      await telegramController.sendTestMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Не указаны chatId или message'
      });
    });

    it('должен обработать ошибку отправки сообщения', async () => {
      mockRequest.body = {
        chatId: '123456789',
        message: 'Тестовое сообщение'
      };

      mockTelegramService.sendMessage.mockResolvedValue({
        success: false,
        error: 'Chat not found'
      });

      await telegramController.sendTestMessage(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Chat not found'
      });
    });
  });

  describe('cleanupSessions', () => {
    it('должен очистить сессии', async () => {
      mockTelegramBotService.cleanupOldSessions.mockReturnValue(undefined);

      await telegramController.cleanupSessions(mockRequest as Request, mockResponse as Response);

      expect(mockTelegramBotService.cleanupOldSessions).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Старые сессии очищены'
      });
    });

    it('должен обработать ошибку очистки сессий', async () => {
      mockTelegramBotService.cleanupOldSessions.mockImplementation(() => {
        throw new Error('Cleanup error');
      });

      await telegramController.cleanupSessions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Не удалось очистить сессии'
      });
    });
  });
});