// Тесты для TelegramService
import axios from 'axios';
import { TelegramService } from '../services/telegram.service';

// Мокаем axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Мокаем конфигурацию
jest.mock('../../../config/config', () => ({
  config: {
    notifications: {
      telegram: {
        botToken: 'test_bot_token',
        apiUrl: 'https://api.telegram.org/bot',
      },
    },
  },
}));

describe('TelegramService', () => {
  let telegramService: TelegramService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    telegramService = new TelegramService();
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('должен отправлять сообщение успешно', async () => {
      const mockResponse = {
        data: {
          ok: true,
          result: {
            message_id: 123,
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await telegramService.sendMessage('12345', 'Тестовое сообщение');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(123);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/sendMessage', {
        chat_id: '12345',
        text: 'Тестовое сообщение',
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });
    });

    it('должен обрабатывать ошибки API', async () => {
      const mockResponse = {
        data: {
          ok: false,
          description: 'Chat not found',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await telegramService.sendMessage('12345', 'Тестовое сообщение');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Chat not found');
    });

    it('должен обрабатывать сетевые ошибки', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Network error'));

      const result = await telegramService.sendMessage('12345', 'Тестовое сообщение');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('должен обрабатывать ошибки Axios с response', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          data: {
            description: 'Bot was blocked by the user',
          },
        },
        message: 'Request failed',
      };

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValue(axiosError);

      const result = await telegramService.sendMessage('12345', 'Тестовое сообщение');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bot was blocked by the user');
    });
  });

  describe('sendMessageWithKeyboard', () => {
    it('должен отправлять сообщение с клавиатурой', async () => {
      const mockResponse = {
        data: {
          ok: true,
          result: {
            message_id: 124,
          },
        },
      };

      const keyboard = [
        [{ text: 'Кнопка 1', callback_data: 'btn1' }],
        [{ text: 'Кнопка 2', url: 'https://example.com' }],
      ];

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await telegramService.sendMessageWithKeyboard(
        '12345',
        'Выберите действие:',
        keyboard
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe(124);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/sendMessage', {
        chat_id: '12345',
        text: 'Выберите действие:',
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    });
  });

  describe('checkBotStatus', () => {
    it('должен возвращать true если бот доступен', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { ok: true },
      });

      const result = await telegramService.checkBotStatus();

      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/getMe');
    });

    it('должен возвращать false если бот недоступен', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      const result = await telegramService.checkBotStatus();

      expect(result).toBe(false);
    });
  });

  describe('setWebhook', () => {
    it('должен устанавливать webhook успешно', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { ok: true },
      });

      const result = await telegramService.setWebhook('https://example.com/webhook');

      expect(result).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/setWebhook', {
        url: 'https://example.com/webhook',
        allowed_updates: ['message', 'callback_query'],
      });
    });

    it('должен обрабатывать ошибки установки webhook', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { 
          ok: false, 
          description: 'Invalid URL' 
        },
      });

      const result = await telegramService.setWebhook('invalid-url');

      expect(result).toBe(false);
    });
  });

  describe('deleteWebhook', () => {
    it('должен удалять webhook успешно', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { ok: true },
      });

      const result = await telegramService.deleteWebhook();

      expect(result).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/deleteWebhook');
    });
  });

  describe('getBotInfo', () => {
    it('должен получать информацию о боте', async () => {
      const botInfo = {
        id: 123456789,
        is_bot: true,
        first_name: 'Test Bot',
        username: 'testbot',
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: {
          ok: true,
          result: botInfo,
        },
      });

      const result = await telegramService.getBotInfo();

      expect(result).toEqual(botInfo);
    });

    it('должен выбрасывать ошибку при неудаче', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          ok: false,
          description: 'Unauthorized',
        },
      });

      await expect(telegramService.getBotInfo()).rejects.toThrow('Unauthorized');
    });
  });

  describe('formatMessage', () => {
    it('должен экранировать HTML символы', () => {
      const message = 'Test <b>bold</b> & "quoted" text';
      const result = telegramService.formatMessage(message);
      
      expect(result).toBe('Test &lt;b&gt;bold&lt;/b&gt; &amp; &quot;quoted&quot; text');
    });
  });

  describe('createInlineKeyboard', () => {
    it('должен создавать inline клавиатуру', () => {
      const buttons = [
        [
          { text: 'Кнопка 1', callback_data: 'btn1' },
          { text: 'Кнопка 2', callback_data: 'btn2' },
        ],
        [
          { text: 'Ссылка', url: 'https://example.com' },
        ],
      ];

      const result = telegramService.createInlineKeyboard(buttons);

      expect(result).toEqual([
        [
          { text: 'Кнопка 1', callback_data: 'btn1' },
          { text: 'Кнопка 2', callback_data: 'btn2' },
        ],
        [
          { text: 'Ссылка', url: 'https://example.com' },
        ],
      ]);
    });
  });
});