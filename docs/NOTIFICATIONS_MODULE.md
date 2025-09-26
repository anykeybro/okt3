# Модуль системы уведомлений

## Обзор

Модуль системы уведомлений обеспечивает отправку уведомлений абонентам через различные каналы связи с приоритетной доставкой. Система поддерживает отправку через Telegram Bot API и SMS через модем Huawei E3372.

## Архитектура

### Приоритетная отправка

Система использует следующий приоритет каналов доставки:
1. **Telegram** (приоритет 1) - если у абонента есть Telegram ID
2. **SMS** (приоритет 2) - если Telegram недоступен или не настроен

### Компоненты модуля

```
src/modules/notifications/
├── services/
│   ├── notification.service.ts    # Основной сервис уведомлений
│   ├── telegram.service.ts        # Сервис Telegram Bot API
│   ├── sms.service.ts            # Сервис SMS через Huawei E3372
│   └── template.service.ts       # Сервис шаблонов уведомлений
├── controllers/
│   └── notification.controller.ts # API контроллер
├── __tests__/                    # Unit тесты
├── types.ts                      # TypeScript типы
├── routes.ts                     # API маршруты
└── index.ts                      # Экспорты модуля
```

## Типы уведомлений

Система поддерживает следующие типы уведомлений:

- `WELCOME` - Приветственное сообщение для новых абонентов
- `PAYMENT` - Уведомление о поступлении платежа
- `LOW_BALANCE` - Предупреждение о низком балансе
- `BLOCKED` - Уведомление о блокировке услуг
- `UNBLOCKED` - Уведомление о разблокировке услуг

## Каналы доставки

### Telegram Bot API

**Конфигурация:**
```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/notifications/webhook/telegram
```

**Возможности:**
- Отправка HTML-форматированных сообщений
- Поддержка inline клавиатур
- Webhook для обработки входящих сообщений
- Проверка статуса бота

### SMS через Huawei E3372

**Конфигурация:**
```env
SMS_GATEWAY_IP=192.168.1.1
SMS_GATEWAY_PORT=80
SMS_GATEWAY_USERNAME=admin
SMS_GATEWAY_PASSWORD=admin
```

**Возможности:**
- Отправка SMS через HTTP API модема
- Автоматическая авторизация в веб-интерфейсе
- Форматирование номеров телефонов
- Очистка исходящих сообщений

## Система шаблонов

### Структура шаблона

Шаблоны поддерживают плейсхолдеры в формате `{{variableName}}`:

```
Привет, {{firstName}} {{lastName}}!
Ваш баланс: {{balance}} ₽
Лицевой счет: {{accountNumber}}
```

### Доступные переменные

- `firstName`, `lastName`, `middleName` - ФИО абонента
- `fullName` - Полное имя
- `phone`, `email` - Контактные данные
- `accountNumber` - Номер лицевого счета
- `balance` - Текущий баланс
- `tariffName`, `tariffPrice` - Информация о тарифе
- `currentDate`, `currentTime` - Текущие дата и время

### Валидация шаблонов

Система автоматически валидирует шаблоны:
- Проверка соответствия открывающих и закрывающих скобок
- Поиск пустых плейсхолдеров
- Проверка длины SMS (максимум 160 символов)

## API Endpoints

### Отправка уведомлений

```http
POST /api/notifications/send
Content-Type: application/json

{
  "clientId": "client_id",
  "type": "WELCOME",
  "variables": {
    "customVar": "value"
  }
}
```

### Массовая отправка

```http
POST /api/notifications/send-bulk
Content-Type: application/json

{
  "notifications": [
    {
      "clientId": "client1",
      "type": "PAYMENT",
      "variables": { "amount": 500 }
    },
    {
      "clientId": "client2", 
      "type": "LOW_BALANCE"
    }
  ]
}
```

### Журнал уведомлений

```http
GET /api/notifications/history?clientId=client1&limit=50&offset=0
```

### Статистика

```http
GET /api/notifications/stats?dateFrom=2023-01-01&dateTo=2023-12-31
```

### Управление шаблонами

```http
# Получить все шаблоны
GET /api/notifications/templates

# Создать/обновить шаблон
POST /api/notifications/templates
{
  "type": "WELCOME",
  "channel": "TELEGRAM", 
  "template": "Добро пожаловать, {{firstName}}!",
  "isActive": true
}

# Удалить шаблон
DELETE /api/notifications/templates/WELCOME/TELEGRAM
```

### Статус сервисов

```http
GET /api/notifications/status
```

## Использование в коде

### Отправка уведомления

```typescript
import { NotificationService } from './modules/notifications';

const notificationService = new NotificationService(prisma);

// Отправка уведомления
const result = await notificationService.sendNotification({
  clientId: 'client_id',
  type: NotificationType.WELCOME,
  variables: {
    firstName: 'Иван',
    balance: 100
  }
});

if (result.success) {
  console.log(`Уведомление отправлено через ${result.channel}`);
} else {
  console.error(`Ошибка отправки: ${result.error}`);
}
```

### Работа с шаблонами

```typescript
import { TemplateService } from './modules/notifications';

const templateService = new TemplateService(prisma);

// Создание шаблона
await templateService.upsertTemplate(
  NotificationType.PAYMENT,
  NotificationChannel.SMS,
  'Платеж {{amount}} руб. зачислен. Баланс: {{balance}} руб.'
);

// Обработка шаблона
const processed = templateService.processTemplate(
  'Привет, {{firstName}}!',
  { firstName: 'Иван' }
);
// Результат: { message: 'Привет, Иван!', variables: { firstName: 'Иван' } }
```

## Мониторинг и логирование

### Журнал уведомлений

Все отправленные уведомления сохраняются в базе данных с информацией:
- Получатель (clientId)
- Тип уведомления
- Канал доставки
- Статус (PENDING, SENT, FAILED)
- Время отправки
- ID внешнего сервиса

### Статистика

Система предоставляет статистику по:
- Общему количеству уведомлений
- Распределению по статусам
- Распределению по каналам
- Распределению по типам

### Проверка статуса сервисов

```typescript
const status = await notificationService.checkServicesStatus();
// { telegram: true, sms: false }
```

## Обработка ошибок

### Retry механизм

- Автоматическая переавторизация в SMS шлюзе при ошибке сессии
- Fallback на SMS при недоступности Telegram
- Логирование всех ошибок

### Типичные ошибки

1. **Telegram Bot blocked** - Бот заблокирован пользователем
2. **SMS Gateway timeout** - Таймаут подключения к модему
3. **Invalid phone number** - Некорректный номер телефона
4. **Template not found** - Шаблон не найден

## Безопасность

### Авторизация API

Все endpoints требуют авторизации и соответствующих прав:
- `notifications:create` - Отправка уведомлений
- `notifications:read` - Просмотр журнала и статистики
- `notifications:update` - Управление шаблонами
- `notifications:delete` - Удаление шаблонов

### Валидация данных

- Проверка типов уведомлений
- Валидация шаблонов
- Санитизация входных данных
- Rate limiting для API

## Тестирование

Модуль покрыт unit тестами:

```bash
# Запуск тестов модуля уведомлений
yarn test src/modules/notifications

# Запуск с покрытием
yarn test:coverage src/modules/notifications
```

### Покрытие тестами

- ✅ NotificationService - основная логика отправки
- ✅ TelegramService - интеграция с Telegram API
- ✅ SMSService - интеграция с Huawei E3372
- ✅ TemplateService - работа с шаблонами
- ✅ NotificationController - API контроллер

## Конфигурация

### Переменные окружения

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/webhook

# SMS Gateway
SMS_GATEWAY_IP=192.168.1.1
SMS_GATEWAY_PORT=80
SMS_GATEWAY_USERNAME=admin
SMS_GATEWAY_PASSWORD=admin

# Настройки уведомлений
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=5000
```

### Настройки в config.ts

```typescript
notifications: {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN!,
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    apiUrl: 'https://api.telegram.org/bot',
  },
  sms: {
    gatewayIp: process.env.SMS_GATEWAY_IP!,
    username: process.env.SMS_GATEWAY_USERNAME!,
    password: process.env.SMS_GATEWAY_PASSWORD!,
    port: parseInt(process.env.SMS_GATEWAY_PORT || '80', 10),
  },
  retryAttempts: parseInt(process.env.NOTIFICATION_RETRY_ATTEMPTS || '3', 10),
  retryDelay: parseInt(process.env.NOTIFICATION_RETRY_DELAY || '5000', 10),
}
```

## Развертывание

### Инициализация

При первом запуске система автоматически:
1. Создает базовые шаблоны уведомлений
2. Проверяет доступность внешних сервисов
3. Инициализирует Telegram webhook (если настроен)

### Мониторинг

Рекомендуется настроить мониторинг:
- Доступности Telegram Bot API
- Статуса SMS модема
- Количества неудачных отправок
- Времени ответа сервисов

## Примеры интеграции

### Уведомление о платеже

```typescript
// В модуле платежей после успешного зачисления
await notificationService.sendNotification({
  clientId: payment.account.clientId,
  type: NotificationType.PAYMENT,
  variables: {
    amount: payment.amount,
    balance: payment.account.balance
  }
});
```

### Уведомление о низком балансе

```typescript
// В биллинговом движке
if (account.balance < account.blockThreshold) {
  await notificationService.sendNotification({
    clientId: account.clientId,
    type: NotificationType.LOW_BALANCE,
    variables: {
      balance: account.balance,
      threshold: account.blockThreshold
    }
  });
}
```

### Массовые уведомления

```typescript
// Уведомление всех абонентов о техработах
const clients = await prisma.client.findMany();
const notifications = clients.map(client => ({
  clientId: client.id,
  type: NotificationType.MAINTENANCE,
  variables: {
    startTime: '02:00',
    endTime: '06:00'
  }
}));

await notificationService.sendBulkNotifications(notifications);
```