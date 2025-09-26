# Настройка MongoDB Реплики

## Обзор

В проекте настроена MongoDB реплика из 3 узлов для обеспечения высокой доступности и отказоустойчивости:

- **mongodb-primary** - основной узел (порт 27017)
- **mongodb-secondary** - вторичный узел (порт 27018) 
- **mongodb-arbiter** - арбитр (порт 27019)

## Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  MongoDB        │    │  MongoDB        │    │  MongoDB        │
│  Primary        │◄──►│  Secondary      │    │  Arbiter        │
│  :27017         │    │  :27018         │    │  :27019         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   App Server    │
                    │   (Prisma)      │
                    └─────────────────┘
```

## Переменные окружения

### Development (.env.development)
```bash
MONGODB_REPLICA_SET_NAME=rs0
MONGODB_ROOT_USERNAME=admin
MONGODB_ROOT_PASSWORD=mongodb_admin_pwd
MONGODB_DATABASE=app_database
DATABASE_URL=mongodb://admin:mongodb_admin_pwd@mongodb-primary:27017,mongodb-secondary:27017,mongodb-arbiter:27017/app_database?replicaSet=rs0&authSource=admin
```

### Production (.env.production)
```bash
MONGODB_REPLICA_SET_NAME=rs0
MONGODB_ROOT_USERNAME=admin
MONGODB_ROOT_PASSWORD=CHANGE_ME_SECURE_MONGODB_PASSWORD
MONGODB_DATABASE=app_database
DATABASE_URL=mongodb://admin:SECURE_PASSWORD@mongodb-primary:27017,mongodb-secondary:27017,mongodb-arbiter:27017/app_database?replicaSet=rs0&authSource=admin
```

## Безопасность

### Ключ реплики
Для аутентификации между узлами реплики используется общий ключ `mongodb-keyfile`:
- Генерируется автоматически при первом запуске
- Должен быть одинаковым на всех узлах
- Права доступа ограничены только для владельца

### Аутентификация
- Включена аутентификация с пользователем root
- Все подключения требуют авторизации
- App-server подключается с правами администратора

## Запуск

### Development
```bash
# Копируем пример переменных окружения
copy .env.development.example .env.development

# Запускаем контейнеры
docker-compose -f docker-compose.dev.yml up -d

# Проверяем статус реплики
docker exec mongodb-primary-dev mongosh --eval "rs.status()"
```

### Production
```bash
# Копируем и настраиваем переменные окружения
copy .env.production.example .env.production
# Измените пароли в .env.production!

# Запускаем контейнеры
docker-compose -f docker-compose.production.yml up -d

# Проверяем статус реплики
docker exec mongodb-primary-prod mongosh --eval "rs.status()"
```

## Мониторинг

### Проверка статуса реплики
```bash
# Подключение к primary узлу
docker exec -it mongodb-primary-dev mongosh -u admin -p mongodb_admin_pwd

# Команды для мониторинга
rs.status()           # Статус реплики
rs.isMaster()         # Информация о мастере
db.stats()            # Статистика базы данных
```

### Логи
```bash
# Логи primary узла
docker logs mongodb-primary-dev

# Логи инициализации реплики
docker logs mongodb-setup-dev

# Логи app-server (подключение к БД)
docker logs app-server-container
```

## Подключение App Server

App Server использует Prisma для подключения к MongoDB:

### Схема Prisma
```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}
```

### Логирование подключения
При успешном подключении в логах app-server появятся сообщения:
```
✅ Подключение к MongoDB реплике успешно установлено
📊 База данных: app_database
🔗 Реплика сет: rs0
🔄 Статус реплики: { ismaster: true, ... }
```

## Резервное копирование

### Автоматическое резервное копирование (Production)
```bash
# Создание бэкапа
docker exec mongodb-primary-prod mongodump --uri="mongodb://admin:PASSWORD@localhost:27017/app_database?authSource=admin" --out /backups/$(date +%Y%m%d_%H%M%S)

# Восстановление из бэкапа
docker exec mongodb-primary-prod mongorestore --uri="mongodb://admin:PASSWORD@localhost:27017/app_database?authSource=admin" /backups/BACKUP_FOLDER
```

## Устранение неполадок

### Реплика не инициализируется
1. Проверьте, что все узлы запущены: `docker ps`
2. Проверьте логи setup контейнера: `docker logs mongodb-setup-dev`
3. Убедитесь, что ключ mongodb-keyfile доступен всем контейнерам

### App Server не может подключиться
1. Проверьте переменную DATABASE_URL в .env файле
2. Убедитесь, что реплика инициализирована: `rs.status()`
3. Проверьте логи app-server на ошибки подключения

### Проблемы с производительностью
1. Мониторьте статус реплики: `rs.status()`
2. Проверьте нагрузку на узлы: `db.serverStatus()`
3. Рассмотрите добавление индексов для часто используемых запросов

## Масштабирование

Для добавления новых узлов в реплику:
1. Добавьте новый сервис в docker-compose
2. Обновите конфигурацию реплики через `rs.add()`
3. Обновите строку подключения DATABASE_URL