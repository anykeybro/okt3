/**
 * Конфигурация для app-web (публичный сайт и личный кабинет)
 */

export const config = {
  // Настройки приложения
  app: {
    name: 'OK-Telecom',
    description: 'Интернет-провайдер OK-Telecom',
    port: parseInt(process.env.PORT || '3003', 10),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },

  // API сервер
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL_WEB || 'http://localhost/api',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000', 10),
    retries: parseInt(process.env.NEXT_PUBLIC_API_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.NEXT_PUBLIC_API_RETRY_DELAY || '1000', 10),
  },

  // Аутентификация
  auth: {
    sessionTimeout: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '1800000', 10), // 30 минут
    phoneVerificationTimeout: parseInt(process.env.NEXT_PUBLIC_PHONE_VERIFICATION_TIMEOUT || '300000', 10), // 5 минут
    maxLoginAttempts: parseInt(process.env.NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS || '3', 10),
    blockDuration: parseInt(process.env.NEXT_PUBLIC_BLOCK_DURATION || '900000', 10), // 15 минут
    tokenKey: 'ok_telecom_token',
    refreshTokenKey: 'ok_telecom_refresh_token',
  },

  // Платежная система
  payment: {
    robokassa: {
      merchantId: process.env.NEXT_PUBLIC_ROBOKASSA_MERCHANT_ID || '',
      testMode: process.env.NODE_ENV !== 'production',
      successUrl: process.env.NEXT_PUBLIC_ROBOKASSA_SUCCESS_URL || '/payment/success',
      failUrl: process.env.NEXT_PUBLIC_ROBOKASSA_FAIL_URL || '/payment/fail',
      culture: 'ru',
    },
    minAmount: parseFloat(process.env.NEXT_PUBLIC_MIN_PAYMENT_AMOUNT || '10'),
    maxAmount: parseFloat(process.env.NEXT_PUBLIC_MAX_PAYMENT_AMOUNT || '50000'),
  },

  // Пользовательский интерфейс
  ui: {
    itemsPerPage: parseInt(process.env.NEXT_PUBLIC_ITEMS_PER_PAGE || '10', 10),
    debounceDelay: parseInt(process.env.NEXT_PUBLIC_DEBOUNCE_DELAY || '300', 10),
    animationDuration: parseInt(process.env.NEXT_PUBLIC_ANIMATION_DURATION || '300', 10),
    toastDuration: parseInt(process.env.NEXT_PUBLIC_TOAST_DURATION || '5000', 10),
    maxToasts: parseInt(process.env.NEXT_PUBLIC_MAX_TOASTS || '3', 10),
  },

  // Валидация
  validation: {
    phoneRegex: /^(\+7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    minPasswordLength: parseInt(process.env.NEXT_PUBLIC_MIN_PASSWORD_LENGTH || '6', 10),
    maxPasswordLength: parseInt(process.env.NEXT_PUBLIC_MAX_PASSWORD_LENGTH || '128', 10),
    nameMinLength: parseInt(process.env.NEXT_PUBLIC_NAME_MIN_LENGTH || '2', 10),
    nameMaxLength: parseInt(process.env.NEXT_PUBLIC_NAME_MAX_LENGTH || '50', 10),
    addressMinLength: parseInt(process.env.NEXT_PUBLIC_ADDRESS_MIN_LENGTH || '5', 10),
    addressMaxLength: parseInt(process.env.NEXT_PUBLIC_ADDRESS_MAX_LENGTH || '255', 10),
  },

  // Форматирование
  format: {
    currency: 'RUB',
    locale: 'ru-RU',
    dateFormat: 'dd.MM.yyyy',
    dateTimeFormat: 'dd.MM.yyyy HH:mm',
    timeFormat: 'HH:mm',
    decimalPlaces: 2,
  },

  // Карты
  maps: {
    yandexApiKey: process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || '',
    defaultCenter: [55.751244, 37.618423], // Москва
    defaultZoom: parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAP_ZOOM || '10', 10),
    searchRadius: parseInt(process.env.NEXT_PUBLIC_MAP_SEARCH_RADIUS || '1000', 10), // метры
  },

  // Кеширование
  cache: {
    defaultTtl: parseInt(process.env.NEXT_PUBLIC_CACHE_TTL || '300000', 10), // 5 минут
    userDataTtl: parseInt(process.env.NEXT_PUBLIC_USER_CACHE_TTL || '600000', 10), // 10 минут
    staticDataTtl: parseInt(process.env.NEXT_PUBLIC_STATIC_CACHE_TTL || '3600000', 10), // 1 час
  },

  // Файлы
  files: {
    maxSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '5242880', 10), // 5MB
    allowedTypes: (process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(','),
  },

  // Безопасность
  security: {
    enableCsrf: process.env.NEXT_PUBLIC_ENABLE_CSRF !== 'false',
    enableRateLimit: process.env.NEXT_PUBLIC_ENABLE_RATE_LIMIT !== 'false',
    rateLimitWindow: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_WINDOW || '60000', 10), // 1 минута
    rateLimitMax: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_MAX || '100', 10),
  },

  // Мониторинг и аналитика
  monitoring: {
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    enableErrorTracking: process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING !== 'false',
    sampleRate: parseFloat(process.env.NEXT_PUBLIC_SAMPLE_RATE || '1.0'),
  },

  // Функциональные флаги
  features: {
    enableRegistration: process.env.NEXT_PUBLIC_ENABLE_REGISTRATION !== 'false',
    enablePayments: process.env.NEXT_PUBLIC_ENABLE_PAYMENTS !== 'false',
    enableMaps: process.env.NEXT_PUBLIC_ENABLE_MAPS !== 'false',
    enableNotifications: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS !== 'false',
    maintenanceMode: process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true',
  },
} as const;

// Валидация критически важных переменных окружения
const requiredEnvVars = [
  'NEXT_PUBLIC_API_URL_WEB',
];

// Проверяем только в production
if (process.env.NODE_ENV === 'production') {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`Отсутствует переменная окружения: ${envVar}`);
    }
  }
}

export type WebConfig = typeof config;
export default config;