# Исправление проблемы подключения к MongoDB

## Проблема

При POST запросах к API происходила ошибка подключения к MongoDB:

```
Server selection timeout: No available servers. Topology: { Type: ReplicaSetNoPrimary, Set Name: rs0, Max Set Version: 1, Max Election ID: 7fffffff0000000000000002, Servers: [ { Address: mongodb-secondary:27017, Type: Unknown, Error: Kind: I/O error: Этот хост неизвестен. (os error 11001), labels: {} }, { Address: mongodb-arbiter:27017, Type: Unknown, Error: Kind: I/O error: Этот хост неизвестен. (os error 11001), labels: {} }, { Address: mongodb-primary:27017, Type: Unknown, Error: Kind: I/O error: Этот хост неизвестен. (os error 11001), labels: {} } ] }
```

## Причина

Приложение запускалось локально (не в Docker), но пыталось подключиться к MongoDB replica set с хостами `mongodb-primary`, `mongodb-secondary`, `mongodb-arbiter`, которые доступны только внутри Docker сети.

## Решение

### 1. Обновлена строка подключения в `.env.development`

Изменено с:
```
DATABASE_URL=mongodb://admin:mongodb_admin_pwd@localhost:27017/app_database?authSource=admin
```

На:
```
DATABASE_URL=mongodb://admin:mongodb_admin_pwd@localhost:27017/app_database?authSource=admin&directConnection=true
```

### 2. Параметр `directConnection=true`

Этот параметр заставляет MongoDB драйвер:
- Подключаться напрямую к указанному узлу
- Игнорировать настройки replica set
- Не пытаться обнаружить другие узлы в replica set

### 3. Перезапуск сервера

После изменения переменных окружения необходимо перезапустить сервер приложения, чтобы он подхватил новые настройки.

## Альтернативные решения

### Вариант 1: Запуск приложения в Docker

Если запустить приложение в Docker контейнере в той же сети, что и MongoDB, то можно использовать оригинальные хосты:

```yaml
# docker-compose.dev.yml
app-server:
  build: ./packages/app-server
  environment:
    - DATABASE_URL=mongodb://admin:mongodb_admin_pwd@mongodb-primary:27017,mongodb-secondary:27017,mongodb-arbiter:27017/app_database?authSource=admin&replicaSet=rs0
  networks:
    - zabbix-net
```

### Вариант 2: Реконфигурация replica set

Можно было бы реконфигурировать replica set для использования localhost хостов, но это сложнее и может вызвать проблемы с Docker контейнерами.

## Проверка работоспособности

После применения исправления:

1. Проверить health check:
```bash
curl http://localhost:3001/health
```

2. Проверить POST запрос:
```bash
curl -X POST http://localhost:3001/api/requests \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"Testov","phone":"+79005731226","address":"Test address","desiredServices":["internet"]}'
```

## Рекомендации

1. **Для разработки**: Используйте `directConnection=true` при локальном запуске приложения
2. **Для продакшена**: Используйте полную replica set конфигурацию в Docker
3. **Мониторинг**: Следите за логами в `packages/app-server/logs/error.log` для выявления проблем с подключением

## Дополнительная информация

- MongoDB replica set настроен в Docker контейнерах
- Порты проброшены: 27017 (primary), 27018 (secondary), 27019 (arbiter)
- Для локальной разработки достаточно подключения к primary узлу