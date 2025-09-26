# Настройка Apache Kafka

Этот документ описывает настройку и использование Apache Kafka в проекте.

## Обзор

В проект добавлены следующие компоненты:
- **Zookeeper** - координационный сервис для Kafka
- **Kafka** - распределенная платформа потоковой обработки данных
- **KafkaService** - сервис для работы с Kafka в app-server

## Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Zookeeper     │    │     Kafka       │    │   App Server    │
│   Port: 2181    │◄──►│   Port: 9092    │◄──►│   Port: 3001    │
│                 │    │   Port: 29092   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Конфигурация

### Переменные окружения

В файлах `.env.development` и `.env.production` добавлены следующие переменные:

```bash
# Kafka настройки
KAFKA_BROKERS=localhost:29092  # для dev / kafka:9092 для prod
KAFKA_CLIENT_ID=app-server-dev
KAFKA_GROUP_ID=app-server-group-dev
```

### Docker Compose

#### Development
- **Zookeeper**: `localhost:2181`
- **Kafka**: `localhost:29092` (внешний), `kafka:9092` (внутренний)

#### Production
- **Zookeeper**: `localhost:2181` с health checks
- **Kafka**: `localhost:29092` (внешний), `kafka:9092` (внутренний) с health checks

## Использование

### Запуск сервисов

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d zookeeper kafka

# Production
docker-compose -f docker-compose.production.yml up -d zookeeper kafka
```

### API Endpoints

#### Отправка сообщения в Kafka
```http
POST /api/kafka/send
Content-Type: application/json

{
  "topic": "app-events",
  "message": {
    "type": "user_created",
    "userId": "123",
    "data": { "name": "John Doe" }
  }
}
```

#### Проверка статуса Kafka
```http
GET /api/kafka/status
```

Ответ:
```json
{
  "connected": true,
  "brokers": "localhost:29092",
  "clientId": "app-server-dev",
  "groupId": "app-server-group-dev"
}
```

### Программное использование

```typescript
import KafkaService from './kafka';

const kafkaService = new KafkaService();

// Подключение
await kafkaService.connectProducer();
await kafkaService.connectConsumer();

// Отправка сообщения
await kafkaService.sendMessage('user-events', {
  type: 'user_registered',
  userId: '123',
  timestamp: new Date().toISOString()
});

// Подписка на топик
await kafkaService.subscribeToTopic('user-events', (message) => {
  console.log('Получено сообщение:', message);
});
```

## Топики

### Стандартные топики

- `app-events` - общие события приложения
- `user-events` - события пользователей
- `system-events` - системные события

### Создание топиков

Топики создаются автоматически при первой отправке сообщения (настройка `KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"`).

Для ручного создания:
```bash
# Подключение к контейнеру Kafka
docker exec -it kafka-dev bash

# Создание топика
kafka-topics --create --topic my-topic --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1
```

## Мониторинг

### Просмотр топиков
```bash
docker exec -it kafka-dev kafka-topics --list --bootstrap-server localhost:9092
```

### Просмотр сообщений
```bash
docker exec -it kafka-dev kafka-console-consumer --topic app-events --from-beginning --bootstrap-server localhost:9092
```

### Отправка тестового сообщения
```bash
docker exec -it kafka-dev kafka-console-producer --topic app-events --bootstrap-server localhost:9092
```

## Логи

### Просмотр логов Kafka
```bash
# Development
docker logs kafka-dev

# Production
docker logs kafka-prod
```

### Просмотр логов Zookeeper
```bash
# Development
docker logs zookeeper-dev

# Production
docker logs zookeeper-prod
```

## Troubleshooting

### Проблемы с подключением

1. **Kafka недоступен**
   ```bash
   # Проверить статус контейнеров
   docker ps | grep kafka
   
   # Проверить логи
   docker logs kafka-dev
   ```

2. **Zookeeper недоступен**
   ```bash
   # Проверить подключение к Zookeeper
   docker exec -it zookeeper-dev zkCli.sh -server localhost:2181
   ```

3. **Проблемы с топиками**
   ```bash
   # Удалить топик
   docker exec -it kafka-dev kafka-topics --delete --topic problematic-topic --bootstrap-server localhost:9092
   ```

### Очистка данных

```bash
# Остановить сервисы
docker-compose -f docker-compose.dev.yml down

# Удалить volumes
docker volume rm $(docker volume ls -q | grep kafka)
docker volume rm $(docker volume ls -q | grep zookeeper)

# Перезапустить
docker-compose -f docker-compose.dev.yml up -d zookeeper kafka
```

## Производительность

### Настройки для Production

В `docker-compose.production.yml` настроены оптимальные параметры:
- `KAFKA_NUM_PARTITIONS: 3` - количество партиций по умолчанию
- `KAFKA_LOG_RETENTION_HOURS: 168` - хранение логов 7 дней
- `KAFKA_LOG_SEGMENT_BYTES: 1073741824` - размер сегмента 1GB

### Мониторинг производительности

Рекомендуется настроить мониторинг через Grafana с использованием JMX метрик Kafka.

## Безопасность

### Рекомендации для Production

1. Настроить SSL/TLS шифрование
2. Включить SASL аутентификацию
3. Настроить ACL (Access Control Lists)
4. Использовать отдельную сеть для Kafka кластера

### Пример конфигурации с SSL

```yaml
environment:
  KAFKA_SSL_KEYSTORE_LOCATION: /etc/kafka/secrets/kafka.keystore.jks
  KAFKA_SSL_KEYSTORE_PASSWORD: password
  KAFKA_SSL_KEY_PASSWORD: password
  KAFKA_SSL_TRUSTSTORE_LOCATION: /etc/kafka/secrets/kafka.truststore.jks
  KAFKA_SSL_TRUSTSTORE_PASSWORD: password
  KAFKA_SECURITY_INTER_BROKER_PROTOCOL: SSL
```