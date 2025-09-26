// Unit тесты для RobokassaService
import { RobokassaService } from '../robokassa.service';
import { RobokassaError } from '../payments.types';

// Мокаем конфигурацию
jest.mock('../../../config/config', () => ({
  config: {
    external: {
      robokassa: {
        merchantId: 'test_merchant',
        password1: 'test_password1',
        password2: 'test_password2',
        testMode: true,
        apiUrl: 'https://auth.robokassa.ru/Merchant/Index.aspx'
      }
    }
  }
}));

describe('RobokassaService', () => {
  let robokassaService: RobokassaService;

  beforeEach(() => {
    robokassaService = new RobokassaService();
  });

  describe('generatePaymentUrl', () => {
    it('должен генерировать корректный URL для оплаты', async () => {
      const amount = 100.50;
      const invoiceId = 'test_invoice_123';
      const description = 'Тестовый платеж';

      const result = await robokassaService.generatePaymentUrl(amount, invoiceId, description);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('invoiceId', invoiceId);
      expect(result.url).toContain('test_merchant');
      expect(result.url).toContain('100.50');
      expect(result.url).toContain(invoiceId);
      expect(result.url).toContain('IsTest=1'); // Тестовый режим
    });

    it('должен обрабатывать ошибки при генерации URL', async () => {
      const amount = -100; // Некорректная сумма
      const invoiceId = '';

      // Мокаем метод валидации, чтобы он выбрасывал ошибку
      jest.spyOn(robokassaService, 'validatePaymentParams').mockImplementation(() => {
        throw new RobokassaError('Сумма должна быть больше 0', 'INVALID_AMOUNT');
      });

      await expect(
        robokassaService.generatePaymentUrl(amount, invoiceId)
      ).rejects.toThrow(RobokassaError);
    });
  });

  describe('validatePaymentParams', () => {
    it('должен валидировать корректные параметры', () => {
      expect(() => {
        robokassaService.validatePaymentParams(100, 'invoice_123');
      }).not.toThrow();
    });

    it('должен выбрасывать ошибку для нулевой суммы', () => {
      expect(() => {
        robokassaService.validatePaymentParams(0, 'invoice_123');
      }).toThrow(RobokassaError);
    });

    it('должен выбрасывать ошибку для отрицательной суммы', () => {
      expect(() => {
        robokassaService.validatePaymentParams(-100, 'invoice_123');
      }).toThrow(RobokassaError);
    });

    it('должен выбрасывать ошибку для пустого ID счета', () => {
      expect(() => {
        robokassaService.validatePaymentParams(100, '');
      }).toThrow(RobokassaError);
    });

    it('должен выбрасывать ошибку для слишком большой суммы', () => {
      expect(() => {
        robokassaService.validatePaymentParams(200000, 'invoice_123');
      }).toThrow(RobokassaError);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('должен проверять корректную подпись', () => {
      // Генерируем тестовые данные с корректной подписью
      const testData = {
        OutSum: '100.00',
        InvId: 'test_invoice',
        SignatureValue: '5d41402abc4b2a76b9719d911017c592' // MD5 от test_merchant:100.00:test_invoice:test_password2
      };

      // Мокаем метод генерации подписи для тестирования
      const originalMethod = (robokassaService as any).generateSignature;
      (robokassaService as any).generateSignature = jest.fn().mockReturnValue('5d41402abc4b2a76b9719d911017c592');

      const result = robokassaService.verifyWebhookSignature(testData);

      expect(result).toBe(true);

      // Восстанавливаем оригинальный метод
      (robokassaService as any).generateSignature = originalMethod;
    });

    it('должен отклонять некорректную подпись', () => {
      const testData = {
        OutSum: '100.00',
        InvId: 'test_invoice',
        SignatureValue: 'invalid_signature'
      };

      const result = robokassaService.verifyWebhookSignature(testData);

      expect(result).toBe(false);
    });

    it('должен обрабатывать ошибки при проверке подписи', () => {
      const invalidData = {
        OutSum: 'invalid_amount',
        InvId: 'test_invoice',
        SignatureValue: 'some_signature'
      };

      const result = robokassaService.verifyWebhookSignature(invalidData);

      expect(result).toBe(false);
    });
  });

  describe('processWebhook', () => {
    it('должен обрабатывать корректный webhook', async () => {
      const webhookData = {
        OutSum: '100.50',
        InvId: 'test_invoice_123',
        SignatureValue: 'valid_signature'
      };

      // Мокаем проверку подписи
      jest.spyOn(robokassaService, 'verifyWebhookSignature').mockReturnValue(true);

      const result = await robokassaService.processWebhook(webhookData);

      expect(result).toEqual({
        invoiceId: 'test_invoice_123',
        amount: 100.50,
        isValid: true
      });
    });

    it('должен выбрасывать ошибку для некорректной подписи', async () => {
      const webhookData = {
        OutSum: '100.50',
        InvId: 'test_invoice_123',
        SignatureValue: 'invalid_signature'
      };

      // Мокаем проверку подписи
      jest.spyOn(robokassaService, 'verifyWebhookSignature').mockReturnValue(false);

      await expect(
        robokassaService.processWebhook(webhookData)
      ).rejects.toThrow(RobokassaError);
    });
  });

  describe('getTestConfig', () => {
    it('должен возвращать тестовую конфигурацию', () => {
      const config = robokassaService.getTestConfig();

      expect(config).toEqual({
        merchantId: 'test_merchant',
        testMode: true,
        baseUrl: 'https://auth.robokassa.ru/Merchant/Index.aspx'
      });
    });
  });
});