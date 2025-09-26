// Конфигурация приложения
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

export const config = {
  // Настройки сервера
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3002'],
      credentials: true,
    },
  },

  // База данных
  database: {
    url: process.env.DATABASE_URL!,
    options: {
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '10', 10),
      serverSelectionTimeoutMS: parseInt(process.env.DB_TIMEOUT || '5000', 10),
    },
  },

  // Kafka
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:29092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'app-server',
    groupId: process.env.KAFKA_GROUP_ID || 'billing-group',
    topics: {
      mikrotikCommands: 'mikrotik-commands',
      deviceStatus: 'device-status',
      notifications: 'notifications',
    },
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Биллинг
  billing: {
    hourlyCheckInterval: parseInt(process.env.BILLING_CHECK_INTERVAL || '3600000', 10), // 1 час в мс
    notificationThresholds: [100, 50, 10], // Рубли
    autoBlockEnabled: process.env.BILLING_AUTO_BLOCK === 'true',
    defaultBlockThreshold: parseFloat(process.env.DEFAULT_BLOCK_THRESHOLD || '0'),
  },

  // Уведомления
  notifications: {
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
      webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
      apiUrl: 'https://api.telegram.org/bot',
    },
    sms: {
      gatewayIp: process.env.SMS_GATEWAY_IP!,
      username: process.env.SMS_GATEWAY_USERNAME!,
      password: process.env.SMS_GATEWAY_PASSWORD!,
      port: parseInt(process.env.SMS_GATEWAY_PORT || '80', 10),
    },
    retryAttempts: parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.NOTIFICATION_RETRY_DELAY || '5000', 10), // 5 секунд
  },

  // Внешние сервисы
  external: {
    robokassa: {
      merchantId: process.env.ROBOKASSA_MERCHANT_ID!,
      password1: process.env.ROBOKASSA_PASSWORD1!,
      password2: process.env.ROBOKASSA_PASSWORD2!,
      testMode: process.env.ROBOKASSA_TEST_MODE === 'true',
      apiUrl: process.env.ROBOKASSA_TEST_MODE === 'true' 
        ? 'https://auth.robokassa.ru/Merchant/Index.aspx'
        : 'https://auth.robokassa.ru/Merchant/Index.aspx',
    },
    yandexMaps: {
      apiKey: process.env.YANDEX_MAPS_API_KEY!,
      apiUrl: 'https://geocode-maps.yandex.ru/1.x/',
    },
  },

  // Безопасность
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 минут
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  // MikroTik
  mikrotik: {
    defaultPort: parseInt(process.env.MIKROTIK_DEFAULT_PORT || '8728', 10),
    defaultTimeout: parseInt(process.env.MIKROTIK_DEFAULT_TIMEOUT || '10000', 10), // 10 секунд
    healthCheckInterval: parseInt(process.env.MIKROTIK_HEALTH_CHECK_INTERVAL || '300000', 10), // 5 минут
    maxRetries: parseInt(process.env.MIKROTIK_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.MIKROTIK_RETRY_DELAY || '5000', 10), // 5 секунд
  },

  // Мониторинг
  monitoring: {
    zabbixUrl: process.env.ZABBIX_URL || 'http://localhost/zabbix',
    grafanaUrl: process.env.GRAFANA_URL || 'http://localhost/grafana',
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10), // 30 секунд
  },

  // Dashboard
  dashboard: {
    cacheDefaultTtl: parseInt(process.env.DASHBOARD_CACHE_TTL || '300', 10), // 5 минут
    maxActivityItems: parseInt(process.env.DASHBOARD_MAX_ACTIVITY || '50', 10),
    maxTopClients: parseInt(process.env.DASHBOARD_MAX_TOP_CLIENTS || '50', 10),
    maxLowBalanceClients: parseInt(process.env.DASHBOARD_MAX_LOW_BALANCE || '50', 10),
    lowBalanceThreshold: parseFloat(process.env.DASHBOARD_LOW_BALANCE_THRESHOLD || '100'), // 100 рублей
    maxDateRangeDays: parseInt(process.env.DASHBOARD_MAX_DATE_RANGE_DAYS || '365', 10), // 1 год
    cacheCleanupInterval: parseInt(process.env.DASHBOARD_CACHE_CLEANUP_INTERVAL || '300000', 10), // 5 минут
  },
};

// Валидация обязательных переменных
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'TELEGRAM_BOT_TOKEN',
  'SMS_GATEWAY_IP',
  'SMS_GATEWAY_USERNAME',
  'SMS_GATEWAY_PASSWORD',
  'ROBOKASSA_MERCHANT_ID',
  'ROBOKASSA_PASSWORD1',
  'ROBOKASSA_PASSWORD2',
  'YANDEX_MAPS_API_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Отсутствует обязательная переменная окружения: ${envVar}`);
  }
}

export default config;