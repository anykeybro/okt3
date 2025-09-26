# Документ проектирования - Биллинг-система "OK-Telecom"

## Обзор

Биллинг-система "OK-Telecom" представляет собой микросервисную архитектуру, построенную на базе Node.js, TypeScript, MongoDB и Kafka. Система обеспечивает полный цикл управления интернет-провайдером: от приема заявок до биллинга и управления сетевым оборудованием.

### Ключевые принципы архитектуры

- **Микросервисная архитектура**: Разделение функциональности на независимые сервисы
- **Событийно-ориентированная архитектура**: Использование Kafka для асинхронной коммуникации
- **Декларативный подход**: Конфигурация через файлы настроек
- **Масштабируемость**: Горизонтальное масштабирование через Docker и реплики MongoDB

## Архитектура

### Высокоуровневая архитектура

```mermaid
graph TB
    subgraph "Внешние интерфейсы"
        WEB[app-web - Сайт и ЛК]
        TG[Telegram Bot]
        ROBOKASSA[Robokassa API]
    end
    
    subgraph "Административные интерфейсы"
        ADMIN[app-web-billing - Админка]
    end
    
    subgraph "Основные сервисы"
        SERVER[app-server - API Backend]
        KAFKA[Kafka Message Broker]
        MONGO[MongoDB Replica Set]
    end
    
    subgraph "Внешние системы"
        MIKROTIK[MikroTik Devices]
        SMS[SMS Gateway - Huawei E3372]
        TELEGRAM[Telegram Bot API]
    end
    
    subgraph "Мониторинг"
        ZABBIX[Zabbix Server]
        GRAFANA[Grafana Dashboard]
    end
    
    WEB --> SERVER
    ADMIN --> SERVER
    TG --> SERVER
    ROBOKASSA --> SERVER
    
    SERVER --> MONGO
    SERVER --> KAFKA
    
    KAFKA --> MIKROTIK
    SERVER --> SMS
    SERVER --> TELEGRAM
    
    ZABBIX --> GRAFANA
    SERVER --> ZABBIX
```

### Структура проекта

```
packages/
├── app-server/          # Основной API сервер
│   ├── src/
│   │   ├── modules/     # Модули бизнес-логики
│   │   ├── common/      # Общие компоненты
│   │   ├── config/      # Конфигурация
│   │   └── shared/      # Общие утилиты
│   └── prisma/          # Схема базы данных
├── app-web/             # Публичный сайт и ЛК
├── app-web-billing/     # Административная панель
└── shared/              # Общие типы и утилиты
```

## Компоненты и интерфейсы

### 1. app-server (Основной API сервер)

**Технологии**: Node.js, TypeScript, Express, Prisma, KafkaJS

**Модули**:

#### Модуль аутентификации (auth)
- JWT токены для сессий
- Роли и права доступа (RBAC)
- Middleware для проверки прав

#### Модуль управления устройствами (devices)
- API для управления MikroTik устройствами
- Проверка доступности и авторизации
- Интеграция через Kafka для операций DHCP

#### Модуль тарифов (tariffs)
- CRUD операции для услуг и тарифных планов
- Группировка тарифов
- Настройка биллинговых моделей

#### Модуль клиентов (clients)
- Управление абонентами и лицевыми счетами
- Геолокация через Yandex Maps API
- История действий и сеансов

#### Модуль биллинга (billing)
- Движок тарификации (предоплата/почасовая)
- Автоматическое списание средств
- Управление балансами

#### Модуль уведомлений (notifications)
- Отправка SMS через Huawei E3372
- Telegram уведомления
- Шаблоны сообщений
- Журнал отправки

#### Модуль заявок (requests)
- CRM для обработки заявок
- Автосоздание абонентов
- Статусы и workflow

#### Модуль платежей (payments)
- Интеграция с Robokassa
- Обработка webhook'ов
- История транзакций

### 2. app-web (Публичный сайт и личный кабинет)

**Технологии**: Next.js, TypeScript, React

**Функциональность**:
- Главная страница провайдера
- Форма подачи заявок
- Личный кабинет абонентов
- Страница оплаты с QR-кодом
- Авторизация по номеру телефона

### 3. app-web-billing (Административная панель)

**Технологии**: Next.js, TypeScript, React

**Функциональность**:
- Dashboard с аналитикой
- Управление абонентами
- Управление тарифами и услугами
- CRM заявок
- Касса и платежи
- Управление устройствами
- Настройки уведомлений

### 4. Telegram Bot

**Интеграция**: Через app-server API

**Функциональность**:
- Авторизация по номеру телефона
- Просмотр баланса и тарифа
- История платежей
- Выбор лицевого счета

## Модели данных

### Основные сущности

```typescript
// Пользователи системы (администраторы)
interface SystemUser {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Роли и права
interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  description?: string;
}

interface Permission {
  id: string;
  resource: string; // users, clients, tariffs, etc.
  actions: string[]; // create, read, update, delete
}

// Абоненты
interface Client {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phones: string[];
  email?: string;
  telegramId?: string;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  accounts: Account[]; // Лицевые счета
  createdAt: Date;
  updatedAt: Date;
}

// Лицевые счета
interface Account {
  id: string;
  accountNumber: string;
  clientId: string;
  client: Client;
  tariffId: string;
  tariff: Tariff;
  balance: number;
  status: AccountStatus; // active, blocked, suspended
  macAddress?: string;
  poolName: string;
  blockThreshold: number; // Порог для автоблокировки
  deviceId?: string;
  device?: Device;
  createdAt: Date;
  updatedAt: Date;
}

// Услуги
interface Service {
  id: string;
  name: string;
  description?: string;
  type: ServiceType; // internet, iptv, cloud_storage
  isActive: boolean;
}

// Тарифные планы
interface Tariff {
  id: string;
  name: string;
  description?: string;
  price: number;
  billingType: BillingType; // prepaid_monthly, hourly
  speedDown: number; // Мбит/с
  speedUp: number; // Мбит/с
  services: Service[];
  groupId?: string;
  group?: TariffGroup;
  isVisibleInLK: boolean;
  notificationDays: number; // За сколько дней уведомлять
  isActive: boolean;
}

// Группы тарифов
interface TariffGroup {
  id: string;
  name: string;
  description?: string;
  tariffs: Tariff[];
}

// Сетевые устройства
interface Device {
  id: string;
  ipAddress: string;
  username: string;
  passwordHash: string;
  description?: string;
  status: DeviceStatus; // online, offline, error
  lastCheck: Date;
  accounts: Account[];
}

// Заявки
interface Request {
  id: string;
  clientId?: string; // Автосозданный клиент
  client?: Client;
  address: string;
  firstName: string;
  lastName: string;
  phone: string;
  desiredServices: string[]; // JSON массив
  status: RequestStatus; // new, in_progress, completed, cancelled
  assignedTo?: string; // ID администратора
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Платежи
interface Payment {
  id: string;
  accountId: string;
  account: Account;
  amount: number;
  source: PaymentSource; // manual, robokassa
  externalId?: string; // ID от Robokassa
  comment?: string;
  processedBy?: string; // ID администратора для ручных
  status: PaymentStatus; // pending, completed, failed
  createdAt: Date;
  processedAt?: Date;
}

// Уведомления
interface Notification {
  id: string;
  clientId: string;
  client: Client;
  type: NotificationType; // welcome, payment, low_balance, blocked
  channel: NotificationChannel; // telegram, sms
  message: string;
  status: NotificationStatus; // pending, sent, failed
  externalId?: string;
  sentAt?: Date;
  createdAt: Date;
}

// Шаблоны уведомлений
interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  template: string; // С плейсхолдерами
  isActive: boolean;
}
```

### Перечисления (Enums)

```typescript
enum AccountStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  SUSPENDED = 'suspended'
}

enum ServiceType {
  INTERNET = 'internet',
  IPTV = 'iptv',
  CLOUD_STORAGE = 'cloud_storage'
}

enum BillingType {
  PREPAID_MONTHLY = 'prepaid_monthly',
  HOURLY = 'hourly'
}

enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  ERROR = 'error'
}

enum RequestStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

enum PaymentSource {
  MANUAL = 'manual',
  ROBOKASSA = 'robokassa'
}

enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

enum NotificationType {
  WELCOME = 'welcome',
  PAYMENT = 'payment',
  LOW_BALANCE = 'low_balance',
  BLOCKED = 'blocked',
  UNBLOCKED = 'unblocked'
}

enum NotificationChannel {
  TELEGRAM = 'telegram',
  SMS = 'sms'
}

enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed'
}
```

## Обработка ошибок

### Стратегия обработки ошибок

1. **Централизованная обработка**: Middleware для перехвата и логирования ошибок
2. **Типизированные ошибки**: Кастомные классы ошибок для разных сценариев
3. **Graceful degradation**: Система продолжает работать при недоступности внешних сервисов
4. **Retry механизмы**: Автоматические повторы для временных сбоев

### Классы ошибок

```typescript
class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} с ID ${id} не найден`);
    this.name = 'NotFoundError';
  }
}

class ExternalServiceError extends Error {
  constructor(service: string, message: string) {
    super(`Ошибка внешнего сервиса ${service}: ${message}`);
    this.name = 'ExternalServiceError';
  }
}

class InsufficientFundsError extends Error {
  constructor(accountId: string, balance: number, required: number) {
    super(`Недостаточно средств на счете ${accountId}. Баланс: ${balance}, требуется: ${required}`);
    this.name = 'InsufficientFundsError';
  }
}
```

## Стратегия тестирования

### Уровни тестирования

1. **Unit тесты**: Тестирование отдельных функций и методов
2. **Integration тесты**: Тестирование взаимодействия между модулями
3. **E2E тесты**: Тестирование пользовательских сценариев
4. **API тесты**: Тестирование REST API endpoints

### Инструменты тестирования

- **Jest**: Основной фреймворк для тестирования
- **Supertest**: Тестирование HTTP API
- **MongoDB Memory Server**: In-memory база для тестов
- **Testcontainers**: Интеграционные тесты с реальными сервисами

### Покрытие тестами

- Критический функционал: 90%+ покрытие
- Бизнес-логика: 80%+ покрытие
- Утилиты и хелперы: 70%+ покрытие

## Безопасность

### Аутентификация и авторизация

1. **JWT токены**: Для сессий администраторов
2. **Phone-based auth**: Для абонентов через SMS/Telegram
3. **RBAC**: Ролевая модель доступа
4. **Rate limiting**: Ограничение частоты запросов

### Защита данных

1. **Хеширование паролей**: bcrypt с солью
2. **Валидация входных данных**: class-validator
3. **Санитизация**: Очистка от XSS и SQL injection
4. **HTTPS**: Обязательное шифрование трафика

### Конфиденциальность

1. **Маскирование**: Скрытие чувствительных данных в логах
2. **Шифрование**: Чувствительные данные в БД
3. **Аудит**: Логирование всех действий администраторов

## Производительность

### Оптимизация базы данных

1. **Индексы**: На часто используемые поля
2. **Агрегация**: Для аналитических запросов
3. **Пагинация**: Для больших списков
4. **Кеширование**: Redis для часто запрашиваемых данных

### Масштабирование

1. **Горизонтальное**: Несколько инстансов app-server
2. **Load balancing**: Nginx для распределения нагрузки
3. **Database sharding**: При необходимости
4. **CDN**: Для статических ресурсов

## Мониторинг и логирование

### Метрики

1. **Системные**: CPU, память, диск
2. **Приложения**: Время ответа, ошибки, throughput
3. **Бизнес**: Количество платежей, новых абонентов
4. **Внешние сервисы**: Доступность MikroTik, SMS шлюза

### Инструменты

1. **Zabbix**: Системный мониторинг
2. **Grafana**: Визуализация метрик
3. **Winston**: Структурированное логирование
4. **ELK Stack**: Централизованные логи (опционально)

## Интеграции

### MikroTik API

```typescript
interface MikroTikService {
  addDHCPLease(macAddress: string, ipAddress: string, poolName: string): Promise<void>;
  removeDHCPLease(macAddress: string): Promise<void>;
  blockClient(macAddress: string): Promise<void>;
  unblockClient(macAddress: string): Promise<void>;
  getClientStats(macAddress: string): Promise<ClientStats>;
}
```

### Robokassa API

```typescript
interface RobokassaService {
  generatePaymentUrl(amount: number, accountId: string): Promise<string>;
  verifyPayment(signature: string, data: any): boolean;
  processWebhook(data: RobokassaWebhook): Promise<void>;
}
```

### SMS Gateway (Huawei E3372)

```typescript
interface SMSService {
  sendSMS(phone: string, message: string): Promise<string>;
  getStatus(messageId: string): Promise<SMSStatus>;
  clearOutbox(): Promise<void>;
}
```

### Telegram Bot API

```typescript
interface TelegramService {
  sendMessage(chatId: string, message: string): Promise<void>;
  sendKeyboard(chatId: string, message: string, keyboard: InlineKeyboard): Promise<void>;
  setWebhook(url: string): Promise<void>;
  processUpdate(update: TelegramUpdate): Promise<void>;
}
```

## Конфигурация

### Переменные окружения

```bash
# База данных
DATABASE_URL=mongodb://username:password@mongodb-primary:27017,mongodb-secondary:27018/billing?replicaSet=rs0&authSource=admin

# Kafka
KAFKA_BROKERS=kafka:9092
KAFKA_CLIENT_ID=app-server
KAFKA_GROUP_ID=billing-group

# Внешние сервисы
ROBOKASSA_MERCHANT_ID=your_merchant_id
ROBOKASSA_PASSWORD1=your_password1
ROBOKASSA_PASSWORD2=your_password2

TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/telegram/webhook

SMS_GATEWAY_IP=192.168.1.1
SMS_GATEWAY_USERNAME=admin
SMS_GATEWAY_PASSWORD=admin

# Yandex Maps
YANDEX_MAPS_API_KEY=your_api_key

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
```

### Файлы конфигурации

```typescript
// packages/app-server/src/config/config.ts
export const config = {
  server: {
    port: process.env.PORT || 3001,
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    },
  },
  database: {
    url: process.env.DATABASE_URL!,
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    },
  },
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:29092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'app-server',
    groupId: process.env.KAFKA_GROUP_ID || 'billing-group',
  },
  billing: {
    hourlyCheckInterval: 60 * 60 * 1000, // 1 час
    notificationThresholds: [100, 50, 10], // Рубли
    autoBlockEnabled: true,
  },
  notifications: {
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN!,
      webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    },
    sms: {
      gatewayIp: process.env.SMS_GATEWAY_IP!,
      username: process.env.SMS_GATEWAY_USERNAME!,
      password: process.env.SMS_GATEWAY_PASSWORD!,
    },
  },
};
```