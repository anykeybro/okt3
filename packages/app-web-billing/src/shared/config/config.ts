/**
 * Конфигурация приложения app-web-billing (административная панель)
 */

export const config = {
  // Настройки приложения
  app: {
    name: 'OK-Telecom Admin',
    description: 'Административная панель биллинг-системы',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },

  // API сервер
  api: {
    baseUrl: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost') + '/api',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
    retries: parseInt(process.env.NEXT_PUBLIC_API_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.NEXT_PUBLIC_API_RETRY_DELAY || '1000', 10),
  },

  // Аутентификация
  auth: {
    tokenKey: 'billing_admin_token',
    refreshTokenKey: 'billing_admin_refresh_token',
    sessionTimeout: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '86400000', 10), // 24 часа
    maxLoginAttempts: parseInt(process.env.NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS || '5', 10),
    blockDuration: parseInt(process.env.NEXT_PUBLIC_BLOCK_DURATION || '1800000', 10), // 30 минут
    autoLogoutWarning: parseInt(process.env.NEXT_PUBLIC_AUTO_LOGOUT_WARNING || '300000', 10), // 5 минут до истечения
  },

  // Пагинация
  pagination: {
    defaultPageSize: parseInt(process.env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE || '20', 10),
    pageSizeOptions: [10, 20, 50, 100],
    maxPageSize: parseInt(process.env.NEXT_PUBLIC_MAX_PAGE_SIZE || '100', 10),
  },

  // Форматирование
  format: {
    currency: 'RUB',
    locale: 'ru-RU',
    dateFormat: 'dd.MM.yyyy',
    dateTimeFormat: 'dd.MM.yyyy HH:mm:ss',
    timeFormat: 'HH:mm',
    shortDateFormat: 'dd.MM',
    monthYearFormat: 'MM.yyyy',
    decimalPlaces: 2,
    thousandsSeparator: ' ',
  },

  // Валидация
  validation: {
    phoneRegex: /^(\+7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    macAddressRegex: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
    ipAddressRegex: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    passwordMinLength: parseInt(process.env.NEXT_PUBLIC_PASSWORD_MIN_LENGTH || '8', 10),
    passwordMaxLength: parseInt(process.env.NEXT_PUBLIC_PASSWORD_MAX_LENGTH || '128', 10),
    nameMinLength: parseInt(process.env.NEXT_PUBLIC_NAME_MIN_LENGTH || '2', 10),
    nameMaxLength: parseInt(process.env.NEXT_PUBLIC_NAME_MAX_LENGTH || '50', 10),
    addressMinLength: parseInt(process.env.NEXT_PUBLIC_ADDRESS_MIN_LENGTH || '5', 10),
    addressMaxLength: parseInt(process.env.NEXT_PUBLIC_ADDRESS_MAX_LENGTH || '255', 10),
    commentMaxLength: parseInt(process.env.NEXT_PUBLIC_COMMENT_MAX_LENGTH || '500', 10),
  },

  // Уведомления
  notifications: {
    autoHideDuration: parseInt(process.env.NEXT_PUBLIC_NOTIFICATION_DURATION || '5000', 10),
    maxNotifications: parseInt(process.env.NEXT_PUBLIC_MAX_NOTIFICATIONS || '5', 10),
    position: 'top-right' as const,
    enableSound: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATION_SOUND !== 'false',
  },

  // Обновление данных
  refetch: {
    interval: parseInt(process.env.NEXT_PUBLIC_REFETCH_INTERVAL || '30000', 10), // 30 секунд
    staleTime: parseInt(process.env.NEXT_PUBLIC_STALE_TIME || '60000', 10), // 1 минута
    cacheTime: parseInt(process.env.NEXT_PUBLIC_CACHE_TIME || '300000', 10), // 5 минут
    backgroundRefetch: process.env.NEXT_PUBLIC_BACKGROUND_REFETCH !== 'false',
  },

  // Файлы
  files: {
    maxSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedTypes: (process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf,text/csv,application/vnd.ms-excel').split(','),
    uploadChunkSize: parseInt(process.env.NEXT_PUBLIC_UPLOAD_CHUNK_SIZE || '1048576', 10), // 1MB
  },

  // Карты
  maps: {
    yandexApiKey: process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || '',
    defaultCenter: [55.751244, 37.618423], // Москва
    defaultZoom: parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAP_ZOOM || '10', 10),
    maxZoom: parseInt(process.env.NEXT_PUBLIC_MAX_MAP_ZOOM || '18', 10),
    minZoom: parseInt(process.env.NEXT_PUBLIC_MIN_MAP_ZOOM || '5', 10),
    searchRadius: parseInt(process.env.NEXT_PUBLIC_MAP_SEARCH_RADIUS || '1000', 10), // метры
  },

  // Роли и права
  roles: {
    superadmin: 'superadmin',
    admin: 'admin',
    manager: 'manager',
    cashier: 'cashier',
    technician: 'technician',
    support: 'support',
  },

  // Статусы
  statuses: {
    account: {
      active: 'active',
      blocked: 'blocked',
      suspended: 'suspended',
    },
    request: {
      new: 'new',
      inProgress: 'in_progress',
      completed: 'completed',
      cancelled: 'cancelled',
    },
    payment: {
      pending: 'pending',
      completed: 'completed',
      failed: 'failed',
      cancelled: 'cancelled',
    },
    device: {
      online: 'online',
      offline: 'offline',
      error: 'error',
      maintenance: 'maintenance',
    },
    notification: {
      pending: 'pending',
      sent: 'sent',
      failed: 'failed',
      cancelled: 'cancelled',
    },
    user: {
      active: 'active',
      inactive: 'inactive',
      blocked: 'blocked',
    },
  },

  // Цвета статусов
  statusColors: {
    active: '#4caf50',
    blocked: '#f44336',
    suspended: '#ff9800',
    inactive: '#9e9e9e',
    new: '#2196f3',
    inProgress: '#ff9800',
    completed: '#4caf50',
    cancelled: '#9e9e9e',
    pending: '#ff9800',
    failed: '#f44336',
    online: '#4caf50',
    offline: '#9e9e9e',
    error: '#f44336',
    maintenance: '#ff9800',
    sent: '#4caf50',
  },

  // Dashboard
  dashboard: {
    refreshInterval: parseInt(process.env.NEXT_PUBLIC_DASHBOARD_REFRESH_INTERVAL || '30000', 10), // 30 секунд
    maxRecentItems: parseInt(process.env.NEXT_PUBLIC_MAX_RECENT_ITEMS || '10', 10),
    maxChartPoints: parseInt(process.env.NEXT_PUBLIC_MAX_CHART_POINTS || '30', 10),
    defaultDateRange: parseInt(process.env.NEXT_PUBLIC_DEFAULT_DATE_RANGE || '30', 10), // дней
    enableRealTimeUpdates: process.env.NEXT_PUBLIC_ENABLE_REALTIME_UPDATES !== 'false',
  },

  // Таблицы
  tables: {
    defaultSortOrder: 'desc' as const,
    enableVirtualization: process.env.NEXT_PUBLIC_ENABLE_TABLE_VIRTUALIZATION === 'true',
    virtualizationThreshold: parseInt(process.env.NEXT_PUBLIC_VIRTUALIZATION_THRESHOLD || '100', 10),
    stickyHeader: process.env.NEXT_PUBLIC_STICKY_TABLE_HEADER !== 'false',
    enableExport: process.env.NEXT_PUBLIC_ENABLE_TABLE_EXPORT !== 'false',
  },

  // Формы
  forms: {
    autoSave: process.env.NEXT_PUBLIC_ENABLE_FORM_AUTOSAVE === 'true',
    autoSaveInterval: parseInt(process.env.NEXT_PUBLIC_AUTOSAVE_INTERVAL || '30000', 10), // 30 секунд
    confirmUnsavedChanges: process.env.NEXT_PUBLIC_CONFIRM_UNSAVED_CHANGES !== 'false',
    enableValidationOnChange: process.env.NEXT_PUBLIC_VALIDATE_ON_CHANGE !== 'false',
  },

  // Безопасность
  security: {
    enableAuditLog: process.env.NEXT_PUBLIC_ENABLE_AUDIT_LOG !== 'false',
    sessionStorageKey: 'billing_admin_session',
    enableCsrf: process.env.NEXT_PUBLIC_ENABLE_CSRF !== 'false',
    enableRateLimit: process.env.NEXT_PUBLIC_ENABLE_RATE_LIMIT !== 'false',
    rateLimitWindow: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_WINDOW || '60000', 10), // 1 минута
    rateLimitMax: parseInt(process.env.NEXT_PUBLIC_RATE_LIMIT_MAX || '200', 10),
  },

  // Производительность
  performance: {
    enableLazyLoading: process.env.NEXT_PUBLIC_ENABLE_LAZY_LOADING !== 'false',
    enableImageOptimization: process.env.NEXT_PUBLIC_ENABLE_IMAGE_OPTIMIZATION !== 'false',
    enableCompression: process.env.NEXT_PUBLIC_ENABLE_COMPRESSION !== 'false',
    debounceDelay: parseInt(process.env.NEXT_PUBLIC_DEBOUNCE_DELAY || '300', 10),
    throttleDelay: parseInt(process.env.NEXT_PUBLIC_THROTTLE_DELAY || '1000', 10),
  },

  // Функциональные флаги
  features: {
    enableDarkMode: process.env.NEXT_PUBLIC_ENABLE_DARK_MODE !== 'false',
    enableNotifications: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS !== 'false',
    enableExport: process.env.NEXT_PUBLIC_ENABLE_EXPORT !== 'false',
    enableImport: process.env.NEXT_PUBLIC_ENABLE_IMPORT !== 'false',
    enableBulkOperations: process.env.NEXT_PUBLIC_ENABLE_BULK_OPERATIONS !== 'false',
    enableAdvancedFilters: process.env.NEXT_PUBLIC_ENABLE_ADVANCED_FILTERS !== 'false',
    maintenanceMode: process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true',
  },

  // Мониторинг
  monitoring: {
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    enableErrorTracking: process.env.NEXT_PUBLIC_ENABLE_ERROR_TRACKING !== 'false',
    enablePerformanceTracking: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_TRACKING === 'true',
    sampleRate: parseFloat(process.env.NEXT_PUBLIC_SAMPLE_RATE || '1.0'),
  },
} as const;

// Валидация критически важных переменных окружения
const requiredEnvVars = [
  'NEXT_PUBLIC_API_URL',
];

// Проверяем только в production
if (process.env.NODE_ENV === 'production') {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`Отсутствует переменная окружения: ${envVar}`);
    }
  }
}

export type BillingConfig = typeof config;

export type Config = typeof config;