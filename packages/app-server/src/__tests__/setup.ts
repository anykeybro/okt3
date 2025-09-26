// Настройка тестового окружения
import { config } from 'dotenv';

// Загружаем тестовые переменные окружения
config({ path: '.env.test' });

// Мокаем консоль для тестов
global.console = {
  ...console,
  // Отключаем логи в тестах, кроме ошибок
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error,
};

// Мокаем процесс для тестов
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'mongodb://localhost:27017/test-billing';
process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
process.env.SMS_GATEWAY_IP = '192.168.1.1';
process.env.SMS_GATEWAY_USERNAME = 'test';
process.env.SMS_GATEWAY_PASSWORD = 'test';
process.env.ROBOKASSA_MERCHANT_ID = 'test-merchant';
process.env.ROBOKASSA_PASSWORD1 = 'test-password1';
process.env.ROBOKASSA_PASSWORD2 = 'test-password2';
process.env.YANDEX_MAPS_API_KEY = 'test-api-key';

// Увеличиваем таймаут для асинхронных операций
jest.setTimeout(10000);