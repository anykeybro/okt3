# Архитектура проекта

## Обзор

Проект состоит из нескольких приложений, работающих в dev окружении через nginx reverse proxy.

## Компоненты

### Приложения

1. **app-web** (порт 3003)
   - Главное Next.js приложение
   - Доступ: http://localhost/
   - Hot reload поддерживается

2. **app-server** (порт 3001)
   - Express.js API сервер с TypeScript
   - Доступ: http://localhost/api/
   - Автоматический перезапуск при изменениях (tsx watch)

3. **app-web-billing** (порт 3002)
   - Next.js приложение для биллинга
   - Доступ: http://localhost/billing
   - Hot reload поддерживается

### Инфраструктура

4. **Zabbix** (docker)
   - Система мониторинга
   - Доступ: http://localhost/zabbix

5. **Grafana** (docker)
   - Визуализация метрик
   - Доступ: http://localhost/grafana

6. **PostgreSQL** (docker)
   - База данных для Zabbix
   - Порт: 5432

7. **Nginx** (docker)
   - Reverse proxy для всех сервисов
   - Порт: 80

## Схема проксирования

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   localhost/    │───▶│  nginx (docker)  │───▶│ app-web:3003 (host) │
└─────────────────┘    │                  │    └─────────────────────┘
                       │                  │    
┌─────────────────┐    │                  │    ┌─────────────────────┐
│ localhost/api/  │───▶│                  │───▶│app-server:3001(host)│
└─────────────────┘    │                  │    └─────────────────────┘
                       │                  │    
┌─────────────────┐    │                  │    ┌─────────────────────┐
│localhost/billing│───▶│                  │───▶│app-billing:3002(host│
└─────────────────┘    │                  │    └─────────────────────┘
                       │                  │    
┌─────────────────┐    │                  │    ┌─────────────────────┐
│localhost/zabbix │───▶│                  │───▶│ zabbix-web (docker) │
└─────────────────┘    │                  │    └─────────────────────┘
                       │                  │    
┌─────────────────┐    │                  │    ┌─────────────────────┐
│localhost/grafana│───▶│                  │───▶│  grafana (docker)   │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
```

## Конфигурация nginx

### Основной nginx (nginx/nginx.conf)
- Обрабатывает все входящие запросы на порт 80
- Проксирует запросы к соответствующим upstream сервисам

### Proxy конфигурации
- `nginx/web-proxy.conf` - для app-web
- `nginx/server-proxy.conf` - для app-server  
- `nginx/billing-proxy.conf` - для app-web-billing

## Docker Compose

### Dev окружение (docker-compose.dev.yml)
- Все приложения запускаются локально на host машине
- Docker контейнеры только для инфраструктуры и nginx proxy
- Поддержка hot reload через WebSocket

### Production окружение (docker-compose.production.yml)
- Все приложения собираются в docker образы
- Оптимизированные настройки для продакшена

## Переменные окружения

- `.env.development` - для dev окружения
- `.env.production` - для продакшена

## Порты

| Сервис | Dev порт | Доступ через nginx |
|--------|----------|-------------------|
| app-web | 3003 | localhost/ |
| app-server | 3001 | localhost/api/ |
| app-web-billing | 3002 | localhost/billing |
| zabbix-web | 8080 | localhost/zabbix |
| grafana | 3000 | localhost/grafana |
| postgresql | 5432 | localhost:5432 |
| nginx | 80 | localhost |

## Особенности разработки

1. **Hot Reload**: Next.js приложения поддерживают горячее обновление
2. **API Watch**: app-server перезапускается при изменениях через tsx watch
3. **Proxy WebSocket**: nginx настроен для проксирования WebSocket соединений
4. **Host Access**: Docker контейнеры получают доступ к host через `host.docker.internal`