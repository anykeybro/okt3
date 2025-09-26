/**
 * Конфигурация приложения app-web-billing
 */

export const config = {
  // API сервер
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api',
    timeout: 30000,
  },

  // Аутентификация
  auth: {
    tokenKey: 'billing_admin_token',
    refreshTokenKey: 'billing_admin_refresh_token',
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 часа
  },

  // Пагинация
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },

  // Форматирование
  format: {
    currency: 'RUB',
    locale: 'ru-RU',
    dateFormat: 'dd.MM.yyyy',
    dateTimeFormat: 'dd.MM.yyyy HH:mm',
  },

  // Валидация
  validation: {
    phoneRegex: /^(\+7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/,
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    macAddressRegex: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
    ipAddressRegex: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  },

  // Уведомления
  notifications: {
    autoHideDuration: 5000,
    maxNotifications: 5,
  },

  // Обновление данных
  refetch: {
    interval: 30000, // 30 секунд
    staleTime: 60000, // 1 минута
  },

  // Файлы
  files: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },

  // Карты
  maps: {
    yandexApiKey: process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || '',
    defaultCenter: [55.751244, 37.618423], // Москва
    defaultZoom: 10,
  },

  // Роли и права
  roles: {
    superadmin: 'superadmin',
    cashier: 'cashier',
    technician: 'technician',
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
    },
    device: {
      online: 'online',
      offline: 'offline',
      error: 'error',
    },
  },

  // Цвета статусов
  statusColors: {
    active: '#4caf50',
    blocked: '#f44336',
    suspended: '#ff9800',
    new: '#2196f3',
    inProgress: '#ff9800',
    completed: '#4caf50',
    cancelled: '#9e9e9e',
    pending: '#ff9800',
    failed: '#f44336',
    online: '#4caf50',
    offline: '#9e9e9e',
    error: '#f44336',
  },
} as const;

export type Config = typeof config;