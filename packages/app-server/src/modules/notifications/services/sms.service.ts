// SMS сервис для работы с Huawei E3372
import axios, { AxiosInstance } from 'axios';
import { config } from '../../../config/config';
import { SMSGatewayResponse } from '../types';

export class SMSService {
  private client: AxiosInstance;
  private sessionId?: string;
  private tokenId?: string;

  constructor() {
    this.client = axios.create({
      baseURL: `http://${config.notifications.sms.gatewayIp}:${config.notifications.sms.port}`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
  }

  /**
   * Авторизация в SMS шлюзе
   */
  private async authenticate(): Promise<void> {
    try {
      // Получаем токен сессии
      const sessionResponse = await this.client.get('/api/webserver/SesTokInfo');
      const sessionData = this.parseXMLResponse(sessionResponse.data);
      
      this.sessionId = sessionData.SesInfo;
      this.tokenId = sessionData.TokInfo;

      // Авторизуемся
      const loginData = {
        Username: Buffer.from(config.notifications.sms.username).toString('base64'),
        Password: Buffer.from(config.notifications.sms.password).toString('base64'),
        password_type: '4'
      };

      await this.client.post('/api/user/login', this.buildXMLRequest(loginData), {
        headers: {
          '__RequestVerificationToken': this.tokenId,
          'Cookie': `SessionID=${this.sessionId}`
        }
      });

      console.log('✅ SMS шлюз: авторизация успешна');
    } catch (error) {
      console.error('❌ SMS шлюз: ошибка авторизации:', error);
      throw new Error('Не удалось авторизоваться в SMS шлюзе');
    }
  }

  /**
   * Отправка SMS сообщения
   */
  async sendSMS(phone: string, message: string): Promise<SMSGatewayResponse> {
    try {
      // Проверяем авторизацию
      if (!this.sessionId || !this.tokenId) {
        await this.authenticate();
      }

      // Форматируем номер телефона (убираем все кроме цифр и добавляем +7)
      const formattedPhone = this.formatPhoneNumber(phone);

      // Подготавливаем данные для отправки
      const smsData = {
        Index: '-1',
        Phones: {
          Phone: formattedPhone
        },
        Sca: '',
        Content: message,
        Length: message.length.toString(),
        Reserved: '1',
        Date: new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      };

      // Отправляем SMS
      const response = await this.client.post('/api/sms/send-sms', this.buildXMLRequest(smsData), {
        headers: {
          '__RequestVerificationToken': this.tokenId,
          'Cookie': `SessionID=${this.sessionId}`
        }
      });

      const result = this.parseXMLResponse(response.data);
      
      if (result === 'OK' || response.status === 200) {
        console.log(`✅ SMS отправлена на ${formattedPhone}`);
        return {
          success: true,
          messageId: `sms_${Date.now()}_${formattedPhone}`
        };
      } else {
        throw new Error(`Ошибка отправки SMS: ${result}`);
      }

    } catch (error) {
      console.error('❌ Ошибка отправки SMS:', error);
      
      // Пытаемся переавторизоваться при ошибке
      if (error instanceof Error && error.message.includes('125002')) {
        this.sessionId = undefined;
        this.tokenId = undefined;
        
        // Повторная попытка
        return this.sendSMS(phone, message);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Проверка статуса SMS шлюза
   */
  async checkStatus(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/monitoring/status');
      return response.status === 200;
    } catch (error) {
      console.error('❌ SMS шлюз недоступен:', error);
      return false;
    }
  }

  /**
   * Очистка исходящих сообщений
   */
  async clearOutbox(): Promise<void> {
    try {
      if (!this.sessionId || !this.tokenId) {
        await this.authenticate();
      }

      await this.client.post('/api/sms/delete-sms', this.buildXMLRequest({ Index: '1' }), {
        headers: {
          '__RequestVerificationToken': this.tokenId,
          'Cookie': `SessionID=${this.sessionId}`
        }
      });

      console.log('✅ SMS: исходящие сообщения очищены');
    } catch (error) {
      console.error('❌ Ошибка очистки SMS:', error);
    }
  }

  /**
   * Форматирование номера телефона
   */
  private formatPhoneNumber(phone: string): string {
    // Убираем все символы кроме цифр
    const digits = phone.replace(/\D/g, '');
    
    // Если номер начинается с 8, заменяем на 7
    if (digits.startsWith('8') && digits.length === 11) {
      return `+7${digits.slice(1)}`;
    }
    
    // Если номер начинается с 7, добавляем +
    if (digits.startsWith('7') && digits.length === 11) {
      return `+${digits}`;
    }
    
    // Если номер без кода страны, добавляем +7
    if (digits.length === 10) {
      return `+7${digits}`;
    }
    
    return `+${digits}`;
  }

  /**
   * Парсинг XML ответа
   */
  private parseXMLResponse(xml: string): any {
    // Простой парсер для XML ответов Huawei
    const matches = xml.match(/<(\w+)>([^<]*)<\/\1>/g);
    if (!matches) return xml;

    const result: any = {};
    matches.forEach(match => {
      const tagMatch = match.match(/<(\w+)>([^<]*)<\/\1>/);
      if (tagMatch) {
        result[tagMatch[1]] = tagMatch[2];
      }
    });

    return Object.keys(result).length === 1 ? Object.values(result)[0] : result;
  }

  /**
   * Построение XML запроса
   */
  private buildXMLRequest(data: any): string {
    const buildXML = (obj: any, rootTag?: string): string => {
      if (typeof obj === 'string' || typeof obj === 'number') {
        return obj.toString();
      }

      let xml = '';
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          xml += `<${key}>${buildXML(value)}</${key}>`;
        } else {
          xml += `<${key}>${value}</${key}>`;
        }
      }
      
      return rootTag ? `<${rootTag}>${xml}</${rootTag}>` : xml;
    };

    return `<?xml version="1.0" encoding="UTF-8"?><request>${buildXML(data)}</request>`;
  }
}