# API Документация - OK-Telecom Биллинг-система

## Обзор

API биллинг-системы OK-Telecom предоставляет полный набор эндпоинтов для управления интернет-провайдером. API построен на REST принципах и использует JSON для обмена данными.

## Базовая информация

- **Базовый URL**: `http://localhost:3001` (development) / `https://api.ok-telecom.ru` (production)
- **Документация Swagger**: `/api-docs`
- **JSON схема**: `/api-docs.json`
- **Версия API**: 1.0.0

## Аутентификация

API использует JWT токены для аутентификации. Токен должен быть передан в заголовке `Authorization`:

```
Authorization: Bearer <jwt_token>
```

### Получение токена

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

**Ответ:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "username": "admin",
    "role": {
      "name": "Суперадмин",
      "permissions": [...]
    }
  }
}
```

## Модули API

### 1. Аутентификация (`/api/auth`)

#### Авторизация
- `POST /api/auth/login` - Вход в систему
- `POST /api/auth/logout` - Выход из системы
- `GET /api/auth/me` - Получить информацию о текущем пользователе
- `POST /api/auth/refresh` - Обновить токен

#### Управление пользователями
- `GET /api/auth/users` - Список администраторов
- `POST /api/auth/users` - Создать администратора
- `PUT /api/auth/users/:id` - Обновить администратора
- `DELETE /api/auth/users/:id` - Удалить администратора

#### Управление ролями
- `GET /api/auth/roles` - Список ролей
- `POST /api/auth/roles` - Создать роль
- `PUT /api/auth/roles/:id` - Обновить роль
- `DELETE /api/auth/roles/:id` - Удалить роль

### 2. Dashboard (`/api/dashboard`)

#### Статистика
- `GET /api/dashboard/stats` - Основные метрики
- `GET /api/dashboard/stats/payments` - Статистика платежей
- `GET /api/dashboard/stats/clients` - Статистика клиентов
- `GET /api/dashboard/stats/requests` - Статистика заявок
- `GET /api/dashboard/stats/tariffs` - Статистика тарифов
- `GET /api/dashboard/stats/devices` - Статистика устройств

#### Активность и аналитика
- `GET /api/dashboard/activity` - Последняя активность
- `GET /api/dashboard/top-clients` - Топ клиенты
- `GET /api/dashboard/low-balance` - Клиенты с низким балансом
- `GET /api/dashboard/charts/:type` - Данные для графиков

#### Управление кешем
- `DELETE /api/dashboard/cache` - Очистить кеш
- `GET /api/dashboard/cache/info` - Информация о кеше

### 3. Клиенты (`/api/clients`)

#### Управление клиентами
- `GET /api/clients` - Список клиентов (с пагинацией и фильтрами)
- `GET /api/clients/:id` - Получить клиента по ID
- `POST /api/clients` - Создать клиента
- `PUT /api/clients/:id` - Обновить клиента
- `DELETE /api/clients/:id` - Удалить клиента

#### Поиск клиентов
- `GET /api/clients/search` - Поиск по номеру телефона, адресу или ФИО
- `GET /api/clients/by-phone/:phone` - Найти по номеру телефона
- `GET /api/clients/by-account/:accountNumber` - Найти по номеру лицевого счета

#### Управление лицевыми счетами
- `GET /api/clients/:id/accounts` - Лицевые счета клиента
- `POST /api/clients/:id/accounts` - Создать лицевой счет
- `PUT /api/clients/:clientId/accounts/:accountId` - Обновить лицевой счет
- `DELETE /api/clients/:clientId/accounts/:accountId` - Удалить лицевой счет

#### Операции со счетами
- `POST /api/clients/:clientId/accounts/:accountId/block` - Заблокировать счет
- `POST /api/clients/:clientId/accounts/:accountId/unblock` - Разблокировать счет
- `POST /api/clients/:clientId/accounts/:accountId/change-tariff` - Сменить тариф

### 4. Тарифы (`/api/tariffs`)

#### Управление услугами
- `GET /api/tariffs/services` - Список услуг
- `POST /api/tariffs/services` - Создать услугу
- `PUT /api/tariffs/services/:id` - Обновить услугу
- `DELETE /api/tariffs/services/:id` - Удалить услугу

#### Управление тарифами
- `GET /api/tariffs` - Список тарифов
- `GET /api/tariffs/:id` - Получить тариф по ID
- `POST /api/tariffs` - Создать тариф
- `PUT /api/tariffs/:id` - Обновить тариф
- `DELETE /api/tariffs/:id` - Удалить тариф

#### Группы тарифов
- `GET /api/tariffs/groups` - Список групп тарифов
- `POST /api/tariffs/groups` - Создать группу
- `PUT /api/tariffs/groups/:id` - Обновить группу
- `DELETE /api/tariffs/groups/:id` - Удалить группу

### 5. Устройства (`/api/devices`)

#### Управление устройствами
- `GET /api/devices` - Список устройств
- `GET /api/devices/:id` - Получить устройство по ID
- `POST /api/devices` - Добавить устройство
- `PUT /api/devices/:id` - Обновить устройство
- `DELETE /api/devices/:id` - Удалить устройство

#### Операции с устройствами
- `POST /api/devices/:id/ping` - Проверить доступность устройства
- `POST /api/devices/:id/test-connection` - Тест подключения к API
- `GET /api/devices/:id/status` - Получить статус устройства

### 6. Заявки (`/api/requests`)

#### Управление заявками
- `GET /api/requests` - Список заявок (с фильтрами)
- `GET /api/requests/:id` - Получить заявку по ID
- `POST /api/requests` - Создать заявку
- `PUT /api/requests/:id` - Обновить заявку
- `DELETE /api/requests/:id` - Удалить заявку

#### Операции с заявками
- `POST /api/requests/:id/assign` - Назначить заявку администратору
- `POST /api/requests/:id/complete` - Завершить заявку
- `POST /api/requests/:id/cancel` - Отменить заявку

### 7. Платежи (`/api/payments`)

#### Управление платежами
- `GET /api/payments` - История платежей
- `GET /api/payments/:id` - Получить платеж по ID
- `POST /api/payments/manual` - Ручное пополнение баланса

#### Robokassa интеграция
- `POST /api/payments/robokassa/create` - Создать ссылку для оплаты
- `POST /api/payments/robokassa/webhook` - Webhook от Robokassa
- `GET /api/payments/robokassa/success` - Страница успешной оплаты
- `GET /api/payments/robokassa/fail` - Страница неуспешной оплаты

### 8. Биллинг (`/api/billing`)

#### Управление биллингом
- `GET /api/billing/status` - Статус биллингового движка
- `POST /api/billing/run-cycle` - Запустить цикл биллинга вручную
- `GET /api/billing/history` - История списаний

#### Настройки биллинга
- `GET /api/billing/settings` - Получить настройки
- `PUT /api/billing/settings` - Обновить настройки

### 9. Уведомления (`/api/notifications`)

#### Управление уведомлениями
- `GET /api/notifications` - История уведомлений
- `POST /api/notifications/send` - Отправить уведомление
- `GET /api/notifications/templates` - Шаблоны уведомлений
- `PUT /api/notifications/templates/:id` - Обновить шаблон

#### SMS и Telegram
- `POST /api/notifications/sms/send` - Отправить SMS
- `POST /api/notifications/telegram/send` - Отправить Telegram сообщение
- `GET /api/notifications/sms/status` - Статус SMS шлюза
- `GET /api/notifications/telegram/status` - Статус Telegram бота

### 10. Telegram Bot (`/api/telegram`)

#### Webhook и управление
- `POST /api/telegram/webhook` - Webhook для Telegram бота
- `POST /api/telegram/set-webhook` - Установить webhook
- `DELETE /api/telegram/webhook` - Удалить webhook
- `GET /api/telegram/webhook/info` - Информация о webhook

### 11. Мониторинг (`/api/monitoring`)

#### Health checks
- `GET /api/monitoring/health` - Детальный health check
- `GET /api/monitoring/health/database` - Статус базы данных
- `GET /api/monitoring/health/kafka` - Статус Kafka
- `GET /api/monitoring/health/external` - Статус внешних сервисов

#### Метрики
- `GET /api/monitoring/metrics` - Системные метрики
- `GET /api/monitoring/metrics/zabbix` - Метрики для Zabbix

### 12. Аудит (`/api/audit`)

#### Журнал действий
- `GET /api/audit/logs` - Журнал действий администраторов
- `GET /api/audit/logs/:id` - Детали действия
- `POST /api/audit/logs` - Добавить запись в журнал

## Коды ошибок

### HTTP статус коды

- `200` - Успешный запрос
- `201` - Ресурс создан
- `400` - Неверный запрос
- `401` - Не авторизован
- `403` - Недостаточно прав
- `404` - Ресурс не найден
- `409` - Конфликт (например, дублирование)
- `422` - Ошибка валидации
- `429` - Превышен лимит запросов
- `500` - Внутренняя ошибка сервера
- `503` - Сервис недоступен

### Формат ошибок

```json
{
  "error": "Описание ошибки",
  "code": "ERROR_CODE",
  "field": "fieldName" // для ошибок валидации
}
```

## Пагинация

Для эндпоинтов, возвращающих списки, используется пагинация:

### Параметры запроса
- `page` - Номер страницы (по умолчанию: 1)
- `limit` - Количество элементов на странице (по умолчанию: 20, максимум: 100)
- `sort` - Поле для сортировки
- `order` - Направление сортировки (`asc` или `desc`)

### Формат ответа
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Фильтрация

Многие эндпоинты поддерживают фильтрацию через query параметры:

### Клиенты
- `status` - Статус лицевого счета
- `tariffId` - ID тарифа
- `search` - Поиск по ФИО, телефону или адресу

### Платежи
- `accountId` - ID лицевого счета
- `source` - Источник платежа (`manual`, `robokassa`)
- `dateFrom` - Дата начала периода
- `dateTo` - Дата окончания периода

### Заявки
- `status` - Статус заявки
- `assignedTo` - ID назначенного администратора
- `dateFrom` - Дата начала периода
- `dateTo` - Дата окончания периода

## Rate Limiting

API имеет ограничения на количество запросов:

- **Общий лимит**: 1000 запросов в час на IP
- **Аутентификация**: 10 попыток входа в 15 минут
- **Создание ресурсов**: 100 запросов в час на пользователя

При превышении лимита возвращается статус `429` с заголовками:
- `X-RateLimit-Limit` - Лимит запросов
- `X-RateLimit-Remaining` - Оставшиеся запросы
- `X-RateLimit-Reset` - Время сброса лимита

## Примеры использования

### Создание клиента с лицевым счетом

```javascript
// 1. Создать клиента
const client = await fetch('/api/clients', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    firstName: 'Иван',
    lastName: 'Иванов',
    phones: ['+79001234567'],
    email: 'ivan@example.com',
    address: 'ул. Примерная, д. 1'
  })
});

// 2. Создать лицевой счет
const account = await fetch(`/api/clients/${client.id}/accounts`, {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tariffId: 'tariff_id',
    macAddress: '00:11:22:33:44:55',
    poolName: 'client-pool'
  })
});
```

### Пополнение баланса

```javascript
const payment = await fetch('/api/payments/manual', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    accountId: 'account_id',
    amount: 500,
    comment: 'Пополнение через кассу'
  })
});
```

### Получение статистики

```javascript
const stats = await fetch('/api/dashboard/stats', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

const data = await stats.json();
console.log('Активные клиенты:', data.activeClients);
console.log('Доходы за месяц:', data.monthRevenue);
```

## Интеграция с внешними системами

### Robokassa

Для интеграции с Robokassa используйте эндпоинты `/api/payments/robokassa/*`. 
Webhook URL должен быть настроен в личном кабинете Robokassa на `/api/payments/robokassa/webhook`.

### MikroTik

Команды для MikroTik устройств отправляются через Kafka. 
Используйте эндпоинты `/api/devices/*` для управления устройствами.

### Telegram Bot

Webhook для Telegram бота настраивается через `/api/telegram/set-webhook`.
URL webhook: `https://yourdomain.com/api/telegram/webhook`

## Безопасность

### Рекомендации
1. Всегда используйте HTTPS в продакшене
2. Храните JWT токены безопасно (HttpOnly cookies)
3. Регулярно обновляйте токены
4. Используйте сильные пароли для администраторов
5. Ограничивайте права доступа по принципу минимальных привилегий

### Заголовки безопасности
API автоматически добавляет заголовки безопасности:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (в продакшене)

## Поддержка

Для получения поддержки по API:
- Email: support@ok-telecom.ru
- Документация: `/api-docs`
- Исходный код: Внутренний репозиторий

## Changelog

### v1.0.0
- Первоначальная версия API
- Все основные модули реализованы
- Swagger документация добавлена