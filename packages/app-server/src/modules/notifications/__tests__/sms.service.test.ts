// Тесты для SMSService
import axios from 'axios';
import { SMSService } from '../services/sms.service';

// Мокаем axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Мокаем конфигурацию
jest.mock('../../../config/config', () => ({
  config: {
    notifications: {
      sms: {
        gatewayIp: '192.168.1.1',
        port: 80,
        username: 'admin',
        password: 'admin',
      },
    },
  },
}));

describe('SMSService', () => {
  let smsService: SMSService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    smsService = new SMSService();
    jest.clearAllMocks();
  });

  describe('formatPhoneNumber', () => {
    it('должен форматировать номер с 8', () => {
      const result = smsService['formatPhoneNumber']('89123456789');
      expect(result).toBe('+79123456789');
    });

    it('должен форматировать номер с 7', () => {
      const result = smsService['formatPhoneNumber']('79123456789');
      expect(result).toBe('+79123456789');
    });

    it('должен форматировать номер без кода страны', () => {
      const result = smsService['formatPhoneNumber']('9123456789');
      expect(result).toBe('+79123456789');
    });

    it('должен обрабатывать номер с символами', () => {
      const result = smsService['formatPhoneNumber']('+7 (912) 345-67-89');
      expect(result).toBe('+79123456789');
    });
  });

  describe('parseXMLResponse', () => {
    it('должен парсить простой XML', () => {
      const xml = '<response><status>OK</status><code>200</code></response>';
      const result = smsService['parseXMLResponse'](xml);
      expect(result).toEqual({ status: 'OK', code: '200' });
    });

    it('должен возвращать значение для одного элемента', () => {
      const xml = '<status>OK</status>';
      const result = smsService['parseXMLResponse'](xml);
      expect(result).toBe('OK');
    });

    it('должен возвращать исходную строку если нет XML', () => {
      const text = 'OK';
      const result = smsService['parseXMLResponse'](text);
      expect(result).toBe('OK');
    });
  });

  describe('buildXMLRequest', () => {
    it('должен строить XML из объекта', () => {
      const data = { username: 'admin', password: 'test' };
      const result = smsService['buildXMLRequest'](data);
      
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<request>');
      expect(result).toContain('<username>admin</username>');
      expect(result).toContain('<password>test</password>');
      expect(result).toContain('</request>');
    });

    it('должен обрабатывать вложенные объекты', () => {
      const data = { 
        phones: { 
          phone: '+79123456789' 
        } 
      };
      const result = smsService['buildXMLRequest'](data);
      
      expect(result).toContain('<phones><phone>+79123456789</phone></phones>');
    });
  });

  describe('checkStatus', () => {
    it('должен возвращать true если шлюз доступен', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });

      const result = await smsService.checkStatus();

      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/monitoring/status');
    });

    it('должен возвращать false если шлюз недоступен', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      const result = await smsService.checkStatus();

      expect(result).toBe(false);
    });
  });

  describe('sendSMS', () => {
    beforeEach(() => {
      // Мокаем успешную авторизацию
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: '<response><SesInfo>session123</SesInfo><TokInfo>token456</TokInfo></response>'
      });
      mockAxiosInstance.post.mockResolvedValueOnce({ status: 200 });
    });

    it('должен отправлять SMS успешно', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ 
        status: 200, 
        data: 'OK' 
      });

      const result = await smsService.sendSMS('89123456789', 'Тестовое сообщение');

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('sms_');
      expect(result.messageId).toContain('+79123456789');
    });

    it('должен обрабатывать ошибки отправки', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('SMS send failed'));

      const result = await smsService.sendSMS('89123456789', 'Тестовое сообщение');

      expect(result.success).toBe(false);
      expect(result.error).toContain('SMS send failed');
    });

    it('должен переавторизовываться при ошибке 125002', async () => {
      // Первая попытка - ошибка авторизации
      mockAxiosInstance.post
        .mockRejectedValueOnce(new Error('125002'))
        .mockResolvedValueOnce({ status: 200 }) // Новая авторизация
        .mockResolvedValueOnce({ status: 200, data: 'OK' }); // Успешная отправка

      // Мокаем повторную авторизацию
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: '<response><SesInfo>session789</SesInfo><TokInfo>token123</TokInfo></response>'
      });

      const result = await smsService.sendSMS('89123456789', 'Тестовое сообщение');

      expect(result.success).toBe(true);
    });
  });

  describe('clearOutbox', () => {
    beforeEach(() => {
      // Мокаем авторизацию
      mockAxiosInstance.get.mockResolvedValue({
        data: '<response><SesInfo>session123</SesInfo><TokInfo>token456</TokInfo></response>'
      });
      mockAxiosInstance.post.mockResolvedValue({ status: 200 });
    });

    it('должен очищать исходящие сообщения', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ status: 200 });

      await expect(smsService.clearOutbox()).resolves.not.toThrow();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/sms/delete-sms',
        expect.stringContaining('<Index>1</Index>'),
        expect.any(Object)
      );
    });

    it('должен обрабатывать ошибки очистки', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(new Error('Clear failed'));

      await expect(smsService.clearOutbox()).resolves.not.toThrow();
    });
  });
});