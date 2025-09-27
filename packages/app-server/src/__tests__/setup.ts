// Настройка тестовой среды

// Мокаем console.log для тестов
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

// Мокаем переменные окружения для тестов
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'mongodb://localhost:27017/test_billing';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.TELEGRAM_BOT_TOKEN = 'test_bot_token';
process.env.SMS_GATEWAY_IP = '192.168.1.1';
process.env.SMS_GATEWAY_USERNAME = 'admin';
process.env.SMS_GATEWAY_PASSWORD = 'admin';
process.env.ROBOKASSA_MERCHANT_ID = 'test_merchant';
process.env.ROBOKASSA_PASSWORD1 = 'test_password1';
process.env.ROBOKASSA_PASSWORD2 = 'test_password2';
process.env.YANDEX_MAPS_API_KEY = 'test_yandex_key';

// Увеличиваем таймаут для асинхронных тестов
jest.setTimeout(10000);