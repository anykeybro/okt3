# Документация по конфигурации системы

## Обзор

Биллинг-система OK-Telecom использует декларативный подход к конфигурации. Все настраиваемые параметры вынесены в файлы конфигурации (`config.ts`) в каждом пакете и переменные окружения.

## Структура конфигурации

### Пакеты и их конфигурации

```
packages/
├── app-server/src/config/
│   ├── config.ts           # Основная конфигурация API сервера
│   └── env-validator.ts    # Валидатор переменных окружения
├── app-web/src/shared/config/
│   └── config.ts           # Конфигурация публичного сайта
├── app-web-billing/src/shared/config/
│   └── config.ts           # Конфигурация административной панели
├── app/src/config/
│   └── config.ts           # Конфигурация Telegram бота
└── shared/src/config/
    └── config.ts           # Общие константы и типы
```

## Переменные окружения

### Файлы окружения

- `.env.development` - для разработки
- `.env.production` - для продакшена

### Основные группы переменных

#### База данных
```bash
DATABASE_URL=mongodb://admin:password@localhost:27017/app_database?authSource=admin
DB_MAX_POOL_SIZE=10
DB_TIMEOUT=5000
```

#### Сервер
```bash
PORT=3001
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:3002
```

#### JWT аутентификация
```bash
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

#### Kafka
```bash
KAFKA_BROKERS=localhost:29092
KAFKA_CLIENT_ID=app-server
KAFKA_GROUP_ID=billing-group
```

#### Telegram Bot
```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/telegram/webhook
```

#### SMS Gateway (Huawei E3372)
```bash
SMS_GATEWAY_IP=192.168.1.100
SMS_GATEWAY_USERNAME=admin
SMS_GATEWAY_PASSWORD=admin
SMS_GATEWAY_PORT=80
```

#### Robokassa
```bash
ROBOKASSA_MERCHANT_ID=your_merchant_id
ROBOKASSA_PASSWORD1=your_password1
ROBOKASSA_PASSWORD2=your_password2
ROBOKASSA_TEST_MODE=true
```

#### Yandex Maps
```bash
YANDEX_MAPS_API_KEY=your_yandex_maps_api_key
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=your_yandex_maps_api_key
```

#### Биллинг
```bash
BILLING_CHECK_INTERVAL=3600000
BILLING_AUTO_BLOCK=true
DEFAULT_BLOCK_THRESHOLD=0
```

#### Безопасность
```bash
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

#### MikroTik
```bash
MIKROTIK_DEFAULT_PORT=8728
MIKROTIK_DEFAULT_TIMEOUT=10000
MIKROTIK_HEALTH_CHECK_INTERVAL=300000
MIKROTIK_MAX_RETRIES=3
MIKROTIK_RETRY_DELAY=5000
```

#### Мониторинг
```bash
ZABBIX_URL=http://localhost/zabbix
GRAFANA_URL=http://localhost/grafana
HEALTH_CHECK_INTERVAL=30000
METRICS_RETENTION_DAYS=30
```

#### Логирование
```bash
LOG_LEVEL=debug
LOG_MAX_FILES=10
LOG_MAX_SIZE=10m
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_FILE=true
LOG_DIRECTORY=logs
AUDIT_RETENTION_DAYS=90
```

#### Dashboard
```bash
DASHBOARD_CACHE_TTL=300
DASHBOARD_CACHE_CLEANUP_INTERVAL=300000
DASHBOARD_MAX_ACTIVITY=50
DASHBOARD_MAX_TOP_CLIENTS=50
DASHBOARD_MAX_LOW_BALANCE=50
DASHBOARD_LOW_BALANCE_THRESHOLD=100
DASHBOARD_MAX_DATE_RANGE_DAYS=365
```

#### Уведомления
```bash
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=5000
```

## Валидация конфигурации

### Автоматическая валидация

Система автоматически валидирует переменные окружения при запуске:

- **Обязательные переменные**: Проверяется их наличие
- **Типы данных**: Проверяется соответствие ожидаемому типу
- **Форматы**: Проверяется корректность URL, email, регулярных выражений
- **Диапазоны**: Проверяется соответствие допустимым значениям

### Результаты валидации

При запуске приложения выводятся:
- ✅ Успешная валидация
- ⚠️ Предупреждения (используются значения по умолчанию)
- ❌ Ошибки (приложение не запустится)

### Пример вывода валидации

```
⚠️  Предупреждения конфигурации:
   Используется значение по умолчанию для BCRYPT_ROUNDS: 12 (Количество раундов bcrypt (10-15))
   Используется значение по умолчанию для LOG_LEVEL: info (Уровень логирования)

✅ Конфигурация окружения валидна
```

## Конфигурационные файлы

### app-server/config.ts

Основная конфигурация API сервера, включает:

- Настройки сервера (порт, хост, CORS)
- Подключение к базе данных
- Kafka настройки
- JWT конфигурация
- Настройки внешних сервисов
- Биллинговые параметры
- Мониторинг и логирование

### app-web/config.ts

Конфигурация публичного сайта и личного кабинета:

- API endpoints
- Аутентификация клиентов
- Платежная система
- UI настройки
- Валидация форм
- Карты и геолокация

### app-web-billing/config.ts

Конфигурация административной панели:

- API endpoints
- Аутентификация администраторов
- Пагинация и таблицы
- Dashboard настройки
- Формы и валидация
- Безопасность и аудит

### app/config.ts

Конфигурация Telegram бота:

- Telegram API настройки
- Аутентификация пользователей
- Кеширование данных
- Форматирование сообщений
- Команды и интерфейс

### shared/config.ts

Общие константы и типы:

- Статусы системы
- Типы сервисов и биллинга
- Роли и права доступа
- Валидационные правила
- Форматы данных
- Цветовая схема

## Настройка окружения

### Разработка

1. Скопируйте `.env.development.example` в `.env.development`
2. Заполните необходимые переменные
3. Запустите валидацию: `yarn workspace app-server validate-env`

### Продакшен

1. Создайте `.env.production` с продакшенными значениями
2. Убедитесь, что все обязательные переменные заданы
3. Проверьте безопасность (длинные пароли, секретные ключи)
4. Запустите валидацию перед деплоем

## Безопасность конфигурации

### Чувствительные данные

Никогда не коммитьте в репозиторий:
- Пароли и секретные ключи
- API токены
- Данные подключения к БД
- Сертификаты

### Рекомендации

1. **JWT_SECRET**: Минимум 32 символа, случайная строка
2. **Пароли БД**: Сложные пароли, регулярная смена
3. **API ключи**: Ограничение по IP и доменам
4. **BCRYPT_ROUNDS**: 12-15 для баланса безопасности/производительности
5. **Rate Limiting**: Настройка под нагрузку

## Мониторинг конфигурации

### Health Checks

Система автоматически проверяет:
- Доступность внешних сервисов
- Корректность настроек
- Производительность компонентов

### Метрики

Отслеживаются:
- Время отклика API
- Использование ресурсов
- Ошибки конфигурации
- Статус внешних интеграций

## Troubleshooting

### Частые проблемы

1. **Ошибка подключения к БД**
   - Проверьте DATABASE_URL
   - Убедитесь, что MongoDB запущен
   - Проверьте права доступа

2. **JWT ошибки**
   - Проверьте длину JWT_SECRET
   - Убедитесь в корректности времени жизни токенов

3. **Kafka недоступен**
   - Проверьте KAFKA_BROKERS
   - Убедитесь, что Kafka запущен

4. **Внешние API недоступны**
   - Проверьте API ключи
   - Убедитесь в доступности сервисов

### Логи конфигурации

Все проблемы конфигурации логируются с уровнем ERROR:
```
[ERROR] Configuration validation failed: Missing required environment variable: JWT_SECRET
[WARN] Using default value for LOG_LEVEL: info
```

## Примеры использования

### Добавление новой переменной

1. Добавьте в `.env.development` и `.env.production`:
```bash
NEW_FEATURE_ENABLED=true
```

2. Добавьте в `env-validator.ts`:
```typescript
{
  name: 'NEW_FEATURE_ENABLED',
  required: false,
  type: 'boolean',
  defaultValue: false,
  description: 'Включить новую функцию',
}
```

3. Добавьте в `config.ts`:
```typescript
features: {
  newFeature: process.env.NEW_FEATURE_ENABLED === 'true',
}
```

### Изменение значения по умолчанию

1. Обновите `defaultValue` в `env-validator.ts`
2. Обновите соответствующее значение в `config.ts`
3. Обновите документацию

### Добавление валидации

```typescript
{
  name: 'CUSTOM_PORT',
  required: true,
  type: 'number',
  validator: (value) => {
    const port = parseInt(value);
    return port >= 1024 && port <= 65535;
  },
  description: 'Порт должен быть в диапазоне 1024-65535',
}
```

## Заключение

Система конфигурации обеспечивает:
- Централизованное управление настройками
- Автоматическую валидацию
- Безопасность чувствительных данных
- Гибкость настройки под разные окружения
- Простоту добавления новых параметров

Следуйте этой документации для корректной настройки и сопровождения системы.