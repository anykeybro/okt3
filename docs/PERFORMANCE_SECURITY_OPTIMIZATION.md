# Оптимизация производительности и безопасности

Этот документ описывает реализованные меры по оптимизации производительности и повышению безопасности биллинг-системы OK-Telecom.

## 1. Индексы MongoDB

### Созданные индексы

Для оптимизации производительности базы данных созданы следующие индексы:

#### SystemUser (Системные пользователи)
- `username` (уникальный) - для быстрого поиска по логину
- `isActive` - для фильтрации активных пользователей

#### Client (Клиенты)
- `phones` - для поиска по номерам телефонов
- `email` (разреженный) - для поиска по email
- `telegramId` (разреженный) - для поиска по Telegram ID
- `createdAt` (убывающий) - для сортировки по дате создания

#### Account (Лицевые счета)
- `accountNumber` (уникальный) - для поиска по номеру счета
- `clientId` - для получения счетов клиента
- `status` - для фильтрации по статусу
- `balance` - для сортировки по балансу
- `macAddress` (разреженный) - для поиска по MAC адресу
- `tariffId` - для группировки по тарифам
- `status + balance` (составной) - для поиска активных счетов с низким балансом

#### Payment (Платежи)
- `accountId` - для получения платежей по счету
- `status` - для фильтрации по статусу
- `source` - для группировки по источнику
- `externalId` (разреженный) - для поиска по внешнему ID
- `createdAt` (убывающий) - для сортировки по дате
- `status + createdAt` (составной) - для отчетов
- `accountId + createdAt` (составной) - для истории платежей

#### AuditLog (Журнал аудита)
- `userId` - для поиска действий пользователя
- `action` - для фильтрации по типу действия
- `resource` - для фильтрации по ресурсу
- `createdAt` (убывающий) - для сортировки по дате
- `userId + createdAt` (составной) - для истории пользователя
- TTL индекс на `createdAt` - автоматическое удаление через 1 год

### Запуск создания индексов

```bash
# Подключение к MongoDB и выполнение скрипта
mongosh --file scripts/create-indexes.js
```

## 2. Система кеширования

### Redis кеширование

Реализована система кеширования с использованием Redis для часто запрашиваемых данных:

#### Кешируемые данные
- Статистика дашборда (TTL: 1 минута)
- Активные тарифы (TTL: 1 час)
- Информация о клиентах (TTL: 30 минут)
- Статус устройств (TTL: 5 минут)
- Шаблоны уведомлений (TTL: 2 часа)

#### Использование

```typescript
import { cacheService } from './common/cache/cache.service';
import { Cacheable, CacheEvict } from './common/cache/cache.decorator';

// Кеширование метода
@Cacheable({
  keyPrefix: 'dashboard:stats',
  ttlSeconds: 60
})
async getDashboardStats() {
  // Логика получения данных
}

// Инвалидация кеша
@CacheEvict({
  keyPattern: 'clients:*'
})
async updateClient(id: string, data: any) {
  // Логика обновления
}
```

### Настройки кеширования

```bash
# .env.development
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_DEFAULT_TTL=300
CACHE_DASHBOARD_TTL=60
CACHE_TARIFFS_TTL=3600
```

## 3. Валидация и санитизация данных

### Middleware валидации

Реализована комплексная система валидации входных данных:

#### Основные компоненты
- `validation.middleware.ts` - основные middleware для валидации
- `common.validators.ts` - переиспользуемые валидаторы
- Автоматическая санитизация всех входных данных

#### Защита от атак
- **XSS**: Удаление HTML тегов и скриптов
- **SQL Injection**: Фильтрация SQL паттернов
- **NoSQL Injection**: Удаление специальных символов MongoDB
- **Path Traversal**: Проверка путей файлов

#### Пример использования

```typescript
import { validate, validateId, validatePhone } from './common/validators';

router.post('/clients',
  validate([
    validateName('firstName'),
    validateName('lastName'),
    validatePhone('phone'),
    validateOptionalEmail('email')
  ]),
  clientController.create
);
```

### Ограничения запросов

- Максимальный размер запроса: 1MB
- Проверка Content-Type
- Валидация всех параметров

## 4. Безопасность и HTTPS

### Заголовки безопасности (Helmet)

Настроены следующие заголовки безопасности:

```typescript
// Content Security Policy
defaultSrc: ["'self'"]
styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]
scriptSrc: ["'self'"]
frameSrc: ["'none'"]
objectSrc: ["'none'"]

// HSTS
maxAge: 31536000 (1 год)
includeSubDomains: true
preload: true

// Дополнительные заголовки
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

### Rate Limiting

Реализовано ограничение частоты запросов:

#### Общий лимит
- 100 запросов за 15 минут с одного IP
- Использование Redis для хранения счетчиков
- Автоматическая блокировка при превышении

#### Специальный лимит для аутентификации
- 5 попыток входа за 15 минут
- Блокировка IP при превышении
- Логирование подозрительной активности

#### Замедление запросов
- Постепенное увеличение задержки после 50 запросов
- Максимальная задержка: 20 секунд

### HTTPS принуждение

```typescript
// Автоматическое перенаправление на HTTPS в продакшене
if (process.env.NODE_ENV === 'production') {
  if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.get('host')}${req.url}`);
  }
}
```

### CSRF защита

- Проверка Origin и Referer заголовков
- Валидация для POST, PUT, DELETE запросов
- Блокировка подозрительных запросов

### Блокировка IP адресов

```typescript
// Блокировка вредоносных IP
await blockIp('192.168.1.100', 3600); // на 1 час

// Проверка заблокированных IP
const isBlocked = await cacheService.exists(`blocked_ip:${clientIp}`);
```

## 5. Система аудита

### Журнал аудита

Реализована комплексная система аудита действий администраторов:

#### Отслеживаемые действия
- Вход/выход из системы
- Создание, изменение, удаление записей
- Изменение настроек системы
- Операции с платежами
- Управление пользователями

#### Сохраняемая информация
- ID пользователя и его роль
- Тип действия и ресурс
- Старые и новые значения
- IP адрес и User Agent
- Временная метка
- Дополнительные метаданные

#### Автоматический аудит

```typescript
// Декоратор для автоматического аудита
@Audit({
  action: 'client_update',
  resource: 'client',
  captureOldValues: true
})
async updateClient(req: Request, res: Response) {
  // Логика обновления клиента
}
```

### API аудита

#### Получение журнала
```
GET /api/audit/logs?page=1&limit=50&userId=xxx&action=login
```

#### Статистика аудита
```
GET /api/audit/stats?period=day
```

#### Очистка старых записей
```
POST /api/audit/cleanup
{
  "retentionDays": 90
}
```

### Автоматическая очистка

- TTL индекс в MongoDB для автоматического удаления записей через 1 год
- Ручная очистка через API
- Настраиваемый период хранения

## 6. Мониторинг безопасности

### Логирование подозрительной активности

Автоматическое обнаружение и логирование:
- Path traversal попыток (`../`)
- XSS атак (`<script>`)
- SQL injection (`union select`)
- JavaScript injection (`javascript:`)
- Подозрительных User Agent

### Метрики безопасности

- Количество заблокированных IP
- Частота неудачных попыток входа
- Подозрительные запросы
- Превышения rate limit

### Интеграция с Zabbix

Настроены алерты для:
- Превышения порога ошибок аутентификации
- Массовых атак на API
- Подозрительной активности
- Превышения лимитов запросов

## 7. Настройки производительности

### Оптимизация запросов

- Использование индексов для всех частых запросов
- Пагинация для больших списков
- Агрегация данных на уровне БД
- Кеширование результатов

### Оптимизация памяти

- Ограничение размера результатов запросов
- Streaming для больших данных
- Очистка неиспользуемых соединений
- Мониторинг использования памяти

### Настройки соединений

```typescript
// MongoDB
maxPoolSize: 10
serverSelectionTimeoutMS: 5000

// Redis
connectTimeout: 10000
lazyConnect: true
maxRetriesPerRequest: 3
```

## 8. Рекомендации по развертыванию

### Продакшн настройки

```bash
# Безопасность
NODE_ENV=production
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=86400000
REQUIRE_PASSWORD_COMPLEXITY=true

# Rate limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
MAX_LOGIN_ATTEMPTS=5

# Кеширование
REDIS_HOST=redis-server
REDIS_PASSWORD=strong_password
CACHE_DEFAULT_TTL=300
```

### SSL/TLS сертификаты

```nginx
# Nginx конфигурация
ssl_certificate /path/to/certificate.crt;
ssl_certificate_key /path/to/private.key;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
```

### Мониторинг

- Настройка Zabbix для мониторинга безопасности
- Grafana дашборды для метрик производительности
- Алерты при превышении порогов
- Регулярные проверки логов аудита

## 9. Регулярное обслуживание

### Еженедельные задачи
- Анализ логов безопасности
- Проверка заблокированных IP
- Обновление правил rate limiting

### Ежемесячные задачи
- Очистка старых записей аудита
- Анализ статистики атак
- Обновление индексов БД
- Проверка производительности

### Ежегодные задачи
- Аудит безопасности системы
- Обновление сертификатов
- Ревизия прав доступа
- Тестирование восстановления

## 10. Контакты и поддержка

При возникновении вопросов по безопасности или производительности:

1. Проверьте логи в `/logs/security.log`
2. Используйте Grafana дашборды для анализа метрик
3. Обратитесь к документации по конкретным модулям
4. Создайте issue в системе управления задачами