# Система логирования HTTP запросов

## Обзор

В app-server реализована детальная система логирования HTTP запросов, которая позволяет отслеживать все входящие запросы (GET, POST и другие) с различными уровнями детализации.

## Возможности

### Базовое логирование
- Метод запроса (GET, POST, PUT, DELETE и т.д.)
- URL и путь запроса
- Статус код ответа
- Время выполнения запроса
- IP адрес клиента
- User-Agent
- ID пользователя (если авторизован)
- Уникальный ID запроса

### Детальное логирование
- Заголовки запроса и ответа
- Тело запроса (POST, PUT, PATCH)
- Тело ответа
- Параметры запроса (query, params)
- Автоматическая очистка чувствительных данных
- Обрезка больших объектов

### Специальные возможности
- Логирование медленных запросов (> 1 секунды)
- Логирование больших ответов (> 1MB)
- Исключение определенных путей из логирования
- Различные уровни логирования для разработки и продакшена

## Конфигурация

### Переменные окружения

#### Основные настройки
```bash
# Включить/выключить HTTP логирование
LOG_HTTP_REQUESTS=true

# Логировать тело запросов
LOG_HTTP_REQUEST_BODY=true

# Логировать тело ответов
LOG_HTTP_RESPONSE_BODY=false

# Логировать заголовки
LOG_HTTP_HEADERS=false

# Максимальный размер логируемых данных (символов)
LOG_HTTP_MAX_BODY_SIZE=1000

# Пути, исключаемые из логирования (через запятую)
LOG_HTTP_EXCLUDE_PATHS=/health,/api-docs,/favicon.ico

# Чувствительные поля для очистки (через запятую)
LOG_HTTP_SENSITIVE_FIELDS=password,token,secret,authorization,jwt
```

#### Настройки для разработки (.env.development)
```bash
LOG_HTTP_REQUESTS=true
LOG_HTTP_REQUEST_BODY=true
LOG_HTTP_RESPONSE_BODY=false
LOG_HTTP_HEADERS=false
LOG_HTTP_MAX_BODY_SIZE=1000
LOG_HTTP_EXCLUDE_PATHS=/health,/api-docs,/favicon.ico
LOG_HTTP_SENSITIVE_FIELDS=password,token,secret,authorization,jwt
```

#### Настройки для продакшена (.env.production)
```bash
LOG_HTTP_REQUESTS=true
LOG_HTTP_REQUEST_BODY=false
LOG_HTTP_RESPONSE_BODY=false
LOG_HTTP_HEADERS=false
LOG_HTTP_MAX_BODY_SIZE=500
LOG_HTTP_EXCLUDE_PATHS=/health,/api-docs,/favicon.ico,/metrics
LOG_HTTP_SENSITIVE_FIELDS=password,token,secret,authorization,jwt,key,pass
```

## Файлы логов

### Расположение
Все логи сохраняются в директории `logs/`:
- `combined.log` - все логи приложения
- `error.log` - только ошибки
- `http.log` - только HTTP запросы

### Формат логов

#### Базовый HTTP лог
```json
{
  "level": "http",
  "message": "HTTP Request",
  "timestamp": "2024-01-15 10:30:45:123",
  "method": "POST",
  "url": "/api/auth/login",
  "statusCode": 200,
  "duration": 245,
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "requestId": "abc123def456"
}
```

#### Детальный HTTP лог
```json
{
  "level": "http",
  "message": "HTTP Request Started",
  "timestamp": "2024-01-15 10:30:45:123",
  "type": "request",
  "request": {
    "method": "POST",
    "url": "/api/auth/login",
    "originalUrl": "/api/auth/login",
    "path": "/api/auth/login",
    "query": {},
    "params": {},
    "body": {
      "username": "user@example.com",
      "password": "[СКРЫТО]"
    },
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0...",
    "requestId": "abc123def456",
    "timestamp": "2024-01-15T10:30:45.123Z"
  }
}
```

## Безопасность

### Очистка чувствительных данных
Система автоматически скрывает чувствительные поля:
- `password` → `[СКРЫТО]`
- `token` → `[СКРЫТО]`
- `secret` → `[СКРЫТО]`
- `authorization` → `[СКРЫТО]`
- `jwt` → `[СКРЫТО]`

### Обрезка больших объектов
Если размер данных превышает `LOG_HTTP_MAX_BODY_SIZE`, объект обрезается и добавляется информация:
```json
{
  "data": "...",
  "_truncated": true,
  "_originalSize": 5000,
  "_maxSize": 1000
}
```

## Производительность

### Исключение путей
Для оптимизации производительности рекомендуется исключить из логирования:
- Health check endpoints (`/health`)
- Статические файлы (`/favicon.ico`)
- Документация API (`/api-docs`)
- Метрики (`/metrics`)

### Настройки для продакшена
В продакшене рекомендуется:
- Отключить логирование тел запросов и ответов
- Уменьшить максимальный размер логируемых данных
- Увеличить список исключаемых путей
- Отключить логирование заголовков

## Мониторинг

### Медленные запросы
Запросы, выполняющиеся дольше 1 секунды, логируются с уровнем `warn`:
```json
{
  "level": "warn",
  "message": "Slow HTTP Request",
  "type": "performance",
  "method": "GET",
  "url": "/api/clients",
  "duration": 1500,
  "requestId": "abc123def456",
  "statusCode": 200
}
```

### Большие ответы
Ответы размером больше 1MB логируются с предупреждением:
```json
{
  "level": "warn",
  "message": "Large HTTP Response",
  "type": "performance",
  "method": "GET",
  "url": "/api/reports/export",
  "size": "2048576",
  "requestId": "abc123def456",
  "statusCode": 200
}
```

## Анализ логов

### Поиск по логам
```bash
# Найти все POST запросы
grep '"method":"POST"' logs/http.log

# Найти ошибки 4xx и 5xx
grep '"statusCode":[45][0-9][0-9]' logs/http.log

# Найти медленные запросы
grep '"duration":[0-9][0-9][0-9][0-9]' logs/http.log

# Найти запросы конкретного пользователя
grep '"userId":"user123"' logs/http.log
```

### Статистика запросов
```bash
# Топ 10 самых частых endpoints
grep -o '"url":"[^"]*"' logs/http.log | sort | uniq -c | sort -nr | head -10

# Средняя продолжительность запросов
grep -o '"duration":[0-9]*' logs/http.log | cut -d: -f2 | awk '{sum+=$1; count++} END {print "Average:", sum/count, "ms"}'
```

## Интеграция с мониторингом

Логи HTTP запросов можно интегрировать с системами мониторинга:
- **Grafana**: для визуализации метрик запросов
- **Zabbix**: для алертов по медленным запросам
- **ELK Stack**: для полнотекстового поиска и анализа

## Рекомендации

### Для разработки
- Включите детальное логирование для отладки
- Логируйте тела запросов для анализа API
- Используйте уровень `debug` для максимальной детализации

### Для продакшена
- Отключите логирование чувствительных данных
- Ограничьте размер логируемых объектов
- Настройте ротацию логов для экономии места
- Мониторьте производительность логирования

### Для безопасности
- Регулярно проверяйте логи на утечки чувствительных данных
- Настройте автоматическую очистку старых логов
- Ограничьте доступ к файлам логов
- Используйте централизованное логирование в кластерных развертываниях