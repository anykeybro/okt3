# Быстрый старт с Kafka

## Запуск сервисов

### 1. Запуск Kafka и Zookeeper

```bash
# Development окружение
docker-compose -f docker-compose.dev.yml up -d zookeeper kafka

# Проверка статуса
docker ps | grep -E "(kafka|zookeeper)"
```

### 2. Установка зависимостей app-server

```bash
cd packages/app-server
npm install
```

### 3. Запуск app-server

```bash
cd packages/app-server
npm run dev
```

## Проверка подключения

### 1. Проверка статуса Kafka через API

```bash
curl http://localhost:3001/api/kafka/status
```

Ожидаемый ответ:
```json
{
  "connected": true,
  "brokers": "localhost:29092",
  "clientId": "app-server-dev",
  "groupId": "app-server-group-dev"
}
```

### 2. Отправка тестового сообщения

```bash
curl -X POST http://localhost:3001/api/kafka/send \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "app-events",
    "message": {
      "type": "test_message",
      "data": "Привет от Kafka!"
    }
  }'
```

### 3. Проверка логов app-server

В логах app-server должны появиться сообщения:
```
✅ Тестовое подключение к Kafka успешно!
✅ Kafka Producer подключен успешно
✅ Kafka Consumer подключен успешно
🔔 Подписка на топик app-events активна
🚀 Подключение к Kafka успешно завершено!
📤 Сообщение отправлено в топик app-events: {...}
📥 Получено сообщение из топика app-events: {...}
```

## Команды для отладки

### Просмотр топиков
```bash
docker exec -it kafka-dev kafka-topics --list --bootstrap-server localhost:9092
```

### Просмотр сообщений в топике
```bash
docker exec -it kafka-dev kafka-console-consumer \
  --topic app-events \
  --from-beginning \
  --bootstrap-server localhost:9092
```

### Отправка сообщения через консоль
```bash
docker exec -it kafka-dev kafka-console-producer \
  --topic app-events \
  --bootstrap-server localhost:9092
```

## Возможные проблемы

### Kafka не запускается
```bash
# Проверить логи
docker logs kafka-dev
docker logs zookeeper-dev

# Перезапустить сервисы
docker-compose -f docker-compose.dev.yml restart zookeeper kafka
```

### App-server не подключается к Kafka
1. Убедитесь, что Kafka запущен и доступен
2. Проверьте переменные окружения в `.env.development`
3. Проверьте логи app-server на наличие ошибок подключения

### Сообщения не доставляются
1. Проверьте, что топик создан: `docker exec -it kafka-dev kafka-topics --list --bootstrap-server localhost:9092`
2. Убедитесь, что Consumer подписан на правильный топик
3. Проверьте Group ID - разные consumers должны иметь разные Group ID для получения одних и тех же сообщений