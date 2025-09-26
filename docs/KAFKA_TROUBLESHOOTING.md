# Устранение проблем с Kafka

## Исправленные проблемы

### ✅ 1. Переменные окружения не загружались
**Проблема:** `undefined` значения для KAFKA_BROKERS, KAFKA_CLIENT_ID, KAFKA_GROUP_ID

**Решение:** Добавлены переменные в `packages/app-server/.env`:
```bash
KAFKA_BROKERS=localhost:29092
KAFKA_CLIENT_ID=app-server-dev
KAFKA_GROUP_ID=app-server-group-dev
KAFKAJS_NO_PARTITIONER_WARNING=1
```

### ✅ 2. Предупреждение о партиционере
**Проблема:** KafkaJS v2.0.0 switched default partitioner warning

**Решение:** 
- Добавлена переменная `KAFKAJS_NO_PARTITIONER_WARNING=1`
- Использован `Partitioners.LegacyPartitioner` в Producer

### ✅ 3. Ошибки координатора групп
**Проблема:** "The group coordinator is not available"

**Решение:**
- Добавлена задержка 5 секунд перед подключением
- Реализованы повторные попытки подключения (5 попыток)
- Улучшены настройки Consumer с правильными таймаутами
- Добавлены обработчики событий для диагностики

### ✅ 4. Проблемы с heartbeat
**Решение:**
- Настроены правильные интервалы heartbeat
- Добавлен вызов `heartbeat()` в обработчике сообщений
- Увеличены таймауты сессии и ребалансировки

## Текущая конфигурация

### KafkaService настройки:
```typescript
// Kafka клиент
new Kafka({
  clientId,
  brokers,
  logLevel: logLevel.WARN, // Уменьшены логи
  retry: {
    initialRetryTime: 300,
    retries: 5,
    maxRetryTime: 30000,
    restartOnFailure: async () => true
  },
  connectionTimeout: 10000,
  requestTimeout: 30000
});

// Producer
kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
  maxInFlightRequests: 1,
  idempotent: false,
  transactionTimeout: 30000
});

// Consumer
kafka.consumer({ 
  groupId: consumerGroupId,
  sessionTimeout: 30000,
  rebalanceTimeout: 60000,
  heartbeatInterval: 3000,
  maxBytesPerPartition: 1048576,
  minBytes: 1,
  maxBytes: 10485760,
  maxWaitTimeInMs: 5000
});
```

## Проверка работы

### 1. Перезапуск app-server
```bash
# Остановить текущий процесс (Ctrl+C)
# Затем запустить заново:
cd packages/app-server
npm run dev
```

### 2. Ожидаемые логи при успешном подключении:
```
🔄 Ожидание готовности Kafka...
🔄 Попытка подключения к Kafka 1/5...
📋 Доступные топики Kafka: ['app-events']
✅ Тестовое подключение к Kafka успешно!
✅ Kafka Producer подключен успешно
🔗 Kafka Consumer подключился
✅ Kafka Consumer подключен успешно
👥 Consumer присоединился к группе: app-server-group-dev
🔔 Подписка на топик app-events активна
🚀 Подключение к Kafka успешно завершено!
🔗 Брокеры: localhost:29092
🆔 Client ID: app-server-dev
👥 Group ID: app-server-group-dev
```

### 3. Тестирование отправки сообщения:
```bash
curl -X POST http://localhost:3001/api/kafka/send \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "type": "test",
      "data": "Тестовое сообщение"
    }
  }'
```

Ожидаемый ответ:
```json
{
  "success": true,
  "message": "Сообщение отправлено в Kafka",
  "topic": "app-events"
}
```

В логах app-server должно появиться:
```
📤 Сообщение отправлено в топик app-events: {...}
📥 Получено сообщение из топика app-events (partition 0): {...}
🎯 Обработка события из Kafka: {...}
```

## Дополнительные команды для диагностики

### Очистка Consumer Groups (если нужно):
```bash
# Список групп
docker exec -it kafka-dev kafka-consumer-groups --bootstrap-server localhost:9092 --list

# Удаление группы
docker exec -it kafka-dev kafka-consumer-groups --bootstrap-server localhost:9092 --delete --group app-server-group-dev
```

### Проверка топиков:
```bash
# Список топиков
docker exec -it kafka-dev kafka-topics --bootstrap-server localhost:9092 --list

# Информация о топике
docker exec -it kafka-dev kafka-topics --bootstrap-server localhost:9092 --describe --topic app-events
```

### Мониторинг сообщений:
```bash
# Чтение всех сообщений из топика
docker exec -it kafka-dev kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic app-events \
  --from-beginning

# Чтение только новых сообщений
docker exec -it kafka-dev kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic app-events
```

## Если проблемы продолжаются

### 1. Полная перезагрузка Kafka:
```bash
# Остановить сервисы
docker-compose -f docker-compose.dev.yml down

# Удалить volumes (ВНИМАНИЕ: удалит все данные!)
docker volume rm $(docker volume ls -q | findstr kafka)
docker volume rm $(docker volume ls -q | findstr zookeeper)

# Запустить заново
docker-compose -f docker-compose.dev.yml up -d zookeeper kafka
```

### 2. Проверка сетевого подключения:
```bash
# Проверка доступности Kafka
telnet localhost 29092

# Или через PowerShell
Test-NetConnection -ComputerName localhost -Port 29092
```

### 3. Логи для диагностики:
```bash
# Логи Kafka
docker logs kafka-dev --tail 50

# Логи Zookeeper
docker logs zookeeper-dev --tail 50
```