# Руководство по разработке

## Быстрый старт

Для запуска всего dev окружения выполните:

```bash
yarn dev
```

Эта команда запустит:
- Docker контейнеры (Zabbix, Grafana, PostgreSQL, nginx)
- Все локальные dev серверы:
  - app-web на порту 3003 (главное приложение)
  - app-server на порту 3001 (API сервер)
  - app-web-billing на порту 3002 (биллинг)

## Доступные команды

### Основные команды разработки

- `yarn dev` - Запуск полного dev окружения
- `yarn dev:apps` - Запуск всех приложений
- `yarn dev:web` - Запуск только app-web
- `yarn dev:server` - Запуск только app-server
- `yarn dev:app` - Запуск только app-web-billing
- `yarn dev:zabbix` - Запуск только docker контейнеров
- `yarn dev:with-logs` - Запуск с отображением логов docker

### Управление docker

- `yarn dev:zabbix:stop` - Остановка docker контейнеров
- `yarn dev:zabbix:logs` - Просмотр логов docker контейнеров

### Продакшн

- `yarn prod:zabbix` - Запуск продакшн версии
- `yarn prod:zabbix:stop` - Остановка продакшн версии
- `yarn prod:zabbix:logs` - Логи продакшн версии

## Доступ к приложениям

После запуска `yarn dev` доступны:

- **App Web (главная)**: http://localhost/
- **App Server API**: http://localhost/api/ (например: http://localhost/api/health)
- **App Web Billing**: http://localhost/billing
- **Zabbix**: http://localhost/zabbix
- **Grafana**: http://localhost/grafana

## Архитектура dev окружения

```
localhost/         -> nginx (docker) -> host.docker.internal:3003 (app-web Next.js)
localhost/api/     -> nginx (docker) -> host.docker.internal:3001 (app-server Express)
localhost/billing/ -> nginx (docker) -> host.docker.internal:3002 (app-web-billing Next.js)
localhost/zabbix/  -> nginx (docker) -> zabbix-web (docker)
localhost/grafana/ -> nginx (docker) -> grafana (docker)
```

## Горячее обновление

Все приложения запускаются локально с поддержкой hot reload:
- **app-web** (Next.js) - автоматическое обновление страниц
- **app-server** (Express + tsx) - автоматический перезапуск при изменениях
- **app-web-billing** (Next.js) - автоматическое обновление страниц

## Переменные окружения

- Dev: `.env.development`
- Prod: `.env.production`

Убедитесь, что файлы созданы и содержат необходимые переменные.

## Troubleshooting

### Ошибка 502 для /billing или /api

1. Убедитесь, что `yarn dev` запущен
2. Проверьте, что порты свободны (3001, 3002, 3003)
3. Проверьте логи: `yarn dev:zabbix:logs`

### Тестирование API

```bash
# Проверка здоровья API
curl http://localhost/api/health

# Или в браузере
http://localhost/api/health
```

### Проблемы с docker

1. Остановите контейнеры: `yarn dev:zabbix:stop`
2. Перезапустите: `yarn dev:zabbix`
3. Проверьте логи: `yarn dev:zabbix:logs`