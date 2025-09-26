# API Платежной системы

Документация по API модуля платежной системы биллинг-системы "OK-Telecom".

## Обзор

Модуль платежной системы обеспечивает:
- Создание ручных платежей через кассу
- Интеграцию с платежной системой Robokassa
- Обработку webhook'ов от внешних платежных систем
- Получение истории транзакций
- Статистику по платежам

## Аутентификация

Все защищенные эндпоинты требуют JWT токен в заголовке:
```
Authorization: Bearer <jwt_token>
```

## Эндпоинты

### 1. Создание ручного платежа

**POST** `/api/payments/manual`

Создает ручной платеж через кассу (только для администраторов и кассиров).

**Права доступа:** `payments:create`

**Тело запроса:**
```json
{
  "accountId": "string", // ID лицевого счета (обязательно)
  "amount": "number",    // Сумма платежа (обязательно)
  "comment": "string"    // Комментарий (необязательно)
}
```

**Ответ (201):**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "accountId": "string",
    "amount": 500.00,
    "source": "MANUAL",
    "status": "COMPLETED",
    "comment": "string",
    "processedBy": {
      "id": "string",
      "username": "string"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "processedAt": "2024-01-15T10:30:00Z",
    "account": {
      "accountNumber": "ACC001",
      "client": {
        "firstName": "Иван",
        "lastName": "Иванов",
        "middleName": "Иванович"
      }
    }
  }
}
```

### 2. Создание платежа через Robokassa

**POST** `/api/payments/robokassa`

Создает платеж через Robokassa и возвращает URL для оплаты.

**Права доступа:** `payments:create`

**Тело запроса:**
```json
{
  "accountId": "string", // ID лицевого счета (обязательно)
  "amount": "number",    // Сумма платежа (обязательно)
  "description": "string" // Описание платежа (необязательно)
}
```

**Ответ (201):**
```json
{
  "success": true,
  "data": {
    "url": "https://auth.robokassa.ru/Merchant/Index.aspx?...",
    "invoiceId": "string"
  }
}
```

### 3. Webhook от Robokassa

**POST** `/api/payments/robokassa/webhook`

Обрабатывает уведомления от Robokassa о статусе платежа.

**Аутентификация:** Не требуется (проверка подписи)

**Тело запроса:**
```json
{
  "OutSum": "1000.00",
  "InvId": "payment_id",
  "SignatureValue": "md5_signature"
}
```

**Ответ (200):** `OK`
**Ответ (400):** `ERROR`

### 4. Получение списка платежей

**GET** `/api/payments`

Возвращает список платежей с фильтрацией и пагинацией.

**Права доступа:** `payments:read`

**Параметры запроса:**
- `accountId` (string) - Фильтр по лицевому счету
- `source` (string) - Фильтр по источнику (`MANUAL`, `ROBOKASSA`)
- `status` (string) - Фильтр по статусу (`PENDING`, `COMPLETED`, `FAILED`)
- `dateFrom` (string) - Дата начала периода (ISO 8601)
- `dateTo` (string) - Дата окончания периода (ISO 8601)
- `minAmount` (number) - Минимальная сумма
- `maxAmount` (number) - Максимальная сумма
- `page` (number) - Номер страницы (по умолчанию: 1)
- `limit` (number) - Количество записей на странице (по умолчанию: 20, максимум: 100)
- `sortBy` (string) - Поле для сортировки (по умолчанию: `createdAt`)
- `sortOrder` (string) - Порядок сортировки (`asc`, `desc`, по умолчанию: `desc`)

**Ответ (200):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "string",
        "accountId": "string",
        "amount": 500.00,
        "source": "MANUAL",
        "status": "COMPLETED",
        "comment": "string",
        "processedBy": {
          "id": "string",
          "username": "string"
        },
        "createdAt": "2024-01-15T10:30:00Z",
        "processedAt": "2024-01-15T10:30:00Z",
        "account": {
          "accountNumber": "ACC001",
          "client": {
            "firstName": "Иван",
            "lastName": "Иванов",
            "middleName": "Иванович"
          }
        }
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### 5. Получение платежа по ID

**GET** `/api/payments/:id`

Возвращает информацию о конкретном платеже.

**Права доступа:** `payments:read`

**Ответ (200):**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "accountId": "string",
    "amount": 500.00,
    "source": "MANUAL",
    "status": "COMPLETED",
    "comment": "string",
    "processedBy": {
      "id": "string",
      "username": "string"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "processedAt": "2024-01-15T10:30:00Z",
    "account": {
      "accountNumber": "ACC001",
      "client": {
        "firstName": "Иван",
        "lastName": "Иванов",
        "middleName": "Иванович"
      }
    }
  }
}
```

### 6. Получение платежей по лицевому счету

**GET** `/api/payments/account/:accountId`

Возвращает все платежи для конкретного лицевого счета.

**Права доступа:** `payments:read`

**Параметры запроса:** те же, что и для `/api/payments` (кроме `accountId`)

**Ответ:** аналогичен `/api/payments`

### 7. Статистика платежей

**GET** `/api/payments/stats`

Возвращает статистику по платежам.

**Права доступа:** `payments:read`

**Параметры запроса:**
- `dateFrom` (string) - Дата начала периода (ISO 8601)
- `dateTo` (string) - Дата окончания периода (ISO 8601)

**Ответ (200):**
```json
{
  "success": true,
  "data": {
    "totalAmount": 150000.00,
    "totalCount": 300,
    "bySource": {
      "MANUAL": {
        "amount": 50000.00,
        "count": 100
      },
      "ROBOKASSA": {
        "amount": 100000.00,
        "count": 200
      }
    },
    "byStatus": {
      "PENDING": {
        "amount": 5000.00,
        "count": 10
      },
      "COMPLETED": {
        "amount": 140000.00,
        "count": 280
      },
      "FAILED": {
        "amount": 5000.00,
        "count": 10
      }
    },
    "todayAmount": 15000.00,
    "todayCount": 30,
    "monthAmount": 150000.00,
    "monthCount": 300
  }
}
```

## Коды ошибок

| Код | HTTP | Описание |
|-----|------|----------|
| `ACCOUNT_NOT_FOUND` | 404 | Лицевой счет не найден |
| `PAYMENT_NOT_FOUND` | 404 | Платеж не найден |
| `ADMIN_NOT_FOUND` | 404 | Администратор не найден |
| `VALIDATION_ERROR` | 400 | Ошибка валидации данных |
| `INVALID_AMOUNT` | 400 | Некорректная сумма платежа |
| `INVALID_WEBHOOK_SIGNATURE` | 400 | Неверная подпись webhook |
| `AMOUNT_TOO_HIGH` | 400 | Сумма превышает максимально допустимую |
| `UNAUTHORIZED` | 401 | Не авторизован |
| `FORBIDDEN` | 403 | Доступ запрещен |
| `RATE_LIMIT_EXCEEDED` | 429 | Превышен лимит запросов |
| `INTERNAL_SERVER_ERROR` | 500 | Внутренняя ошибка сервера |

## Примеры использования

### Создание ручного платежа

```bash
curl -X POST http://localhost:3001/api/payments/manual \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "507f1f77bcf86cd799439011",
    "amount": 500.00,
    "comment": "Пополнение через кассу"
  }'
```

### Получение списка платежей с фильтрацией

```bash
curl -X GET "http://localhost:3001/api/payments?source=ROBOKASSA&status=COMPLETED&page=1&limit=10" \
  -H "Authorization: Bearer <jwt_token>"
```

### Получение статистики за месяц

```bash
curl -X GET "http://localhost:3001/api/payments/stats?dateFrom=2024-01-01&dateTo=2024-01-31" \
  -H "Authorization: Bearer <jwt_token>"
```

## Интеграция с Robokassa

### Настройка webhook

1. В личном кабинете Robokassa настройте URL для уведомлений:
   ```
   https://yourdomain.com/api/payments/robokassa/webhook
   ```

2. Убедитесь, что в переменных окружения указаны корректные пароли:
   ```env
   ROBOKASSA_MERCHANT_ID=your_merchant_id
   ROBOKASSA_PASSWORD1=your_password1
   ROBOKASSA_PASSWORD2=your_password2
   ROBOKASSA_TEST_MODE=false
   ```

### Тестирование

Для тестирования используйте тестовый режим:
```env
ROBOKASSA_TEST_MODE=true
```

В тестовом режиме все платежи будут обрабатываться в песочнице Robokassa.

## Безопасность

1. **Проверка подписи**: Все webhook'и от Robokassa проверяются на подлинность подписи
2. **Аутентификация**: Все операции требуют валидный JWT токен
3. **Авторизация**: Проверка прав доступа на уровне ролей
4. **Валидация**: Все входные данные проходят валидацию
5. **Rate limiting**: Ограничение частоты запросов

## Мониторинг

Модуль предоставляет метрики для мониторинга:
- Количество платежей по статусам
- Суммы платежей по источникам
- Время обработки платежей
- Количество ошибок

Метрики доступны через эндпоинт `/api/payments/stats` и интегрируются с системой мониторинга Zabbix.