// Сервис для интеграции с Robokassa API
import crypto from 'crypto';
import axios from 'axios';
import { config } from '../../config/config';
import { 
  RobokassaPaymentRequest, 
  RobokassaWebhookData, 
  RobokassaPaymentUrl,
  RobokassaError 
} from './payments.types';

export class RobokassaService {
  private readonly merchantId: string;
  private readonly password1: string;
  private readonly password2: string;
  private readonly testMode: boolean;
  private readonly baseUrl: string;

  constructor() {
    this.merchantId = config.external.robokassa.merchantId;
    this.password1 = config.external.robokassa.password1;
    this.password2 = config.external.robokassa.password2;
    this.testMode = config.external.robokassa.testMode;
    this.baseUrl = config.external.robokassa.apiUrl;
  }

  /**
   * Генерирует URL для оплаты через Robokassa
   */
  async generatePaymentUrl(
    amount: number, 
    invoiceId: string, 
    description: string = 'Пополнение баланса'
  ): Promise<RobokassaPaymentUrl> {
    try {
      // Валидируем параметры
      this.validatePaymentParams(amount, invoiceId);
      
      // Формируем подпись для запроса
      const signature = this.generateSignature(amount, invoiceId, this.password1);
      
      const params = new URLSearchParams({
        MerchantLogin: this.merchantId,
        OutSum: amount.toFixed(2),
        InvId: invoiceId,
        Description: description,
        SignatureValue: signature,
        Culture: 'ru',
        ...(this.testMode && { IsTest: '1' })
      });

      const paymentUrl = `${this.baseUrl}?${params.toString()}`;

      return {
        url: paymentUrl,
        invoiceId
      };
    } catch (error) {
      throw new RobokassaError(
        `Ошибка генерации URL оплаты: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        'PAYMENT_URL_GENERATION_ERROR'
      );
    }
  }

  /**
   * Проверяет подпись webhook'а от Robokassa
   */
  verifyWebhookSignature(data: RobokassaWebhookData): boolean {
    try {
      const { OutSum, InvId, SignatureValue } = data;
      
      // Генерируем ожидаемую подпись
      const expectedSignature = this.generateSignature(
        parseFloat(OutSum), 
        InvId, 
        this.password2
      );

      return SignatureValue.toLowerCase() === expectedSignature.toLowerCase();
    } catch (error) {
      console.error('Ошибка проверки подписи webhook:', error);
      return false;
    }
  }

  /**
   * Обрабатывает данные webhook'а от Robokassa
   */
  async processWebhook(data: RobokassaWebhookData): Promise<{
    invoiceId: string;
    amount: number;
    isValid: boolean;
  }> {
    const isValid = this.verifyWebhookSignature(data);
    
    if (!isValid) {
      throw new RobokassaError('Неверная подпись webhook', 'INVALID_WEBHOOK_SIGNATURE');
    }

    return {
      invoiceId: data.InvId,
      amount: parseFloat(data.OutSum),
      isValid
    };
  }

  /**
   * Проверяет статус платежа через API Robokassa
   */
  async checkPaymentStatus(invoiceId: string): Promise<{
    status: 'pending' | 'completed' | 'failed';
    amount?: number;
  }> {
    try {
      // В реальной интеграции здесь был бы запрос к API Robokassa
      // Для демонстрации возвращаем статус pending
      return {
        status: 'pending'
      };
    } catch (error) {
      throw new RobokassaError(
        `Ошибка проверки статуса платежа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        'PAYMENT_STATUS_CHECK_ERROR'
      );
    }
  }

  /**
   * Генерирует MD5 подпись для Robokassa
   */
  private generateSignature(amount: number, invoiceId: string, password: string): string {
    const signatureString = `${this.merchantId}:${amount.toFixed(2)}:${invoiceId}:${password}`;
    return crypto.createHash('md5').update(signatureString).digest('hex');
  }

  /**
   * Валидирует параметры платежа
   */
  validatePaymentParams(amount: number, invoiceId: string): void {
    if (amount <= 0) {
      throw new RobokassaError('Сумма платежа должна быть больше 0', 'INVALID_AMOUNT');
    }

    if (!invoiceId || invoiceId.trim() === '') {
      throw new RobokassaError('ID счета не может быть пустым', 'INVALID_INVOICE_ID');
    }

    if (amount > 100000) {
      throw new RobokassaError('Максимальная сумма платежа: 100,000 рублей', 'AMOUNT_TOO_HIGH');
    }
  }

  /**
   * Получает конфигурацию для тестирования
   */
  getTestConfig() {
    return {
      merchantId: this.merchantId,
      testMode: this.testMode,
      baseUrl: this.baseUrl
    };
  }
}