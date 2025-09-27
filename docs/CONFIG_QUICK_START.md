# Быстрый старт - Система конфигурации

## Обзор

Краткое руководство по использованию системы конфигурации OK-Telecom Billing System.

## Быстрый старт

### 1. Настройка переменных окружения

```bash
# Скопируйте пример файла
cp .env.development.example .env.development

# Заполните обязательные переменные
nano .env.development
```

### 2. Валидация конфигурации

```bash
# Проверка конфигурации
yarn workspace app-server validate-env

# Генерация примера .env файла
yarn workspace app-server generate-env-example
```

### 3. Использование в коде

#### app-server
```typescript
import { config } from './config/config';

// Настройки сервера
const port = config.server.port;
const dbUrl = config.database.url;

// Внешние сервисы
const telegramToken = config.notifications.telegram.botToken;
```

#### app-web
```typescript
import { config } from '@/shared/config/config';

// API настройки
const apiUrl = config.api.baseUrl;
const timeout = config.api.timeout;
```

#### app-web-billing
```typescript
import { config } from '@/shared/config/config';

// Пагинация
const pageSize = config.pagination.defaultPageSize;
const maxSize = config.pagination.maxPageSize;
```

#### shared
```typescript
import { sharedConfig } from '@workspace/shared';

// Статусы
const accountStatuses = sharedConfig.statuses.account;
const roles = sharedConfig.roles;
```

## Обязательные переменные

### Минимальный набор для запуска

```bash
# База данных
DATABASE_URL=mongodb://admin:password@localhost:27017/app_database?authSource=admin

# JWT
JWT_SECRET=your_jwt_secret_minimum_32_characters_long

# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# SMS Gateway
SMS_GATEWAY_IP=192.168.1.100
SMS_GATEWAY_USERNAME=admin
SMS_GATEWAY_PASSWORD=admin

# Robokassa
ROBOKASSA_MERCHANT_ID=your_merchant_id
ROBOKASSA_PASSWORD1=your_password1
ROBOKASSA_PASSWORD2=your_password2

# Yandex Maps
YANDEX_MAPS_API_KEY=your_yandex_maps_api_key
NEXT_PUBLIC_YANDEX_MAPS_API_KEY=your_yandex_maps_api_key
```

## Частые проблемы

### ❌ JWT_SECRET слишком короткий
```
Ошибка: JWT_SECRET должен содержать минимум 32 символа
Решение: Сгенерируйте длинный случайный ключ
```

### ❌ Неверный формат DATABASE_URL
```
Ошибка: DATABASE_URL должен быть валидным URL
Решение: mongodb://user:pass@host:port/database?options
```

### ❌ Неверный токен Telegram
```
Ошибка: TELEGRAM_BOT_TOKEN должен соответствовать формату
Решение: Получите токен от @BotFather в Telegram
```

## Полезные команды

```bash
# Валидация всех окружений
yarn workspace app-server validate-env:dev
yarn workspace app-server validate-env:prod

# Генерация .env примера
yarn workspace app-server generate-env-example

# Проверка конфигурации в runtime
node -e "require('./packages/app-server/dist/config/config')"
```

## Дополнительная информация

- [Полная документация по конфигурации](./CONFIGURATION.md)
- [Архитектура системы](./ARCHITECTURE.md)
- [Руководство разработчика](./DEVELOPMENT_GUIDE.md)