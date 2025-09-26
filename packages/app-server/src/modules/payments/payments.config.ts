// Конфигурация модуля платежной системы
export const paymentsConfig = {
  // Лимиты платежей
  limits: {
    minAmount: 1, // Минимальная сумма платежа в рублях
    maxAmount: 100000, // Максимальная сумма платежа в рублях
    maxDailyAmount: 500000, // Максимальная сумма платежей в день
    maxMonthlyAmount: 2000000, // Максимальная сумма платежей в месяц
  },

  // Настройки пагинации
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc' as const,
  },

  // Настройки Robokassa
  robokassa: {
    culture: 'ru', // Язык интерфейса
    defaultDescription: 'Пополнение баланса', // Описание по умолчанию
    timeout: 30000, // Таймаут запросов в мс
    retryAttempts: 3, // Количество попыток при ошибке
    retryDelay: 5000, // Задержка между попытками в мс
  },

  // Настройки webhook
  webhook: {
    timeout: 10000, // Таймаут обработки webhook в мс
    maxRetries: 5, // Максимальное количество повторных попыток
    retryDelay: 2000, // Задержка между повторными попытками в мс
  },

  // Настройки кеширования
  cache: {
    statsExpiry: 300, // Время жизни кеша статистики в секундах (5 минут)
    paymentExpiry: 60, // Время жизни кеша платежа в секундах (1 минута)
  },

  // Настройки уведомлений
  notifications: {
    enablePaymentNotifications: true, // Включить уведомления о платежах
    notificationDelay: 1000, // Задержка перед отправкой уведомления в мс
  },

  // Настройки валидации
  validation: {
    accountIdPattern: /^[a-f\d]{24}$/i, // Паттерн для MongoDB ObjectId
    commentMaxLength: 500, // Максимальная длина комментария
    descriptionMaxLength: 255, // Максимальная длина описания
  },

  // Настройки безопасности
  security: {
    enableSignatureValidation: true, // Включить проверку подписи webhook
    enableRateLimiting: true, // Включить ограничение частоты запросов
    maxRequestsPerMinute: 60, // Максимальное количество запросов в минуту
    enableIpWhitelist: false, // Включить белый список IP для webhook
    allowedIps: [], // Разрешенные IP адреса для webhook
  },

  // Настройки логирования
  logging: {
    enablePaymentLogs: true, // Включить логирование платежей
    enableWebhookLogs: true, // Включить логирование webhook
    enableErrorLogs: true, // Включить логирование ошибок
    logLevel: 'info' as const, // Уровень логирования
  },

  // Настройки мониторинга
  monitoring: {
    enableMetrics: true, // Включить сбор метрик
    metricsInterval: 60000, // Интервал сбора метрик в мс (1 минута)
    enableHealthCheck: true, // Включить проверку здоровья
    healthCheckInterval: 30000, // Интервал проверки здоровья в мс (30 секунд)
  },

  // Коды ошибок и их описания
  errorCodes: {
    ACCOUNT_NOT_FOUND: 'Лицевой счет не найден',
    PAYMENT_NOT_FOUND: 'Платеж не найден',
    ADMIN_NOT_FOUND: 'Администратор не найден',
    INVALID_AMOUNT: 'Некорректная сумма платежа',
    INVALID_WEBHOOK_SIGNATURE: 'Неверная подпись webhook',
    AMOUNT_TOO_HIGH: 'Сумма превышает максимально допустимую',
    AMOUNT_TOO_LOW: 'Сумма меньше минимально допустимой',
    DAILY_LIMIT_EXCEEDED: 'Превышен дневной лимит платежей',
    MONTHLY_LIMIT_EXCEEDED: 'Превышен месячный лимит платежей',
    PAYMENT_ALREADY_PROCESSED: 'Платеж уже обработан',
    ROBOKASSA_API_ERROR: 'Ошибка API Robokassa',
    WEBHOOK_PROCESSING_ERROR: 'Ошибка обработки webhook',
    VALIDATION_ERROR: 'Ошибка валидации данных',
    UNAUTHORIZED: 'Не авторизован',
    FORBIDDEN: 'Доступ запрещен',
    RATE_LIMIT_EXCEEDED: 'Превышен лимит запросов',
    INTERNAL_SERVER_ERROR: 'Внутренняя ошибка сервера',
  },

  // Статусы платежей и их описания
  paymentStatuses: {
    PENDING: 'Ожидает обработки',
    COMPLETED: 'Завершен',
    FAILED: 'Неудачный',
  },

  // Источники платежей и их описания
  paymentSources: {
    MANUAL: 'Ручное пополнение',
    ROBOKASSA: 'Robokassa',
  },

  // Форматы дат
  dateFormats: {
    display: 'DD.MM.YYYY HH:mm:ss', // Формат для отображения
    api: 'YYYY-MM-DD', // Формат для API
    database: 'YYYY-MM-DD HH:mm:ss', // Формат для базы данных
  },

  // Настройки экспорта
  export: {
    maxRecords: 10000, // Максимальное количество записей для экспорта
    formats: ['csv', 'xlsx', 'json'], // Поддерживаемые форматы экспорта
    defaultFormat: 'xlsx' as const,
  },
};