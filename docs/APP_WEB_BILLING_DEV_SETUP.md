# Настройка App Web Billing для разработки

## Описание

В dev окружении app-web-billing запускается локально на порту 3002 для поддержки горячего обновления страниц. Nginx проксирует запросы с `localhost/billing` на локальный Next.js сервер.

## Архитектура

```
localhost/billing -> nginx (docker) -> host.docker.internal:3002 (локальный Next.js)
```

## Запуск

### Автоматический запуск (рекомендуется)

```bash
yarn dev
```

Этот команда:
1. Запустит docker-compose с Zabbix, Grafana и nginx
2. Запустит все локальные dev серверы:
   - app-web на порту 3003
   - app-server на порту 3001
   - app-web-billing на порту 3002

### Ручной запуск

1. **Запустить docker-compose:**
   ```bash
   yarn dev:zabbix
   ```

2. **Запустить приложения отдельно:**
   ```bash
   yarn dev:apps          # Все приложения
   yarn dev:web           # Только app-web
   yarn dev:server        # Только app-server
   yarn dev:app           # Только app-web-billing
   ```

### Запуск с логами

```bash
yarn dev:with-logs
```

Показывает логи docker контейнеров в реальном времени.

### Доступ к приложениям

- **App Web (главная)**: http://localhost/
- **App Server API**: http://localhost/api/ (например: http://localhost/api/health)
- **Billing**: http://localhost/billing
- **Zabbix**: http://localhost/zabbix
- **Grafana**: http://localhost/grafana

## Особенности

- **Горячее обновление**: Изменения в коде app-web-billing автоматически отражаются в браузере
- **WebSocket поддержка**: Настроена для Next.js hot reload
- **Проксирование**: Nginx в docker проксирует запросы к локальному серверу через `host.docker.internal`

## Конфигурация

- **Docker service**: `app-web-billing` в `docker-compose.dev.yml`
- **Nginx config**: `nginx/billing-proxy.conf` для внутреннего контейнера
- **Main nginx**: `nginx/nginx.conf` содержит правила проксирования `/billing`
- **Port**: 3002 (определен в `packages/app-web-billing/package.json`)

## Troubleshooting

Если billing не доступен:

1. Проверьте, что локальный сервер запущен на порту 3002
2. Убедитесь, что docker может достучаться до `host.docker.internal:3002`
3. Проверьте логи nginx: `docker logs zabbix-nginx-dev`