/**
 * Конфигурация приложения app-server
 */
import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
// Определяем путь к корню проекта (3 уровня вверх от packages/app-server/src)
const rootPath = path.resolve(__dirname, '../../../../');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
const envPath = path.join(rootPath, envFile);

dotenv.config({ path: envPath });

// Импортируем валидатор после загрузки переменных окружения
import './env-validator';

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

  // Redis для кеширования
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'billing:',
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
    lazyConnect: true,
  },

  // Настройки кеширования
  cache: {
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10), // 5 минут
    dashboardTtl: parseInt(process.env.CACHE_DASHBOARD_TTL || '60', 10), // 1 минута
    tariffsTtl: parseInt(process.env.CACHE_TARIFFS_TTL || '3600', 10), // 1 час
    clientsTtl: parseInt(process.env.CACHE_CLIENTS_TTL || '1800', 10), // 30 минут
    devicesTtl: parseInt(process.env.CACHE_DEVICES_TTL || '300', 10), // 5 минут
    templatesTtl: parseInt(process.env.CACHE_TEMPLATES_TTL || '7200', 10), // 2 часа
  },

  // Безопасность
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 минут
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '86400000', 10), // 24 часа
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000', 10), // 15 минут
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    requirePasswordComplexity: process.env.REQUIRE_PASSWORD_COMPLEXITY !== 'false',
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
    metricsRetentionDays: parseInt(process.env.METRICS_RETENTION_DAYS || '30', 10),
    alertThresholds: {
      memoryUsage: parseFloat(process.env.ALERT_MEMORY_THRESHOLD || '90'), // %
      cpuUsage: parseFloat(process.env.ALERT_CPU_THRESHOLD || '80'), // %
      errorRate: parseFloat(process.env.ALERT_ERROR_RATE || '5'), // %
      responseTime: parseInt(process.env.ALERT_RESPONSE_TIME || '1000', 10), // ms
    },
  },

  // Логирование
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '10', 10),
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    enableFile: process.env.LOG_ENABLE_FILE !== 'false',
    logDirectory: process.env.LOG_DIRECTORY || 'logs',
    auditRetentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10),
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

// Валидация переменных окружения выполняется в env-validator.ts

export default config;