# API модуля управления тарифами и услугами

## Обзор

Модуль управления тарифами и услугами предоставляет полный набор CRUD операций для:
- Услуг (Service)
- Тарифных планов (Tariff)
- Групп тарифов (TariffGroup)

## Базовый URL

```
/api/tariffs
```

## Аутентификация

Все эндпоинты требуют аутентификации через JWT токен в заголовке `Authorization: Bearer <token>`.

## Услуги (Services)

### Получение активных услуг
```http
GET /api/tariffs/services/active
```

**Ответ:**
```json
{
  "success": true,
  "message": "Активные услуги получены успешно",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Интернет",
      "description": "Высокоскоростной интернет",
      "type": "INTERNET",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Получение всех услуг с фильтрацией
```http
GET /api/tariffs/services?type=INTERNET&isActive=true&search=интернет&page=1&limit=20
```

**Параметры запроса:**
- `type` - тип услуги (INTERNET, IPTV, CLOUD_STORAGE)
- `isActive` - статус активности (true/false)
- `search` - поиск по названию и описанию
- `page` - номер страницы (по умолчанию 1)
- `limit` - количество элементов на странице (по умолчанию 20, максимум 100)

### Создание услуги
```http
POST /api/tariffs/services
```

**Тело запроса:**
```json
{
  "name": "Интернет",
  "description": "Высокоскоростной интернет",
  "type": "INTERNET",
  "isActive": true
}
```

### Получение услуги по ID
```http
GET /api/tariffs/services/:id
```

### Обновление услуги
```http
PUT /api/tariffs/services/:id
```

**Тело запроса:**
```json
{
  "name": "Обновленное название",
  "description": "Обновленное описание"
}
```

### Удаление услуги
```http
DELETE /api/tariffs/services/:id
```

## Группы тарифов (Tariff Groups)

### Получение всех групп для селектов
```http
GET /api/tariffs/groups/all
```

### Получение всех групп с пагинацией
```http
GET /api/tariffs/groups?search=базовые&page=1&limit=20
```

### Создание группы тарифов
```http
POST /api/tariffs/groups
```

**Тело запроса:**
```json
{
  "name": "Базовые тарифы",
  "description": "Группа базовых тарифных планов"
}
```

### Получение группы по ID
```http
GET /api/tariffs/groups/:id
```

### Получение группы с тарифами
```http
GET /api/tariffs/groups/:id/with-tariffs
```

### Получение статистики по группе
```http
GET /api/tariffs/groups/:id/stats
```

**Ответ:**
```json
{
  "success": true,
  "message": "Статистика группы тарифов получена успешно",
  "data": {
    "group": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Базовые тарифы",
      "description": "Группа базовых тарифных планов"
    },
    "stats": {
      "totalTariffs": 5,
      "activeTariffs": 4,
      "totalAccounts": 150,
      "averagePrice": 750.5,
      "priceRange": {
        "min": 300,
        "max": 1500
      }
    }
  }
}
```

### Обновление группы
```http
PUT /api/tariffs/groups/:id
```

### Удаление группы
```http
DELETE /api/tariffs/groups/:id
```

### Перемещение тарифов между группами
```http
POST /api/tariffs/groups/:fromGroupId/move-tariffs
```

**Тело запроса:**
```json
{
  "toGroupId": "507f1f77bcf86cd799439012"
}
```

## Тарифы (Tariffs)

### Получение видимых тарифов для ЛК
```http
GET /api/tariffs/visible?groupId=507f1f77bcf86cd799439011
```

### Получение всех тарифов с фильтрацией
```http
GET /api/tariffs?billingType=PREPAID_MONTHLY&groupId=507f1f77bcf86cd799439011&isActive=true&priceMin=100&priceMax=1000&search=базовый&page=1&limit=20
```

**Параметры запроса:**
- `billingType` - тип биллинга (PREPAID_MONTHLY, HOURLY)
- `groupId` - ID группы тарифов
- `isActive` - статус активности
- `isVisibleInLK` - видимость в личном кабинете
- `priceMin` - минимальная цена
- `priceMax` - максимальная цена
- `search` - поиск по названию и описанию

### Создание тарифа
```http
POST /api/tariffs
```

**Тело запроса:**
```json
{
  "name": "Базовый тариф",
  "description": "Базовый интернет тариф",
  "price": 500,
  "billingType": "PREPAID_MONTHLY",
  "speedDown": 100,
  "speedUp": 50,
  "serviceIds": ["507f1f77bcf86cd799439011"],
  "groupId": "507f1f77bcf86cd799439012",
  "isVisibleInLK": true,
  "notificationDays": 3,
  "isActive": true
}
```

### Получение тарифа по ID
```http
GET /api/tariffs/:id
```

### Получение статистики по тарифу
```http
GET /api/tariffs/:id/stats
```

**Ответ:**
```json
{
  "success": true,
  "message": "Статистика тарифа получена успешно",
  "data": {
    "tariff": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Базовый тариф",
      "price": 500,
      "services": [
        {
          "id": "507f1f77bcf86cd799439011",
          "name": "Интернет",
          "type": "INTERNET"
        }
      ]
    },
    "stats": {
      "totalAccounts": 150,
      "activeAccounts": 140,
      "blockedAccounts": 8,
      "suspendedAccounts": 2,
      "totalBalance": 75000,
      "averageBalance": 500
    }
  }
}
```

### Копирование тарифа
```http
POST /api/tariffs/:id/copy
```

**Тело запроса:**
```json
{
  "newName": "Копия базового тарифа"
}
```

### Обновление тарифа
```http
PUT /api/tariffs/:id
```

### Удаление тарифа
```http
DELETE /api/tariffs/:id
```

## Типы данных

### ServiceType
- `INTERNET` - Интернет
- `IPTV` - IPTV
- `CLOUD_STORAGE` - Облачное хранилище

### BillingType
- `PREPAID_MONTHLY` - Предоплата за месяц
- `HOURLY` - Почасовая тарификация

## Валидация и бизнес-правила

### Услуги
- Название: 2-100 символов, обязательно, уникально
- Описание: до 500 символов, опционально
- Тип: один из допустимых типов ServiceType

### Тарифы
- Название: 2-100 символов, обязательно, уникально
- Цена: положительное число, не более 999999
- Скорости: положительные числа, не более 10000 Мбит/с
- Скорость отдачи не должна превышать скорость загрузки более чем в 1.5 раза
- Для почасовой тарификации цена не должна превышать 100 рублей
- Для месячной предоплаты цена должна быть не менее 100 рублей
- Дни уведомления: 0-30 дней

### Группы тарифов
- Название: 2-100 символов, обязательно, уникально
- Описание: до 500 символов, опционально

## Коды ошибок

- `400` - Ошибка валидации данных
- `401` - Неавторизованный доступ
- `403` - Недостаточно прав доступа
- `404` - Ресурс не найден
- `409` - Конфликт (дублирование названия, использование в других сущностях)
- `500` - Внутренняя ошибка сервера

## Примеры ошибок

### Ошибка валидации
```json
{
  "error": "Ошибка валидации",
  "message": "Ошибка валидации услуги",
  "errors": [
    "Название услуги обязательно и должно быть строкой",
    "Тип услуги должен быть одним из: INTERNET, IPTV, CLOUD_STORAGE"
  ]
}
```

### Конфликт
```json
{
  "error": "Конфликт",
  "message": "Услуга с таким названием уже существует"
}
```

### Не найдено
```json
{
  "error": "Не найдено",
  "message": "Услуга не найдена"
}
```