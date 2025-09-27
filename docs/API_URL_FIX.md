# Исправление API URL в веб-приложениях

## Проблема
В app-web при нажатии кнопки "получить код" отправлялся запрос на `http://localhost:3001/api/auth/request-code` вместо использования nginx роутинга.

## Решение
Исправлены следующие файлы:

### 1. .env.development
```bash
# Было:
NEXT_PUBLIC_API_URL_WEB=http://localhost:3001/api

# Стало:
NEXT_PUBLIC_API_URL_WEB=http://localhost/api
```

### 2. .env.production
Добавлена переменная:
```bash
NEXT_PUBLIC_API_URL_WEB=http://localhost/api
```

### 3. packages/app-web/src/shared/config/config.ts
```typescript
// Было:
baseUrl: process.env.NEXT_PUBLIC_API_URL_WEB || 'http://localhost:3001/api',

// Стало:
baseUrl: process.env.NEXT_PUBLIC_API_URL_WEB || 'http://localhost/api',
```

## Результат
Теперь все запросы из app-web идут через nginx по пути `/api/`, что соответствует архитектуре системы.

## Nginx роутинг
- `/api/` → app-server (порт 3001)
- `/billing/` → app-web-billing (порт 3002)  
- `/` → app-web (порт 3003)
- `/zabbix/` → zabbix-web
- `/grafana/` → grafana

## Переменные окружения для API URL
- `NEXT_PUBLIC_API_URL` - для app-web-billing (административная панель)
- `NEXT_PUBLIC_API_URL_WEB` - для app-web (публичный сайт)