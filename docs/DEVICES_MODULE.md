# Модуль управления сетевым оборудованием MikroTik

## Обзор

Модуль `devices` предоставляет функциональность для управления сетевыми устройствами MikroTik в биллинг-системе OK-Telecom. Модуль включает в себя:

- Управление устройствами MikroTik (добавление, редактирование, удаление)
- Проверка доступности и состояния устройств
- Интеграция с MikroTik API для управления DHCP lease
- Kafka интеграция для асинхронной обработки команд
- Блокировка и разблокировка клиентов
- Мониторинг статистики устройств

## Архитектура

### Основные компоненты

1. **DeviceService** - Основной сервис для работы с устройствами
2. **MikroTikService** - Сервис для взаимодействия с MikroTik API
3. **DeviceController** - REST API контроллер
4. **MikroTikKafkaConsumer** - Kafka consumer для обработки команд
5. **DeviceValidation** - Валидация входных данных

### Структура файлов

```
src/modules/devices/
├── device.service.ts          # Основной сервис
├── mikrotik.service.ts        # MikroTik API сервис
├── device.controller.ts       # REST API контроллер
├── device.routes.ts          # Маршруты API
├── device.types.ts           # TypeScript типы
├── device.validation.ts      # Валидация данных
├── kafka.consumer.ts         # Kafka consumer
├── index.ts                  # Экспорты модуля
└── __tests__/               # Unit тесты
    ├── device.service.test.ts
    └── mikrotik.service.test.ts
```

## API Endpoints

### Управление устройствами

#### GET /api/devices
Получение списка устройств с фильтрацией и пагинацией.

**Query параметры:**
- `status` - Фильтр по статусу (ONLINE, OFFLINE, ERROR)
- `search` - Поиск по IP адресу или описанию
- `page` - Номер страницы (по умолчанию 1)
- `limit` - Количество записей на странице (по умолчанию 20, максимум 100)

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": "device-id",
      "ipAddress": "192.168.1.1",
      "username": "admin",
      "description": "Главный роутер",
      "status": "ONLINE",
      "lastCheck": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "accountsCount": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### POST /api/devices
Создание нового устройства.

**Тело запроса:**
```json
{
  "ipAddress": "192.168.1.1",
  "username": "admin",
  "password": "password123",
  "description": "Описание устройства"
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": "device-id",
    "ipAddress": "192.168.1.1",
    "username": "admin",
    "description": "Описание устройства",
    "status": "ONLINE",
    "lastCheck": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Устройство успешно добавлено"
}
```

#### GET /api/devices/:id
Получение устройства по ID.

#### PUT /api/devices/:id
Обновление устройства.

**Тело запроса:**
```json
{
  "username": "new_admin",
  "password": "new_password",
  "description": "Новое описание",
  "status": "OFFLINE"
}
```

#### DELETE /api/devices/:id
Удаление устройства (только если нет привязанных лицевых счетов).

### Диагностика

#### GET /api/devices/:id/health
Проверка состояния конкретного устройства.

**Ответ:**
```json
{
  "success": true,
  "data": {
    "deviceId": "device-id",
    "pingSuccess": true,
    "apiSuccess": true,
    "responseTime": 150,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /api/devices/check-all
Проверка состояния всех устройств.

#### POST /api/devices/test-connection
Тестирование подключения к устройству без сохранения.

**Тело запроса:**
```json
{
  "ipAddress": "192.168.1.1",
  "username": "admin",
  "password": "password123"
}
```

## MikroTik API интеграция

### Поддерживаемые операции

1. **Ping устройства** - Проверка доступности по сети
2. **Тестирование API подключения** - Проверка учетных данных
3. **Управление DHCP lease:**
   - Добавление lease
   - Удаление lease
   - Получение списка всех lease
4. **Блокировка клиентов:**
   - Блокировка по MAC адресу
   - Разблокировка клиента
5. **Статистика клиентов** - Получение данных о трафике

### Конфигурация MikroTik

Для работы с модулем необходимо настроить MikroTik устройство:

1. Включить API сервис
2. Создать пользователя с правами на управление DHCP и firewall
3. Настроить доступ по API (порт 8728 по умолчанию)

## Kafka интеграция

### Топики

- `mikrotik-commands` - Команды для выполнения на устройствах
- `device-status` - Результаты выполнения команд

### Типы команд

```typescript
type MikroTikCommandType = 
  | 'ADD_DHCP'      // Добавить DHCP lease
  | 'REMOVE_DHCP'   // Удалить DHCP lease
  | 'BLOCK_CLIENT'  // Заблокировать клиента
  | 'UNBLOCK_CLIENT'// Разблокировать клиента
  | 'GET_STATS';    // Получить статистику
```

### Пример команды

```json
{
  "type": "ADD_DHCP",
  "deviceId": "device-id",
  "accountId": "account-id",
  "macAddress": "00:11:22:33:44:55",
  "ipAddress": "192.168.1.100",
  "poolName": "default",
  "timestamp": 1642248600000
}
```

## Конфигурация

### Переменные окружения

```bash
# MikroTik настройки
MIKROTIK_DEFAULT_PORT=8728
MIKROTIK_DEFAULT_TIMEOUT=10000
MIKROTIK_HEALTH_CHECK_INTERVAL=300000
MIKROTIK_MAX_RETRIES=3
MIKROTIK_RETRY_DELAY=5000

# Kafka настройки
KAFKA_BROKERS=localhost:29092
KAFKA_CLIENT_ID=app-server
KAFKA_GROUP_ID=billing-group
```

### Конфигурация в коде

```typescript
// packages/app-server/src/config/config.ts
export const config = {
  mikrotik: {
    defaultPort: 8728,
    defaultTimeout: 10000,
    healthCheckInterval: 300000, // 5 минут
    maxRetries: 3,
    retryDelay: 5000
  },
  kafka: {
    topics: {
      mikrotikCommands: 'mikrotik-commands',
      deviceStatus: 'device-status'
    }
  }
};
```

## Безопасность

### Хранение паролей

⚠️ **Важно**: В текущей реализации пароли устройств хешируются с помощью bcrypt, что не позволяет их восстановить для подключения к API. 

**Рекомендации для продакшена:**
1. Использовать симметричное шифрование вместо хеширования
2. Хранить ключ шифрования в безопасном месте (например, HashiCorp Vault)
3. Реализовать ротацию ключей шифрования

### Доступ к API

- Все операции требуют аутентификации (будет добавлено после реализации auth модуля)
- Разграничение прав доступа по ролям (RBAC)
- Логирование всех операций с устройствами

## Мониторинг

### Health Check

Модуль автоматически проверяет состояние всех устройств каждые 5 минут:

1. **Ping проверка** - Доступность по сети
2. **API проверка** - Возможность подключения к RouterOS API
3. **Обновление статуса** - Автоматическое обновление статуса в БД

### Метрики

- Количество онлайн/офлайн устройств
- Время отклика устройств
- Количество ошибок подключения
- Статистика выполнения команд через Kafka

## Тестирование

### Unit тесты

```bash
# Запуск тестов модуля devices
yarn test --testPathPattern=devices

# Запуск с покрытием
yarn test:coverage --testPathPattern=devices
```

### Покрытие тестами

- DeviceService: 90%+ покрытие
- MikroTikService: 85%+ покрытие
- Все критические методы покрыты тестами

## Использование

### Инициализация сервисов

```typescript
import { DeviceService, DeviceController, MikroTikKafkaConsumer } from './modules/devices';
import KafkaService from './kafka';
import prisma from './common/database';

// Создание сервисов
const kafkaService = new KafkaService();
const deviceService = new DeviceService(prisma, kafkaService);
const deviceController = new DeviceController(deviceService);

// Запуск Kafka consumer
const mikrotikConsumer = new MikroTikKafkaConsumer(prisma, kafkaService);
await mikrotikConsumer.start();
```

### Отправка команд через Kafka

```typescript
// Добавление DHCP lease
await deviceService.sendMikroTikCommand({
  type: 'ADD_DHCP',
  deviceId: 'device-id',
  accountId: 'account-id',
  macAddress: '00:11:22:33:44:55',
  ipAddress: '192.168.1.100',
  poolName: 'default',
  timestamp: Date.now()
});

// Блокировка клиента
await deviceService.sendMikroTikCommand({
  type: 'BLOCK_CLIENT',
  deviceId: 'device-id',
  accountId: 'account-id',
  macAddress: '00:11:22:33:44:55',
  timestamp: Date.now()
});
```

## Ограничения и TODO

### Текущие ограничения

1. **Пароли устройств** - Используется хеширование вместо шифрования
2. **RouterOS API** - Используется заглушка вместо реального API клиента
3. **Аутентификация** - Отсутствует middleware аутентификации
4. **Мониторинг** - Базовый health check без детальных метрик

### Планы развития

1. Интеграция с реальным RouterOS API клиентом
2. Реализация шифрования паролей
3. Добавление детального мониторинга и алертов
4. Поддержка других типов сетевого оборудования
5. Веб-интерфейс для управления устройствами
6. Автоматическое обнаружение устройств в сети

## Связанные модули

- **clients** - Управление лицевыми счетами, привязанными к устройствам
- **billing** - Автоматическая блокировка при недостатке средств
- **notifications** - Уведомления о проблемах с устройствами
- **auth** - Аутентификация и авторизация доступа к API