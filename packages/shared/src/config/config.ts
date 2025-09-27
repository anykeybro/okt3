/**
 * Общая конфигурация для всех пакетов
 * Содержит константы, типы и утилиты, используемые во всех модулях
 */

export const sharedConfig = {
  // Общие константы приложения
  app: {
    name: 'OK-Telecom Billing System',
    version: '1.0.0',
    description: 'Биллинг-система для интернет-провайдера',
    company: 'OK-Telecom',
  },

  // Форматы данных
  formats: {
    currency: 'RUB',
    locale: 'ru-RU',
    timezone: 'Europe/Moscow',
    dateFormat: 'dd.MM.yyyy',
    dateTimeFormat: 'dd.MM.yyyy HH:mm:ss',
    timeFormat: 'HH:mm',
    shortDateFormat: 'dd.MM',
    monthYearFormat: 'MM.yyyy',
  },

  // Валидация
  validation: {
    // Телефонные номера (российские)
    phoneRegex: /^(\+7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
    phoneLength: { min: 10, max: 12 },
    
    // Email
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    emailLength: { min: 5, max: 254 },
    
    // MAC адреса
    macAddressRegex: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
    
    // IP адреса
    ipAddressRegex: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    
    // Пароли
    passwordLength: { min: 6, max: 128 },
    strongPasswordRegex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    
    // Имена
    nameLength: { min: 2, max: 50 },
    nameRegex: /^[а-яёА-ЯЁa-zA-Z\s\-]+$/,
    
    // Адреса
    addressLength: { min: 5, max: 255 },
    
    // Суммы (в рублях)
    amountRange: { min: 0.01, max: 999999.99 },
    
    // Лицевые счета
    accountNumberLength: { min: 6, max: 12 },
    accountNumberRegex: /^[0-9]+$/,
  },

  // Статусы системы
  statuses: {
    // Статусы лицевых счетов
    account: {
      ACTIVE: 'active',
      BLOCKED: 'blocked',
      SUSPENDED: 'suspended',
    },
    
    // Статусы заявок
    request: {
      NEW: 'new',
      IN_PROGRESS: 'in_progress',
      COMPLETED: 'completed',
      CANCELLED: 'cancelled',
    },
    
    // Статусы платежей
    payment: {
      PENDING: 'pending',
      COMPLETED: 'completed',
      FAILED: 'failed',
      CANCELLED: 'cancelled',
    },
    
    // Статусы устройств
    device: {
      ONLINE: 'online',
      OFFLINE: 'offline',
      ERROR: 'error',
      MAINTENANCE: 'maintenance',
    },
    
    // Статусы уведомлений
    notification: {
      PENDING: 'pending',
      SENT: 'sent',
      FAILED: 'failed',
      CANCELLED: 'cancelled',
    },
    
    // Статусы пользователей
    user: {
      ACTIVE: 'active',
      INACTIVE: 'inactive',
      BLOCKED: 'blocked',
    },
  },

  // Типы сервисов
  serviceTypes: {
    INTERNET: 'internet',
    IPTV: 'iptv',
    CLOUD_STORAGE: 'cloud_storage',
    PHONE: 'phone',
    STATIC_IP: 'static_ip',
  },

  // Типы биллинга
  billingTypes: {
    PREPAID_MONTHLY: 'prepaid_monthly',
    PREPAID_DAILY: 'prepaid_daily',
    HOURLY: 'hourly',
    POSTPAID: 'postpaid',
  },

  // Источники платежей
  paymentSources: {
    MANUAL: 'manual',
    ROBOKASSA: 'robokassa',
    BANK_TRANSFER: 'bank_transfer',
    CASH: 'cash',
    CARD: 'card',
  },

  // Каналы уведомлений
  notificationChannels: {
    TELEGRAM: 'telegram',
    SMS: 'sms',
    EMAIL: 'email',
    PUSH: 'push',
  },

  // Типы уведомлений
  notificationTypes: {
    WELCOME: 'welcome',
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed',
    LOW_BALANCE: 'low_balance',
    ACCOUNT_BLOCKED: 'account_blocked',
    ACCOUNT_UNBLOCKED: 'account_unblocked',
    TARIFF_CHANGED: 'tariff_changed',
    SERVICE_ADDED: 'service_added',
    SERVICE_REMOVED: 'service_removed',
    MAINTENANCE: 'maintenance',
    SYSTEM_ALERT: 'system_alert',
  },

  // Роли пользователей
  roles: {
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin',
    MANAGER: 'manager',
    CASHIER: 'cashier',
    TECHNICIAN: 'technician',
    SUPPORT: 'support',
  },

  // Права доступа
  permissions: {
    // Управление пользователями
    USERS_CREATE: 'users:create',
    USERS_READ: 'users:read',
    USERS_UPDATE: 'users:update',
    USERS_DELETE: 'users:delete',
    
    // Управление клиентами
    CLIENTS_CREATE: 'clients:create',
    CLIENTS_READ: 'clients:read',
    CLIENTS_UPDATE: 'clients:update',
    CLIENTS_DELETE: 'clients:delete',
    
    // Управление тарифами
    TARIFFS_CREATE: 'tariffs:create',
    TARIFFS_READ: 'tariffs:read',
    TARIFFS_UPDATE: 'tariffs:update',
    TARIFFS_DELETE: 'tariffs:delete',
    
    // Управление платежами
    PAYMENTS_CREATE: 'payments:create',
    PAYMENTS_READ: 'payments:read',
    PAYMENTS_UPDATE: 'payments:update',
    PAYMENTS_DELETE: 'payments:delete',
    
    // Управление устройствами
    DEVICES_CREATE: 'devices:create',
    DEVICES_READ: 'devices:read',
    DEVICES_UPDATE: 'devices:update',
    DEVICES_DELETE: 'devices:delete',
    
    // Управление заявками
    REQUESTS_CREATE: 'requests:create',
    REQUESTS_READ: 'requests:read',
    REQUESTS_UPDATE: 'requests:update',
    REQUESTS_DELETE: 'requests:delete',
    
    // Системные настройки
    SETTINGS_READ: 'settings:read',
    SETTINGS_UPDATE: 'settings:update',
    
    // Отчеты и аналитика
    REPORTS_READ: 'reports:read',
    ANALYTICS_READ: 'analytics:read',
  },

  // Лимиты и ограничения
  limits: {
    // Пагинация
    pagination: {
      defaultPageSize: 20,
      maxPageSize: 100,
      pageSizeOptions: [10, 20, 50, 100],
    },
    
    // Файлы
    files: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      allowedDocumentTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    },
    
    // API
    api: {
      defaultTimeout: 30000, // 30 секунд
      maxRetries: 3,
      retryDelay: 1000, // 1 секунда
    },
    
    // Кеширование
    cache: {
      defaultTtl: 300, // 5 минут
      maxTtl: 3600, // 1 час
      maxSize: 1000, // количество записей
    },
  },

  // Цвета для UI
  colors: {
    // Статусы
    status: {
      active: '#4caf50',
      inactive: '#9e9e9e',
      blocked: '#f44336',
      suspended: '#ff9800',
      pending: '#2196f3',
      completed: '#4caf50',
      failed: '#f44336',
      cancelled: '#9e9e9e',
      online: '#4caf50',
      offline: '#9e9e9e',
      error: '#f44336',
      maintenance: '#ff9800',
    },
    
    // Приоритеты
    priority: {
      low: '#4caf50',
      medium: '#ff9800',
      high: '#f44336',
      critical: '#9c27b0',
    },
    
    // Типы
    type: {
      info: '#2196f3',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
    },
  },

  // Регулярные выражения для различных проверок
  regex: {
    // Только цифры
    numbersOnly: /^\d+$/,
    
    // Только буквы (русские и английские)
    lettersOnly: /^[а-яёА-ЯЁa-zA-Z]+$/,
    
    // Буквы, цифры и пробелы
    alphanumericWithSpaces: /^[а-яёА-ЯЁa-zA-Z0-9\s]+$/,
    
    // URL
    url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    
    // Координаты (широта, долгота)
    latitude: /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)$/,
    longitude: /^[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/,
  },

  // Константы для различных модулей
  constants: {
    // Минимальные балансы по умолчанию
    defaultBalanceThresholds: {
      warning: 100, // рублей
      critical: 50,  // рублей
      block: 0,      // рублей
    },
    
    // Интервалы обновления (в миллисекундах)
    updateIntervals: {
      dashboard: 30000,    // 30 секунд
      deviceStatus: 60000, // 1 минута
      billing: 3600000,    // 1 час
      notifications: 10000, // 10 секунд
    },
    
    // Таймауты (в миллисекундах)
    timeouts: {
      api: 30000,      // 30 секунд
      database: 10000, // 10 секунд
      external: 15000, // 15 секунд
    },
  },
} as const;

// Типы для TypeScript
export type SharedConfig = typeof sharedConfig;
export type AccountStatus = keyof typeof sharedConfig.statuses.account;
export type RequestStatus = keyof typeof sharedConfig.statuses.request;
export type PaymentStatus = keyof typeof sharedConfig.statuses.payment;
export type DeviceStatus = keyof typeof sharedConfig.statuses.device;
export type NotificationStatus = keyof typeof sharedConfig.statuses.notification;
export type UserStatus = keyof typeof sharedConfig.statuses.user;
export type ServiceType = keyof typeof sharedConfig.serviceTypes;
export type BillingType = keyof typeof sharedConfig.billingTypes;
export type PaymentSource = keyof typeof sharedConfig.paymentSources;
export type NotificationChannel = keyof typeof sharedConfig.notificationChannels;
export type NotificationType = keyof typeof sharedConfig.notificationTypes;
export type UserRole = keyof typeof sharedConfig.roles;
export type Permission = keyof typeof sharedConfig.permissions;

export default sharedConfig;