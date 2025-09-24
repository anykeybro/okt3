# Zabbix Docker Compose Конфигурация

Этот проект включает полную настройку Zabbix с использованием Docker Compose для разработки и продакшена.

## Компоненты

- **Zabbix Server** - основной сервер мониторинга
- **Zabbix Web** - веб-интерфейс на Nginx
- **Zabbix Agent** - агент для мониторинга хоста
- **Zabbix Java Gateway** - шлюз для мониторинга Java приложений
- **PostgreSQL** - база данных
- **Nginx** - прокси-сервер для доступа к Zabbix по пути /zabbix

## Файлы конфигурации

- `.env.development.example` - пример переменных окружения для разработки
- `.env.production.example` - пример переменных окружения для продакшена
- `docker-compose.dev.yml` - конфигурация Docker Compose для разработки
- `docker-compose.production.yml` - конфигурация Docker Compose для продакшена

## Первоначальная настройка

Перед первым запуском настройте переменные окружения:

### Автоматическая настройка (рекомендуется):
```bash
yarn setup
```

### Ручная настройка:
```bash
# Для разработки
cp .env.development.example .env.development

# Для продакшена
cp .env.production.example .env.production
```

## Быстрый старт для разработки

```bash
# Запуск только Zabbix в режиме разработки
yarn dev:zabbix

# Запуск Zabbix + основное приложение
yarn dev

# Только основное приложение (без Zabbix)
yarn dev:app

# Альтернативный способ запуска всего
yarn dev:full
```

## Доступ к сервисам (режим разработки)

- **Веб-интерфейс Zabbix**: http://localhost/zabbix (через nginx прокси)
- **Zabbix Server**: localhost:10051
- **Zabbix Agent**: localhost:10050
- **Java Gateway**: localhost:10052
- **PostgreSQL**: localhost:5432
- **Nginx**: localhost:80

### Данные для входа по умолчанию
- **Логин**: Admin
- **Пароль**: zabbix

## Команды для управления

```bash
# Запуск только Zabbix в режиме разработки
yarn dev:zabbix

# Запуск Zabbix + приложение
yarn dev

# Запуск только приложения
yarn dev:app

# Просмотр логов Zabbix
yarn dev:zabbix:logs

# Остановка Zabbix сервисов
yarn dev:zabbix:stop

# Запуск в продакшене
yarn prod:zabbix

# Просмотр логов продакшена
yarn prod:zabbix:logs

# Остановка продакшена
yarn prod:zabbix:stop
```

## Настройка для продакшена

1. Скопируйте файл-пример и отредактируйте его:
```bash
cp .env.production.example .env.production
```

2. Отредактируйте `.env.production` файл, установив безопасные пароли:
```bash
# Обязательно измените пароль!
POSTGRES_PASSWORD=your_secure_password_here
```

3. Настройте другие параметры в `.env.production` по необходимости:
- Размеры кэша для оптимизации производительности
- Порты для внешнего доступа
- Уровни отладки

3. Создайте директории для SSL сертификатов (опционально):
```bash
mkdir -p ssl logs/zabbix-server logs/zabbix-web logs/zabbix-agent backups
```

4. Запустите продакшен:
```bash
yarn prod:zabbix
```

## Мониторинг и логи

Все логи сохраняются в директории `./logs/`:
- `logs/zabbix-server/` - логи сервера Zabbix
- `logs/zabbix-web/` - логи веб-интерфейса
- `logs/zabbix-agent/` - логи агента
- `logs/nginx/` - логи nginx прокси (только для продакшена)

Для разработки логи nginx хранятся в Docker volume `nginx_logs`.

## Резервное копирование

База данных автоматически монтируется в `./backups/` для продакшена.

Создание бэкапа:
```bash
docker exec zabbix-postgres-prod pg_dump -U zabbix zabbix > ./backups/zabbix_backup_$(date +%Y%m%d_%H%M%S).sql
```

## Масштабирование

Для продакшена можно настроить:
- Размер кэша через переменные `ZBX_CACHESIZE`, `ZBX_HISTORYCACHESIZE`
- Уровень отладки через `ZBX_DEBUGLEVEL`
- Таймауты и лимиты через соответствующие переменные

## Конфигурация Nginx

Nginx настроен как прокси-сервер для Zabbix:
- Доступ к Zabbix: `http://localhost/zabbix/`
- Корневая страница автоматически перенаправляет на `/zabbix/`
- Статические файлы кэшируются на 1 год
- Страница статуса nginx: `http://localhost/nginx_status` (только для локальных подключений)

Конфигурация находится в файле `nginx/nginx.conf`.

## Переменные окружения

### Для разработки (.env.development):
- Отладочные логи включены (ZBX_DEBUGLEVEL=3)
- Меньшие размеры кэша для экономии ресурсов
- Стандартные порты для локальной разработки
- Простые пароли для удобства

### Для продакшена (.env.production):
- Оптимизированные настройки производительности
- Большие размеры кэша
- Настройки безопасности
- Дополнительные параметры для масштабирования

## Безопасность

⚠️ **Важно**: Файлы `.env.development` и `.env.production` содержат пароли и не должны попадать в git!

- Файлы `.env.*` добавлены в `.gitignore`
- Используйте файлы `.env.*.example` как шаблоны
- Всегда меняйте пароли по умолчанию в продакшене

## Устранение неполадок

1. **Проверка статуса сервисов (разработка)**:
```bash
docker-compose --env-file .env.development -f docker-compose.dev.yml ps
```

2. **Просмотр логов конкретного сервиса**:
```bash
docker-compose --env-file .env.development -f docker-compose.dev.yml logs zabbix-server
```

3. **Перезапуск сервиса**:
```bash
docker-compose --env-file .env.development -f docker-compose.dev.yml restart zabbix-server
```

4. **Полная очистка и перезапуск**:
```bash
docker-compose --env-file .env.development -f docker-compose.dev.yml down -v
docker-compose --env-file .env.development -f docker-compose.dev.yml up -d
```