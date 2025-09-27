# Система мониторинга и логирования

## Обзор

Система мониторинга и логирования OK-Telecom обеспечивает комплексный контроль за состоянием приложения, сбор метрик и структурированное логирование всех событий системы.

## Компоненты системы

### 1. Логирование (Winston)

Система использует Winston для структурированного логирования с поддержкой различных уровней и транспортов.

#### Уровни логирования
- `error` - Критические ошибки
- `warn` - Предупреждения
- `info` - Информационные сообщения
- `http` - HTTP запросы
- `debug` - Отладочная информация

#### Транспорты
- **Console** - Вывод в консоль с цветовой подсветкой
- **File** - Запись в файлы (`logs/combined.log`, `logs/error.log`)

#### Использование

```typescript
import { mainLogger } from '../common/logger';

// Простое логирование
mainLogger.info('Пользователь создан');
mainLogger.error('Ошибка подключения к базе данных', error);

// Структурированное логирование с контекстом
const logger = mainLogger.child({ module: 'auth', userId: 'user-123' });
logger.info('Пользователь авторизован', { ip: '192.168.1.1' });

// Бизнес-события
mainLogger.logBusinessEvent('payment_completed', { 
  accountId: 'acc-123', 
  amount: 1000 
});

// Аудит действий администраторов
mainLogger.logAudit('create_user', 'admin-123', 'users', 'user-456', {
  changes: { name: 'John Doe', email: 'john@example.com' }
});
```

### 2. Сбор метрик

Система автоматически собирает различные типы метрик:

#### Системные метрики
- Использование памяти (heap)
- Загрузка CPU
- Время работы (uptime)
- Количество активных соединений
- Запросы в минуту
- Ошибки в минуту

#### Бизнес-метрики
- Количество активных клиентов
- Количество заблокированных клиентов
- Выручка (общая, дневная, месячная)
- Количество платежей
- Новые заявки
- Статистика уведомлений

#### Метрики производительности
- Среднее время ответа
- Количество медленных запросов
- Процент ошибок
- Пропускная способность

### 3. Health Check эндпоинты

#### Базовые проверки

```bash
# Простая проверка доступности
GET /health

# Liveness probe (для Kubernetes)
GET /api/monitoring/health/live

# Readiness probe (для Kubernetes)
GET /api/monitoring/health/ready

# Полная проверка состояния с метриками
GET /api/monitoring/health?metrics=true
```

#### Детальные проверки

```bash
# Все метрики
GET /api/monitoring/metrics

# Системные метрики
GET /api/monitoring/metrics/system

# Бизнес-метрики
GET /api/monitoring/metrics/business

# Метрики производительности
GET /api/monitoring/metrics/performance
```

### 4. Алерты и уведомления

Система автоматически генерирует алерты при превышении пороговых значений:

- Использование памяти > 90%
- Количество ошибок > 10/мин
- Процент заблокированных клиентов > 20%
- Медленные запросы > 1000ms

```bash
# Получение текущих алертов
GET /api/monitoring/alerts
```

### 5. Интеграция с Zabbix

Система автоматически отправляет метрики в Zabbix для мониторинга:

```bash
# Принудительная отправка метрик
POST /api/monitoring/metrics/send-to-zabbix
```

#### Отправляемые элементы данных

**Системные метрики:**
- `system.uptime` - Время работы системы
- `system.memory.used` - Использованная память
- `system.memory.percentage` - Процент использования памяти
- `system.cpu.usage` - Загрузка CPU
- `system.requests_per_minute` - Запросов в минуту
- `system.errors_per_minute` - Ошибок в минуту

**Бизнес-метрики:**
- `business.active_clients` - Активные клиенты
- `business.blocked_clients` - Заблокированные клиенты
- `business.daily_revenue` - Дневная выручка
- `business.monthly_revenue` - Месячная выручка
- `business.payments_today` - Платежи за сегодня
- `business.new_requests_today` - Новые заявки за сегодня

**Статус сервисов:**
- `health.services_healthy` - Количество здоровых сервисов
- `health.services_total` - Общее количество сервисов
- `health.overall_status` - Общий статус системы (1 = здоров, 0 = нет)

## Конфигурация

### Переменные окружения

```bash
# Логирование
LOG_LEVEL=info                    # Уровень логирования
LOG_MAX_FILES=10                  # Максимальное количество файлов логов
LOG_MAX_SIZE=10m                  # Максимальный размер файла лога
LOG_ENABLE_CONSOLE=true           # Включить вывод в консоль
LOG_ENABLE_FILE=true              # Включить запись в файлы
LOG_DIRECTORY=logs                # Директория для логов
AUDIT_RETENTION_DAYS=90           # Срок хранения аудит логов

# Мониторинг
HEALTH_CHECK_INTERVAL=30000       # Интервал проверки здоровья (мс)
METRICS_RETENTION_DAYS=30         # Срок хранения метрик
ZABBIX_URL=http://localhost/zabbix # URL Zabbix сервера
GRAFANA_URL=http://localhost/grafana # URL Grafana

# Пороги для алертов
ALERT_MEMORY_THRESHOLD=90         # Порог использования памяти (%)
ALERT_CPU_THRESHOLD=80            # Порог загрузки CPU (%)
ALERT_ERROR_RATE=5                # Порог процента ошибок (%)
ALERT_RESPONSE_TIME=1000          # Порог времени ответа (мс)

# Rate Limiting
RATE_LIMIT_WINDOW=900000          # Окно rate limiting (15 мин)
RATE_LIMIT_MAX=100                # Максимум запросов в окне
```

### Конфигурация в коде

```typescript
// packages/app-server/src/config/config.ts
export const config = {
  monitoring: {
    zabbixUrl: process.env.ZABBIX_URL || 'http://localhost/zabbix',
    grafanaUrl: process.env.GRAFANA_URL || 'http://localhost/grafana',
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
    alertThresholds: {
      memoryUsage: parseFloat(process.env.ALERT_MEMORY_THRESHOLD || '90'),
      cpuUsage: parseFloat(process.env.ALERT_CPU_THRESHOLD || '80'),
      errorRate: parseFloat(process.env.ALERT_ERROR_RATE || '5'),
      responseTime: parseInt(process.env.ALERT_RESPONSE_TIME || '1000', 10),
    },
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '10', 10),
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    enableFile: process.env.LOG_ENABLE_FILE !== 'false',
    logDirectory: process.env.LOG_DIRECTORY || 'logs',
  },
};
```

## Rate Limiting

Система включает защиту от злоупотреблений через rate limiting:

### Типы ограничений

1. **Общий API** - 100 запросов за 15 минут
2. **Аутентификация** - 5 попыток за 15 минут
3. **Платежи** - 10 запросов в минуту

### Использование

```typescript
import { 
  apiRateLimiter, 
  authRateLimiter, 
  paymentRateLimiter 
} from '../common/middleware';

// Применение к маршрутам
router.use('/api', apiRateLimiter);
router.use('/api/auth/login', authRateLimiter);
router.use('/api/payments', paymentRateLimiter);
```

## Централизованная обработка ошибок

Система включает централизованную обработку всех типов ошибок:

### Типы ошибок

- `ValidationError` - Ошибки валидации (400)
- `NotFoundError` - Ресурс не найден (404)
- `UnauthorizedError` - Неавторизованный доступ (401)
- `ForbiddenError` - Недостаточно прав (403)
- `ExternalServiceError` - Ошибка внешнего сервиса (502)
- `InsufficientFundsError` - Недостаточно средств (400)

### Структура ответа об ошибке

```json
{
  "error": "Тип ошибки",
  "message": "Описание ошибки",
  "requestId": "unique-request-id",
  "errors": [] // Для ValidationError
}
```

## Аудит действий

Система ведет полный аудит всех действий администраторов:

```typescript
// Автоматический аудит через middleware
router.post('/users', 
  authMiddleware,
  auditLogger('create_user', 'users'),
  createUser
);

// Ручной аудит
req.logger.logAudit('update_tariff', userId, 'tariffs', tariffId, {
  oldPrice: 500,
  newPrice: 600
});
```

## Мониторинг в Grafana

Система интегрируется с Grafana для визуализации метрик:

### Доступ к Grafana
- URL: `http://localhost/grafana`
- Логин: `admin`
- Пароль: `admin` (для разработки)

### Основные дашборды

1. **Системные метрики**
   - Использование памяти и CPU
   - Количество запросов и ошибок
   - Время ответа API

2. **Бизнес-метрики**
   - Активные и заблокированные клиенты
   - Выручка по дням/месяцам
   - Статистика платежей и заявок

3. **Алерты**
   - Критические состояния системы
   - Превышение пороговых значений

## Логи и их анализ

### Структура логов

Все логи записываются в JSON формате для удобного анализа:

```json
{
  "timestamp": "2024-01-15 10:30:45:123",
  "level": "info",
  "message": "User authenticated",
  "requestId": "req-abc123",
  "userId": "user-456",
  "module": "auth",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "duration": 150
}
```

### Ротация логов

- Максимальный размер файла: 10MB
- Максимальное количество файлов: 10
- Автоматическое сжатие старых файлов

### Просмотр логов

```bash
# Последние логи
GET /api/monitoring/logs

# Фильтрация по уровню
GET /api/monitoring/logs?level=error&limit=100

# Через файловую систему
tail -f packages/app-server/logs/combined.log
tail -f packages/app-server/logs/error.log
```

## Производительность

### Оптимизации

1. **Асинхронный сбор метрик** - не блокирует основные операции
2. **Кеширование** - метрики кешируются для снижения нагрузки на БД
3. **Батчинг** - метрики отправляются пакетами в Zabbix
4. **Ротация данных** - старые метрики автоматически удаляются

### Мониторинг производительности

Система мониторит собственную производительность:
- Время выполнения health check'ов
- Время сбора метрик
- Использование ресурсов системой мониторинга

## Безопасность

### Защита эндпоинтов

- Все эндпоинты мониторинга требуют аутентификации
- Применяется RBAC для доступа к различным метрикам
- Rate limiting для предотвращения злоупотреблений

### Маскирование данных

- Чувствительные данные маскируются в логах
- Пароли и токены не логируются
- PII данные заменяются на плейсхолдеры

## Устранение неполадок

### Частые проблемы

1. **Логи не записываются**
   - Проверьте права доступа к директории `logs/`
   - Убедитесь что `LOG_ENABLE_FILE=true`

2. **Метрики не отправляются в Zabbix**
   - Проверьте доступность Zabbix сервера
   - Проверьте конфигурацию `ZABBIX_URL`

3. **Health check возвращает unhealthy**
   - Проверьте подключение к базе данных
   - Проверьте доступность внешних сервисов

### Диагностика

```bash
# Проверка состояния системы
curl http://localhost:3001/api/monitoring/health

# Проверка метрик
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/monitoring/metrics

# Проверка алертов
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/monitoring/alerts
```

## Развитие системы

### Планируемые улучшения

1. **ELK Stack** - Интеграция с Elasticsearch для продвинутого анализа логов
2. **Prometheus** - Дополнительная интеграция с Prometheus метриками
3. **Distributed Tracing** - Трассировка запросов в микросервисной архитектуре
4. **ML Anomaly Detection** - Машинное обучение для обнаружения аномалий

### Кастомные метрики

Для добавления новых метрик:

```typescript
// В MonitoringService
async getCustomMetrics(): Promise<Record<string, number>> {
  const metrics: Record<string, number> = {};
  
  // Добавьте свои метрики
  metrics.customMetric = await this.calculateCustomMetric();
  
  return metrics;
}
```