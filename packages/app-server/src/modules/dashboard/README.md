# Dashboard Module

Модуль панели управления и аналитики для биллинг-системы OK-Telecom.

## Описание

Dashboard модуль предоставляет API для получения аналитических данных и метрик системы, включая:

- Основные метрики (активные клиенты, платежи, заявки, устройства)
- Статистику по дням (платежи, клиенты, заявки)
- Статистику по тарифам и устройствам
- Последнюю активность в системе
- Топ клиентов по платежам
- Клиентов с низким балансом
- Данные для построения графиков

## Структура модуля

```
dashboard/
├── __tests__/                    # Unit тесты
│   ├── cache.service.test.ts
│   ├── dashboard.controller.test.ts
│   ├── dashboard.service.test.ts
│   └── validation.test.ts
├── cache.service.ts              # Сервис кеширования
├── dashboard.controller.ts       # HTTP контроллер
├── dashboard.service.ts          # Бизнес-логика
├── index.ts                      # Экспорты модуля
├── routes.ts                     # Маршруты API
├── types.ts                      # TypeScript типы
├── validation.ts                 # Валидация данных
└── README.md                     # Документация
```

## Основные компоненты

### DashboardService

Основной сервис для получения аналитических данных:

```typescript
const dashboardService = new DashboardService(prisma);

// Получение основных метрик
const stats = await dashboardService.getDashboardStats();

// Получение статистики платежей
const paymentStats = await dashboardService.getPaymentStats({
  period: 'month'
});
```

### CacheService

Встроенная система кеширования для повышения производительности:

```typescript
const cacheService = new CacheService();

// Сохранение в кеш
await cacheService.set('key', data, 300); // TTL 5 минут

// Получение из кеша
const cachedData = await cacheService.get('key');
```

### DashboardController

HTTP контроллер для обработки API запросов:

```typescript
const controller = new DashboardController(dashboardService);

// Обработка запроса статистики
app.get('/stats', controller.getStats);
```

## API Endpoints

### Основные метрики
- `GET /api/dashboard/stats` - Основные метрики системы

### Статистика по дням
- `GET /api/dashboard/stats/payments` - Статистика платежей
- `GET /api/dashboard/stats/clients` - Статистика клиентов
- `GET /api/dashboard/stats/requests` - Статистика заявок

### Статистика по сущностям
- `GET /api/dashboard/stats/tariffs` - Статистика по тарифам
- `GET /api/dashboard/stats/devices` - Статистика по устройствам

### Активность и рейтинги
- `GET /api/dashboard/activity` - Последняя активность
- `GET /api/dashboard/top-clients` - Топ клиенты
- `GET /api/dashboard/low-balance` - Клиенты с низким балансом

### Графики
- `GET /api/dashboard/charts/:type` - Данные для графиков

### Управление кешем
- `DELETE /api/dashboard/cache` - Очистка кеша
- `GET /api/dashboard/cache/info` - Информация о кеше

## Типы данных

### DashboardStats
```typescript
interface DashboardStats {
  activeClients: number;
  blockedClients: number;
  suspendedClients: number;
  totalClients: number;
  todayPayments: number;
  todayPaymentsAmount: number;
  monthlyPayments: number;
  monthlyPaymentsAmount: number;
  totalRevenue: number;
  averageBalance: number;
  newRequests: number;
  inProgressRequests: number;
  completedRequestsToday: number;
  totalRequests: number;
  onlineDevices: number;
  offlineDevices: number;
  errorDevices: number;
  totalDevices: number;
  pendingNotifications: number;
  sentNotificationsToday: number;
  failedNotificationsToday: number;
}
```

### PaymentStats
```typescript
interface PaymentStats {
  date: string;
  amount: number;
  count: number;
}
```

### ChartData
```typescript
interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
  }[];
}
```

## Кеширование

Модуль использует встроенную систему кеширования:

- **Основные метрики**: 5 минут
- **Статистика по дням**: 10 минут  
- **Статистика по тарифам**: 15 минут
- **Статистика по устройствам**: 5 минут
- **Последняя активность**: 2 минуты
- **Топ клиенты**: 15 минут
- **Клиенты с низким балансом**: 5 минут

### Управление кешем

```typescript
// Очистка всего кеша
await dashboardService.clearCache();

// Получение статистики кеша
const stats = cacheService.getStats();
```

## Валидация

Модуль включает валидацию входных данных:

```typescript
// Валидация фильтров
const filters = validateDashboardFilters({
  dateFrom: '2024-01-01',
  dateTo: '2024-01-31',
  period: 'custom'
});

// Валидация лимита
const limit = validateLimit(20, 1, 50);

// Валидация типа графика
const chartType = validateChartType('payments');
```

## Конфигурация

Настройки модуля в `config.ts`:

```typescript
dashboard: {
  cacheDefaultTtl: 300,                    // TTL кеша по умолчанию
  maxActivityItems: 50,                    // Максимум записей активности
  maxTopClients: 50,                       // Максимум топ клиентов
  maxLowBalanceClients: 50,                // Максимум клиентов с низким балансом
  lowBalanceThreshold: 100,                // Порог низкого баланса
  maxDateRangeDays: 365,                   // Максимальный диапазон дат
  cacheCleanupInterval: 300000,            // Интервал очистки кеша
}
```

## Переменные окружения

```bash
# Кеширование
DASHBOARD_CACHE_TTL=300
DASHBOARD_CACHE_CLEANUP_INTERVAL=300000

# Ограничения
DASHBOARD_MAX_ACTIVITY=50
DASHBOARD_MAX_TOP_CLIENTS=50
DASHBOARD_MAX_LOW_BALANCE=50
DASHBOARD_LOW_BALANCE_THRESHOLD=100
DASHBOARD_MAX_DATE_RANGE_DAYS=365
```

## Тестирование

Запуск тестов модуля:

```bash
# Все тесты dashboard модуля
yarn test --testPathPattern=dashboard

# Конкретный тест
yarn test dashboard.service.test.ts

# Тесты с покрытием
yarn test:coverage --testPathPattern=dashboard
```

### Покрытие тестами

- **DashboardService**: 95%+ покрытие
- **CacheService**: 100% покрытие
- **DashboardController**: 90%+ покрытие
- **Validation**: 100% покрытие

## Производительность

### Оптимизации

1. **Кеширование**: Все запросы кешируются для снижения нагрузки на БД
2. **Параллельные запросы**: Использование `Promise.all()` для параллельного выполнения
3. **Агрегация**: Использование MongoDB агрегации для сложных вычислений
4. **Индексы**: Оптимизированные запросы с использованием индексов БД

### Мониторинг

```typescript
// Статистика кеша
const cacheStats = cacheService.getStats();
console.log(`Cache size: ${cacheStats.size}, Memory: ${cacheStats.memoryUsage}`);

// Время выполнения запросов
console.time('dashboard-stats');
const stats = await dashboardService.getDashboardStats();
console.timeEnd('dashboard-stats');
```

## Безопасность

### Аутентификация и авторизация

Все эндпоинты защищены middleware:

```typescript
// Аутентификация
router.use(authMiddleware);

// Авторизация по ресурсам
router.get('/stats', requirePermission('dashboard', 'read'));
router.delete('/cache', requirePermission('system', 'admin'));
```

### Валидация входных данных

```typescript
// Санитизация параметров запроса
const sanitized = sanitizeQueryParams(req.query);

// Валидация диапазона дат
const { dateFrom, dateTo } = validateDateRange(filters.dateFrom, filters.dateTo);
```

## Расширение модуля

### Добавление новой метрики

1. Добавить тип в `types.ts`:
```typescript
interface NewMetric {
  value: number;
  trend: 'up' | 'down' | 'stable';
}
```

2. Реализовать в `dashboard.service.ts`:
```typescript
async getNewMetric(): Promise<NewMetric> {
  // Логика получения метрики
}
```

3. Добавить эндпоинт в `routes.ts`:
```typescript
router.get('/new-metric', controller.getNewMetric);
```

4. Написать тесты в `__tests__/`:
```typescript
describe('getNewMetric', () => {
  it('должен возвращать новую метрику', async () => {
    // Тест
  });
});
```

## Troubleshooting

### Проблемы с производительностью

1. **Медленные запросы**: Проверить индексы в MongoDB
2. **Высокое потребление памяти**: Очистить кеш или уменьшить TTL
3. **Таймауты**: Увеличить timeout в конфигурации

### Проблемы с кешем

1. **Устаревшие данные**: Очистить кеш вручную через API
2. **Утечки памяти**: Проверить интервал очистки кеша
3. **Переполнение кеша**: Уменьшить TTL или размер кеша

### Отладка

```typescript
// Включить подробное логирование
process.env.DEBUG = 'dashboard:*';

// Проверить состояние кеша
const cacheInfo = await fetch('/api/dashboard/cache/info');

// Мониторинг запросов к БД
prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```