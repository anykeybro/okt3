/**
 * Валидатор переменных окружения для app-server
 */

interface EnvValidationRule {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'json';
  defaultValue?: string | number | boolean;
  validator?: (value: string) => boolean;
  description?: string;
}

const envRules: EnvValidationRule[] = [
  // База данных
  {
    name: 'DATABASE_URL',
    required: true,
    type: 'url',
    description: 'URL подключения к MongoDB',
  },
  {
    name: 'DB_MAX_POOL_SIZE',
    required: false,
    type: 'number',
    defaultValue: 10,
    description: 'Максимальный размер пула соединений с БД',
  },
  {
    name: 'DB_TIMEOUT',
    required: false,
    type: 'number',
    defaultValue: 5000,
    description: 'Таймаут подключения к БД (мс)',
  },

  // Сервер
  {
    name: 'PORT',
    required: false,
    type: 'number',
    defaultValue: 3001,
    description: 'Порт сервера',
  },
  {
    name: 'HOST',
    required: false,
    type: 'string',
    defaultValue: '0.0.0.0',
    description: 'Хост сервера',
  },
  {
    name: 'NODE_ENV',
    required: false,
    type: 'string',
    defaultValue: 'development',
    validator: (value) => ['development', 'production', 'test'].includes(value),
    description: 'Окружение приложения',
  },
  {
    name: 'CORS_ORIGIN',
    required: false,
    type: 'string',
    defaultValue: 'http://localhost:3000,http://localhost:3002',
    description: 'Разрешенные CORS origins (через запятую)',
  },

  // JWT
  {
    name: 'JWT_SECRET',
    required: true,
    type: 'string',
    validator: (value) => value.length >= 32,
    description: 'Секретный ключ для JWT (минимум 32 символа)',
  },
  {
    name: 'JWT_EXPIRES_IN',
    required: false,
    type: 'string',
    defaultValue: '24h',
    description: 'Время жизни JWT токена',
  },
  {
    name: 'JWT_REFRESH_EXPIRES_IN',
    required: false,
    type: 'string',
    defaultValue: '7d',
    description: 'Время жизни refresh токена',
  },

  // Kafka
  {
    name: 'KAFKA_BROKERS',
    required: false,
    type: 'string',
    defaultValue: 'localhost:29092',
    description: 'Kafka брокеры (через запятую)',
  },
  {
    name: 'KAFKA_CLIENT_ID',
    required: false,
    type: 'string',
    defaultValue: 'app-server',
    description: 'Kafka client ID',
  },
  {
    name: 'KAFKA_GROUP_ID',
    required: false,
    type: 'string',
    defaultValue: 'billing-group',
    description: 'Kafka group ID',
  },

  // Telegram
  {
    name: 'TELEGRAM_BOT_TOKEN',
    required: true,
    type: 'string',
    validator: (value) => /^\d+:[A-Za-z0-9_-]+$/.test(value),
    description: 'Токен Telegram бота',
  },
  {
    name: 'TELEGRAM_WEBHOOK_URL',
    required: false,
    type: 'url',
    description: 'URL для Telegram webhook',
  },

  // SMS Gateway
  {
    name: 'SMS_GATEWAY_IP',
    required: true,
    type: 'string',
    validator: (value) => /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(value),
    description: 'IP адрес SMS шлюза',
  },
  {
    name: 'SMS_GATEWAY_USERNAME',
    required: true,
    type: 'string',
    description: 'Логин для SMS шлюза',
  },
  {
    name: 'SMS_GATEWAY_PASSWORD',
    required: true,
    type: 'string',
    description: 'Пароль для SMS шлюза',
  },
  {
    name: 'SMS_GATEWAY_PORT',
    required: false,
    type: 'number',
    defaultValue: 80,
    description: 'Порт SMS шлюза',
  },

  // Robokassa
  {
    name: 'ROBOKASSA_MERCHANT_ID',
    required: true,
    type: 'string',
    description: 'ID мерчанта Robokassa',
  },
  {
    name: 'ROBOKASSA_PASSWORD1',
    required: true,
    type: 'string',
    description: 'Пароль 1 Robokassa',
  },
  {
    name: 'ROBOKASSA_PASSWORD2',
    required: true,
    type: 'string',
    description: 'Пароль 2 Robokassa',
  },
  {
    name: 'ROBOKASSA_TEST_MODE',
    required: false,
    type: 'boolean',
    defaultValue: false,
    description: 'Тестовый режим Robokassa',
  },

  // Yandex Maps
  {
    name: 'YANDEX_MAPS_API_KEY',
    required: true,
    type: 'string',
    description: 'API ключ Yandex Maps',
  },

  // Биллинг
  {
    name: 'BILLING_CHECK_INTERVAL',
    required: false,
    type: 'number',
    defaultValue: 3600000,
    description: 'Интервал проверки биллинга (мс)',
  },
  {
    name: 'BILLING_AUTO_BLOCK',
    required: false,
    type: 'boolean',
    defaultValue: true,
    description: 'Автоматическая блокировка при недостатке средств',
  },
  {
    name: 'DEFAULT_BLOCK_THRESHOLD',
    required: false,
    type: 'number',
    defaultValue: 0,
    description: 'Порог блокировки по умолчанию',
  },

  // Безопасность
  {
    name: 'BCRYPT_ROUNDS',
    required: false,
    type: 'number',
    defaultValue: 12,
    validator: (value) => parseInt(value) >= 10 && parseInt(value) <= 15,
    description: 'Количество раундов bcrypt (10-15)',
  },
  {
    name: 'RATE_LIMIT_WINDOW',
    required: false,
    type: 'number',
    defaultValue: 900000,
    description: 'Окно rate limiting (мс)',
  },
  {
    name: 'RATE_LIMIT_MAX',
    required: false,
    type: 'number',
    defaultValue: 100,
    description: 'Максимум запросов в окне rate limiting',
  },

  // MikroTik
  {
    name: 'MIKROTIK_DEFAULT_PORT',
    required: false,
    type: 'number',
    defaultValue: 8728,
    description: 'Порт MikroTik API по умолчанию',
  },
  {
    name: 'MIKROTIK_DEFAULT_TIMEOUT',
    required: false,
    type: 'number',
    defaultValue: 10000,
    description: 'Таймаут MikroTik API (мс)',
  },
  {
    name: 'MIKROTIK_HEALTH_CHECK_INTERVAL',
    required: false,
    type: 'number',
    defaultValue: 300000,
    description: 'Интервал проверки здоровья MikroTik (мс)',
  },
  {
    name: 'MIKROTIK_MAX_RETRIES',
    required: false,
    type: 'number',
    defaultValue: 3,
    description: 'Максимум попыток подключения к MikroTik',
  },
  {
    name: 'MIKROTIK_RETRY_DELAY',
    required: false,
    type: 'number',
    defaultValue: 5000,
    description: 'Задержка между попытками подключения к MikroTik (мс)',
  },

  // Мониторинг
  {
    name: 'ZABBIX_URL',
    required: false,
    type: 'url',
    defaultValue: 'http://localhost/zabbix',
    description: 'URL Zabbix сервера',
  },
  {
    name: 'GRAFANA_URL',
    required: false,
    type: 'url',
    defaultValue: 'http://localhost/grafana',
    description: 'URL Grafana',
  },
  {
    name: 'HEALTH_CHECK_INTERVAL',
    required: false,
    type: 'number',
    defaultValue: 30000,
    description: 'Интервал health check (мс)',
  },
  {
    name: 'METRICS_RETENTION_DAYS',
    required: false,
    type: 'number',
    defaultValue: 30,
    description: 'Срок хранения метрик (дни)',
  },

  // Логирование
  {
    name: 'LOG_LEVEL',
    required: false,
    type: 'string',
    defaultValue: 'info',
    validator: (value) => ['error', 'warn', 'info', 'debug'].includes(value),
    description: 'Уровень логирования',
  },
  {
    name: 'LOG_MAX_FILES',
    required: false,
    type: 'number',
    defaultValue: 10,
    description: 'Максимум файлов логов',
  },
  {
    name: 'LOG_MAX_SIZE',
    required: false,
    type: 'string',
    defaultValue: '10m',
    description: 'Максимальный размер файла лога',
  },
  {
    name: 'LOG_ENABLE_CONSOLE',
    required: false,
    type: 'boolean',
    defaultValue: true,
    description: 'Включить логирование в консоль',
  },
  {
    name: 'LOG_ENABLE_FILE',
    required: false,
    type: 'boolean',
    defaultValue: true,
    description: 'Включить логирование в файл',
  },
  {
    name: 'LOG_DIRECTORY',
    required: false,
    type: 'string',
    defaultValue: 'logs',
    description: 'Директория для логов',
  },
  {
    name: 'AUDIT_RETENTION_DAYS',
    required: false,
    type: 'number',
    defaultValue: 90,
    description: 'Срок хранения аудит логов (дни)',
  },

  // Dashboard
  {
    name: 'DASHBOARD_CACHE_TTL',
    required: false,
    type: 'number',
    defaultValue: 300,
    description: 'TTL кеша dashboard (секунды)',
  },
  {
    name: 'DASHBOARD_CACHE_CLEANUP_INTERVAL',
    required: false,
    type: 'number',
    defaultValue: 300000,
    description: 'Интервал очистки кеша dashboard (мс)',
  },
  {
    name: 'DASHBOARD_MAX_ACTIVITY',
    required: false,
    type: 'number',
    defaultValue: 50,
    description: 'Максимум записей активности в dashboard',
  },
  {
    name: 'DASHBOARD_MAX_TOP_CLIENTS',
    required: false,
    type: 'number',
    defaultValue: 50,
    description: 'Максимум топ клиентов в dashboard',
  },
  {
    name: 'DASHBOARD_MAX_LOW_BALANCE',
    required: false,
    type: 'number',
    defaultValue: 50,
    description: 'Максимум клиентов с низким балансом в dashboard',
  },
  {
    name: 'DASHBOARD_LOW_BALANCE_THRESHOLD',
    required: false,
    type: 'number',
    defaultValue: 100,
    description: 'Порог низкого баланса для dashboard',
  },
  {
    name: 'DASHBOARD_MAX_DATE_RANGE_DAYS',
    required: false,
    type: 'number',
    defaultValue: 365,
    description: 'Максимальный диапазон дат для dashboard (дни)',
  },

  // Уведомления
  {
    name: 'NOTIFICATION_RETRY_ATTEMPTS',
    required: false,
    type: 'number',
    defaultValue: 3,
    description: 'Количество попыток отправки уведомлений',
  },
  {
    name: 'NOTIFICATION_RETRY_DELAY',
    required: false,
    type: 'number',
    defaultValue: 5000,
    description: 'Задержка между попытками отправки уведомлений (мс)',
  },
];

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of envRules) {
    const value = process.env[rule.name];

    // Проверка обязательных переменных
    if (rule.required && !value) {
      errors.push(`Отсутствует обязательная переменная окружения: ${rule.name}${rule.description ? ` (${rule.description})` : ''}`);
      continue;
    }

    // Если переменная не задана и есть значение по умолчанию
    if (!value && rule.defaultValue !== undefined) {
      warnings.push(`Используется значение по умолчанию для ${rule.name}: ${rule.defaultValue}${rule.description ? ` (${rule.description})` : ''}`);
      continue;
    }

    // Если переменная задана, проверяем её
    if (value) {
      // Проверка типа
      if (!validateType(value, rule.type)) {
        errors.push(`Неверный тип для ${rule.name}. Ожидается: ${rule.type}, получено: ${value}`);
        continue;
      }

      // Кастомная валидация
      if (rule.validator && !rule.validator(value)) {
        errors.push(`Неверное значение для ${rule.name}: ${value}${rule.description ? ` (${rule.description})` : ''}`);
        continue;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateType(value: string, type: EnvValidationRule['type']): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string' && value.length > 0;
    
    case 'number':
      return !isNaN(Number(value)) && isFinite(Number(value));
    
    case 'boolean':
      return ['true', 'false', '1', '0'].includes(value.toLowerCase());
    
    case 'url':
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    
    case 'json':
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    
    default:
      return true;
  }
}

export function printValidationResults(result: ValidationResult): void {
  if (result.warnings.length > 0) {
    console.warn('⚠️  Предупреждения конфигурации:');
    result.warnings.forEach(warning => console.warn(`   ${warning}`));
    console.warn('');
  }

  if (result.errors.length > 0) {
    console.error('❌ Ошибки конфигурации:');
    result.errors.forEach(error => console.error(`   ${error}`));
    console.error('');
    console.error('Приложение не может быть запущено с некорректной конфигурацией.');
    process.exit(1);
  }

  if (result.warnings.length === 0 && result.errors.length === 0) {
    console.log('✅ Конфигурация окружения валидна');
  }
}

// Автоматическая валидация при импорте модуля
const validationResult = validateEnvironment();
printValidationResults(validationResult);