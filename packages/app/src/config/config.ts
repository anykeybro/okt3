/**
 * Конфигурация для пакета app (Telegram Bot)
 */
import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
const rootPath = path.resolve(__dirname, '../../../../');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
const envPath = path.join(rootPath, envFile);

dotenv.config({ path: envPath });

export const config = {
  // Настройки приложения
  app: {
    name: 'OK-Telecom Bot',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },

  // Telegram Bot
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    apiUrl: 'https://api.telegram.org/bot',
    maxRetries: parseInt(process.env.TELEGRAM_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.TELEGRAM_RETRY_DELAY || '1000', 10), // 1 секунда
    timeout: parseInt(process.env.TELEGRAM_TIMEOUT || '30000', 10), // 30 секунд
    parseMode: 'HTML' as const,
  },

  // API сервер
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3001/api',
    timeout: parseInt(process.env.API_TIMEOUT || '10000', 10), // 10 секунд
    retries: parseInt(process.env.API_RETRIES || '3', 10),
  },

  // Аутентификация
  auth: {
    sessionTimeout: parseInt(process.env.BOT_SESSION_TIMEOUT || '1800000', 10), // 30 минут
    maxLoginAttempts: parseInt(process.env.BOT_MAX_LOGIN_ATTEMPTS || '3', 10),
    blockDuration: parseInt(process.env.BOT_BLOCK_DURATION || '300000', 10), // 5 минут
  },

  // Кеширование
  cache: {
    userDataTtl: parseInt(process.env.BOT_USER_CACHE_TTL || '300000', 10), // 5 минут
    accountDataTtl: parseInt(process.env.BOT_ACCOUNT_CACHE_TTL || '60000', 10), // 1 минута
    maxCacheSize: parseInt(process.env.BOT_MAX_CACHE_SIZE || '1000', 10),
  },

  // Пагинация
  pagination: {
    paymentsPerPage: parseInt(process.env.BOT_PAYMENTS_PER_PAGE || '5', 10),
    maxPages: parseInt(process.env.BOT_MAX_PAGES || '10', 10),
  },

  // Форматирование
  format: {
    currency: 'RUB',
    locale: 'ru-RU',
    dateFormat: 'dd.MM.yyyy',
    dateTimeFormat: 'dd.MM.yyyy HH:mm',
    balanceDecimalPlaces: 2,
  },

  // Команды бота
  commands: {
    start: '/start',
    balance: '/balance',
    tariff: '/tariff',
    payments: '/payments',
    help: '/help',
    accounts: '/accounts',
  },

  // Сообщения
  messages: {
    maxLength: parseInt(process.env.BOT_MAX_MESSAGE_LENGTH || '4096', 10),
    truncateLength: parseInt(process.env.BOT_TRUNCATE_LENGTH || '3900', 10),
    errorRetryDelay: parseInt(process.env.BOT_ERROR_RETRY_DELAY || '2000', 10), // 2 секунды
  },

  // Логирование
  logging: {
    level: process.env.BOT_LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
    enableConsole: process.env.BOT_LOG_ENABLE_CONSOLE !== 'false',
    enableFile: process.env.BOT_LOG_ENABLE_FILE !== 'false',
    logDirectory: process.env.BOT_LOG_DIRECTORY || 'logs/bot',
    maxFiles: parseInt(process.env.BOT_LOG_MAX_FILES || '5', 10),
    maxSize: process.env.BOT_LOG_MAX_SIZE || '5m',
  },

  // Валидация
  validation: {
    phoneRegex: /^(\+7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
    minPhoneLength: 10,
    maxPhoneLength: 12,
  },

  // Безопасность
  security: {
    rateLimitWindow: parseInt(process.env.BOT_RATE_LIMIT_WINDOW || '60000', 10), // 1 минута
    rateLimitMax: parseInt(process.env.BOT_RATE_LIMIT_MAX || '20', 10), // 20 сообщений в минуту
    enableSpamProtection: process.env.BOT_ENABLE_SPAM_PROTECTION !== 'false',
    spamThreshold: parseInt(process.env.BOT_SPAM_THRESHOLD || '5', 10), // сообщений подряд
  },
} as const;

// Валидация обязательных переменных
const requiredEnvVars = [
  'TELEGRAM_BOT_TOKEN',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Отсутствует обязательная переменная окружения: ${envVar}`);
  }
}

export type BotConfig = typeof config;
export default config;