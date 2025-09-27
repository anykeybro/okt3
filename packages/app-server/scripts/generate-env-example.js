#!/usr/bin/env node

/**
 * Скрипт для генерации примера .env файла на основе валидационных правил
 * Использование: node scripts/generate-env-example.js [--output=path]
 */

const fs = require('fs');
const path = require('path');

// Импортируем правила валидации (нужно скомпилировать TypeScript)
const envRulesPath = path.join(__dirname, '../dist/config/env-validator.js');

if (!fs.existsSync(envRulesPath)) {
  console.error('❌ Сначала скомпилируйте проект: yarn build');
  process.exit(1);
}

// Парсим аргументы
const args = process.argv.slice(2);
const outputArg = args.find(arg => arg.startsWith('--output='));
const outputPath = outputArg 
  ? outputArg.split('=')[1] 
  : path.join(__dirname, '../../../../.env.example');

console.log('🔧 Генерация примера .env файла...');
console.log(`📁 Выходной файл: ${outputPath}`);

// Загружаем правила валидации
let envRules;
try {
  // Временно подавляем вывод валидатора
  const originalConsole = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  
  delete require.cache[envRulesPath];
  envRules = require(envRulesPath);
  
  // Восстанавливаем консоль
  console.log = originalConsole;
  console.error = originalError;
  console.warn = originalWarn;
} catch (error) {
  console.error(`❌ Ошибка загрузки правил валидации: ${error.message}`);
  process.exit(1);
}

// Группируем переменные по категориям
const categories = {
  'База данных': ['DATABASE_URL', 'DB_MAX_POOL_SIZE', 'DB_TIMEOUT'],
  'Сервер': ['PORT', 'HOST', 'NODE_ENV', 'CORS_ORIGIN'],
  'JWT': ['JWT_SECRET', 'JWT_EXPIRES_IN', 'JWT_REFRESH_EXPIRES_IN'],
  'Kafka': ['KAFKA_BROKERS', 'KAFKA_CLIENT_ID', 'KAFKA_GROUP_ID'],
  'Telegram': ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_URL'],
  'SMS Gateway': ['SMS_GATEWAY_IP', 'SMS_GATEWAY_USERNAME', 'SMS_GATEWAY_PASSWORD', 'SMS_GATEWAY_PORT'],
  'Robokassa': ['ROBOKASSA_MERCHANT_ID', 'ROBOKASSA_PASSWORD1', 'ROBOKASSA_PASSWORD2', 'ROBOKASSA_TEST_MODE'],
  'Yandex Maps': ['YANDEX_MAPS_API_KEY'],
  'Биллинг': ['BILLING_CHECK_INTERVAL', 'BILLING_AUTO_BLOCK', 'DEFAULT_BLOCK_THRESHOLD'],
  'Безопасность': ['BCRYPT_ROUNDS', 'RATE_LIMIT_WINDOW', 'RATE_LIMIT_MAX'],
  'MikroTik': ['MIKROTIK_DEFAULT_PORT', 'MIKROTIK_DEFAULT_TIMEOUT', 'MIKROTIK_HEALTH_CHECK_INTERVAL', 'MIKROTIK_MAX_RETRIES', 'MIKROTIK_RETRY_DELAY'],
  'Мониторинг': ['ZABBIX_URL', 'GRAFANA_URL', 'HEALTH_CHECK_INTERVAL', 'METRICS_RETENTION_DAYS'],
  'Логирование': ['LOG_LEVEL', 'LOG_MAX_FILES', 'LOG_MAX_SIZE', 'LOG_ENABLE_CONSOLE', 'LOG_ENABLE_FILE', 'LOG_DIRECTORY', 'AUDIT_RETENTION_DAYS'],
  'Dashboard': ['DASHBOARD_CACHE_TTL', 'DASHBOARD_CACHE_CLEANUP_INTERVAL', 'DASHBOARD_MAX_ACTIVITY', 'DASHBOARD_MAX_TOP_CLIENTS', 'DASHBOARD_MAX_LOW_BALANCE', 'DASHBOARD_LOW_BALANCE_THRESHOLD', 'DASHBOARD_MAX_DATE_RANGE_DAYS'],
  'Уведомления': ['NOTIFICATION_RETRY_ATTEMPTS', 'NOTIFICATION_RETRY_DELAY'],
};

// Создаем содержимое файла
let content = `# Пример файла переменных окружения для OK-Telecom Billing System
# Скопируйте этот файл в .env.development или .env.production и заполните значения

`;

// Получаем все правила валидации
const allRules = [];
try {
  // Пытаемся получить правила из экспорта модуля
  const validator = require(envRulesPath);
  if (validator.envRules) {
    allRules.push(...validator.envRules);
  }
} catch (error) {
  console.warn('⚠️  Не удалось получить правила валидации из модуля');
}

// Если не удалось получить правила, создаем базовый набор
if (allRules.length === 0) {
  console.warn('⚠️  Используется базовый набор переменных');
  
  // Базовый набор переменных
  const basicVars = [
    { name: 'DATABASE_URL', required: true, description: 'URL подключения к MongoDB' },
    { name: 'JWT_SECRET', required: true, description: 'Секретный ключ для JWT' },
    { name: 'TELEGRAM_BOT_TOKEN', required: true, description: 'Токен Telegram бота' },
    { name: 'SMS_GATEWAY_IP', required: true, description: 'IP адрес SMS шлюза' },
    { name: 'ROBOKASSA_MERCHANT_ID', required: true, description: 'ID мерчанта Robokassa' },
    { name: 'YANDEX_MAPS_API_KEY', required: true, description: 'API ключ Yandex Maps' },
  ];
  
  allRules.push(...basicVars);
}

// Создаем индекс правил по имени
const rulesIndex = {};
allRules.forEach(rule => {
  rulesIndex[rule.name] = rule;
});

// Генерируем содержимое по категориям
Object.entries(categories).forEach(([categoryName, varNames]) => {
  content += `# ${categoryName}\n`;
  
  varNames.forEach(varName => {
    const rule = rulesIndex[varName];
    if (rule) {
      // Добавляем комментарий с описанием
      if (rule.description) {
        content += `# ${rule.description}\n`;
      }
      
      // Добавляем информацию об обязательности
      if (rule.required) {
        content += `# ОБЯЗАТЕЛЬНАЯ ПЕРЕМЕННАЯ\n`;
      }
      
      // Добавляем значение
      let value = '';
      if (rule.defaultValue !== undefined) {
        value = rule.defaultValue.toString();
      } else if (rule.required) {
        // Для обязательных переменных добавляем placeholder
        switch (rule.type) {
          case 'url':
            value = 'https://example.com';
            break;
          case 'email':
            value = 'user@example.com';
            break;
          case 'string':
            if (varName.includes('PASSWORD') || varName.includes('SECRET') || varName.includes('TOKEN')) {
              value = 'your_secret_value_here';
            } else {
              value = 'your_value_here';
            }
            break;
          case 'number':
            value = '0';
            break;
          case 'boolean':
            value = 'false';
            break;
          default:
            value = 'your_value_here';
        }
      }
      
      content += `${varName}=${value}\n\n`;
    } else {
      // Если правило не найдено, добавляем базовую запись
      content += `${varName}=\n\n`;
    }
  });
  
  content += '\n';
});

// Записываем файл
try {
  fs.writeFileSync(outputPath, content, 'utf8');
  console.log('✅ Пример .env файла успешно создан!');
  console.log(`📄 Файл: ${outputPath}`);
  console.log('');
  console.log('📝 Следующие шаги:');
  console.log('1. Скопируйте файл в .env.development или .env.production');
  console.log('2. Заполните все обязательные переменные');
  console.log('3. Запустите валидацию: yarn workspace app-server validate-env');
} catch (error) {
  console.error(`❌ Ошибка записи файла: ${error.message}`);
  process.exit(1);
}