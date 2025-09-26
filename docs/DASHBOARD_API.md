# Dashboard API - Документация

## Обзор

Dashboard API предоставляет аналитические данные и метрики для административной панели биллинг-системы OK-Telecom. API включает основные метрики системы, статистику по различным периодам, данные для построения графиков и управление кешированием.

## Базовый URL

```
http://localhost:3001/api/dashboard
```

## Аутентификация

Все эндпоинты требуют аутентификации через JWT токен в заголовке:

```
Authorization: Bearer <jwt_token>
```

## Права доступа

- **dashboard:read** - Просмотр аналитических данных
- **system:admin** - Управление кешем

## Эндпоинты

### 1. Основные метрики системы

#### GET /stats

Возвращает основные метрики системы.

**Права доступа:** `dashboard:read`

**Ответ:**
```json
{
  "success": true,
  "data": {
    "activeClients": 150,
    "blockedClients": 5,
    "suspendedClients": 2,
    "totalClients": 157,
    "todayPayments": 25,
    "todayPaymentsAmount": 12500.00,
    "monthlyPayments": 450,
    "monthlyPaymentsAmount": 225000.00,
    "totalRevenue": 1500000.00,
    "averageBalance": 350.75,
    "newRequests": 8,
    "inProgressRequests": 12,
    "completedRequestsToday": 5,
    "totalRequests": 320,
    "onlineDevices": 10,
    "offlineDevices": 2,
    "errorDevices": 0,
    "totalDevices": 12,
    "pendingNotifications": 3,
    "sentNotificationsToday": 45,
    "failedNotificationsToday": 2
  }
}
```

### 2. Статистика платежей

#### GET /stats/payments

Возвращает статистику платежей по дням.

**Права доступа:** `dashboard:read`

**Параметры запроса:**
- `dateFrom` (string, optional) - Дата начала в формате YYYY-MM-DD
- `dateTo` (string, optional) - Дата окончания в формате YYYY-MM-DD  
- `period` (string, optional) - Период: `today`, `week`, `month`, `year`, `custom`

**Пример запроса:**
```
GET /stats/payments?period=month
GET /stats/payments?dateFrom=2024-01-01&dateTo=2024-01-31
```

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "amount": 5000.00,
      "count": 10
    },
    {
      "date": "2024-01-02", 
      "amount": 7500.00,
      "count": 15
    }
  ]
}
```

### 3. Статистика клиентов

#### GET /stats/clients

Возвращает статистику клиентов по дням.

**Права доступа:** `dashboard:read`

**Параметры запроса:** Аналогично `/stats/payments`

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "active": 145,
      "blocked": 5,
      "new": 3
    },
    {
      "date": "2024-01-02",
      "active": 148,
      "blocked": 4,
      "new": 5
    }
  ]
}
```

### 4. Статистика заявок

#### GET /stats/requests

Возвращает статистику заявок по дням.

**Права доступа:** `dashboard:read`

**Параметры запроса:** Аналогично `/stats/payments`

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "new": 5,
      "inProgress": 8,
      "completed": 12,
      "cancelled": 1
    }
  ]
}
```

### 5. Статистика по тарифам

#### GET /stats/tariffs

Возвращает статистику по тарифным планам.

**Права доступа:** `dashboard:read`

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "tariffId": "tariff_1",
      "tariffName": "Базовый 100 Мбит/с",
      "clientsCount": 85,
      "revenue": 425000.00,
      "averageBalance": 250.50
    },
    {
      "tariffId": "tariff_2", 
      "tariffName": "Премиум 500 Мбит/с",
      "clientsCount": 45,
      "revenue": 675000.00,
      "averageBalance": 450.75
    }
  ]
}
```

### 6. Статистика по устройствам

#### GET /stats/devices

Возвращает статистику по сетевым устройствам.

**Права доступа:** `dashboard:read`

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "deviceId": "device_1",
      "deviceDescription": "Главный роутер",
      "ipAddress": "192.168.1.1",
      "status": "ONLINE",
      "clientsCount": 75,
      "lastCheck": "2024-01-15T10:30:00Z"
    },
    {
      "deviceId": "device_2",
      "deviceDescription": "Резервный роутер", 
      "ipAddress": "192.168.1.2",
      "status": "OFFLINE",
      "clientsCount": 0,
      "lastCheck": "2024-01-15T09:15:00Z"
    }
  ]
}
```

### 7. Последняя активность

#### GET /activity

Возвращает последние события в системе.

**Права доступа:** `dashboard:read`

**Параметры запроса:**
- `limit` (number, optional) - Количество записей (1-50, по умолчанию 10)

**Пример запроса:**
```
GET /activity?limit=20
```

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": "payment_123",
      "type": "payment",
      "description": "Платеж от Иван Иванов",
      "amount": 500.00,
      "clientName": "Иван Иванов",
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "id": "request_456",
      "type": "request", 
      "description": "Новая заявка от Петр Петров",
      "clientName": "Петр Петров",
      "timestamp": "2024-01-15T10:25:00Z"
    }
  ]
}
```

### 8. Топ клиенты

#### GET /top-clients

Возвращает клиентов с наибольшими суммами платежей.

**Права доступа:** `dashboard:read`

**Параметры запроса:**
- `limit` (number, optional) - Количество записей (1-50, по умолчанию 10)

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "clientId": "client_1",
      "clientName": "ООО Рога и Копыта",
      "accountNumber": "ACC001",
      "balance": 1500.00,
      "totalPayments": 25000.00,
      "lastPayment": "2024-01-15T08:00:00Z"
    }
  ]
}
```

### 9. Клиенты с низким балансом

#### GET /low-balance

Возвращает клиентов с низким балансом.

**Права доступа:** `dashboard:read`

**Параметры запроса:**
- `limit` (number, optional) - Количество записей (1-50, по умолчанию 10)

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "clientId": "client_2",
      "clientName": "Иван Иванов",
      "accountNumber": "ACC002", 
      "balance": 50.00,
      "tariffPrice": 500.00,
      "daysLeft": 3,
      "phone": "+7-900-123-45-67"
    }
  ]
}
```

### 10. Данные для графиков

#### GET /charts/:type

Возвращает данные для построения графиков.

**Права доступа:** `dashboard:read`

**Параметры пути:**
- `type` (string) - Тип графика: `payments`, `clients`, `requests`

**Параметры запроса:** Аналогично `/stats/payments`

**Пример запроса:**
```
GET /charts/payments?period=month
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "labels": ["2024-01-01", "2024-01-02", "2024-01-03"],
    "datasets": [
      {
        "label": "Сумма платежей",
        "data": [5000, 7500, 6200],
        "backgroundColor": "rgba(54, 162, 235, 0.2)",
        "borderColor": "rgba(54, 162, 235, 1)",
        "borderWidth": 2
      },
      {
        "label": "Количество платежей", 
        "data": [10, 15, 12],
        "backgroundColor": "rgba(255, 99, 132, 0.2)",
        "borderColor": "rgba(255, 99, 132, 1)",
        "borderWidth": 2
      }
    ]
  }
}
```

### 11. Управление кешем

#### DELETE /cache

Очищает весь кеш dashboard.

**Права доступа:** `system:admin`

**Ответ:**
```json
{
  "success": true,
  "message": "Кеш успешно очищен"
}
```

#### GET /cache/info

Возвращает информацию о состоянии кеша.

**Права доступа:** `system:admin`

**Ответ:**
```json
{
  "success": true,
  "data": {
    "size": 15,
    "keys": [
      "dashboard:stats",
      "dashboard:payments:2024-01-01:2024-01-31",
      "dashboard:activity:10"
    ],
    "memoryUsage": "2.5 MB",
    "description": "Статистика кеширования dashboard"
  }
}
```

## Коды ошибок

### 400 Bad Request
```json
{
  "success": false,
  "error": "Параметр limit должен быть от 1 до 50"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Токен аутентификации отсутствует или недействителен"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Недостаточно прав для выполнения операции"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Неподдерживаемый тип графика. Доступные: payments, clients, requests"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Внутренняя ошибка сервера"
}
```

## Кеширование

API использует встроенную систему кеширования для повышения производительности:

| Эндпоинт | TTL | Описание |
|----------|-----|----------|
| `/stats` | 5 мин | Основные метрики |
| `/stats/payments` | 10 мин | Статистика платежей |
| `/stats/clients` | 10 мин | Статистика клиентов |
| `/stats/requests` | 10 мин | Статистика заявок |
| `/stats/tariffs` | 15 мин | Статистика тарифов |
| `/stats/devices` | 5 мин | Статистика устройств |
| `/activity` | 2 мин | Последняя активность |
| `/top-clients` | 15 мин | Топ клиенты |
| `/low-balance` | 5 мин | Низкий баланс |

## Ограничения

- Максимальный диапазон дат: 1 год
- Максимальный limit для списков: 50
- Минимальный limit для списков: 1
- Кеш автоматически очищается каждые 5 минут

## Примеры использования

### JavaScript/TypeScript

```typescript
// Получение основных метрик
const response = await fetch('/api/dashboard/stats', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const { data: stats } = await response.json();
console.log(`Активных клиентов: ${stats.activeClients}`);

// Получение данных для графика платежей за месяц
const chartResponse = await fetch('/api/dashboard/charts/payments?period=month', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const { data: chartData } = await chartResponse.json();
// Использование с Chart.js или другой библиотекой графиков
```

### cURL

```bash
# Получение основных метрик
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/dashboard/stats

# Получение статистики платежей за неделю
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:3001/api/dashboard/stats/payments?period=week"

# Очистка кеша (только для админов)
curl -X DELETE \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     http://localhost:3001/api/dashboard/cache
```

## Мониторинг и отладка

### Проверка состояния кеша

```bash
curl -H "Authorization: Bearer ADMIN_TOKEN" \
     http://localhost:3001/api/dashboard/cache/info
```

### Логирование

API логирует все запросы и ошибки. Для включения подробного логирования:

```bash
DEBUG=dashboard:* npm start
```

### Метрики производительности

Все запросы к базе данных оптимизированы и выполняются параллельно где это возможно. Время ответа API обычно составляет:

- Кешированные данные: < 10ms
- Некешированные данные: 50-200ms
- Сложные агрегации: 200-500ms