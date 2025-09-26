# Быстрый запуск с MongoDB

## Автоматический запуск

Для быстрого запуска всего проекта с MongoDB репликой используйте:

```cmd
start-with-mongodb.cmd
```

Этот скрипт автоматически:
1. ✅ Создаст .env.development из примера (если не существует)
2. 🔑 Сгенерирует ключ для MongoDB реплики
3. 🐳 Запустит все Docker контейнеры (MongoDB, Zabbix, Grafana, nginx)
4. ⏳ Дождется инициализации MongoDB реплики
5. 📊 Проверит статус реплики
6. 🚀 Запустит локальный app-server в отдельном окне

## Ручной запуск

### 1. Подготовка окружения
```cmd
# Копируем переменные окружения
copy .env.development.example .env.development

# Генерируем ключ MongoDB
openssl rand -base64 756 > mongodb-keyfile
```

### 2. Запуск контейнеров
```cmd
docker-compose -f docker-compose.dev.yml --env-file .env.development up -d
```

### 3. Запуск app-server локально
```cmd
cd packages/app-server
yarn dev
```

### 4. Проверка статуса MongoDB
```cmd
# Ждем 30 секунд для инициализации
timeout /t 30

# Проверяем статус реплики
docker exec mongodb-primary-dev mongosh --eval "rs.status()" --quiet
```

## Доступные сервисы

После запуска будут доступны:

| Сервис | URL | Описание |
|--------|-----|----------|
| **App Web** | http://localhost/ | Главное приложение |
| **App Server API** | http://localhost/api/health | REST API сервер |
| **App Web Billing** | http://localhost/billing | Биллинг система |
| **Zabbix** | http://localhost/zabbix/ | Мониторинг (Admin/zabbix) |
| **Grafana** | http://localhost/grafana/ | Дашборды (admin/admin) |
| **MongoDB Primary** | localhost:27017 | Основная БД |
| **MongoDB Secondary** | localhost:27018 | Вторичная БД |
| **MongoDB Arbiter** | localhost:27019 | Арбитр |

## Проверка подключения к MongoDB

### Через app-server логи
```cmd
docker logs app-server-dev
```

Должны появиться сообщения:
```
✅ Подключение к MongoDB реплике успешно установлено
📊 База данных: app_database
🔗 Реплика сет: rs0
🚀 Сервер запущен на порту 3001
```

### Прямое подключение к MongoDB
```cmd
# Подключение к primary узлу
docker exec -it mongodb-primary-dev mongosh -u admin -p mongodb_admin_pwd

# Проверка статуса реплики
rs.status()

# Просмотр баз данных
show dbs

# Переключение на базу приложения
use app_database

# Просмотр коллекций
show collections
```

## Остановка

```cmd
docker-compose -f docker-compose.dev.yml down
```

Для полной очистки (включая volumes):
```cmd
docker-compose -f docker-compose.dev.yml down -v
```

## Устранение проблем

### MongoDB реплика не инициализируется
```cmd
# Проверяем логи инициализации
docker logs mongodb-setup-dev

# Перезапускаем инициализацию
docker-compose -f docker-compose.dev.yml restart mongodb-setup
```

### App Server не подключается к БД
```cmd
# Проверяем логи app-server
docker logs app-server-dev

# Проверяем переменные окружения
docker exec app-server-dev env | grep DATABASE_URL
```

### Проблемы с портами
Убедитесь, что порты 27017-27019 и 3001 свободны:
```cmd
netstat -an | findstr "27017\|27018\|27019\|3001"
```