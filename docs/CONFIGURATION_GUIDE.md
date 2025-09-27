# Руководство по конфигурации - OK-Telecom Биллинг-система

## Обзор

Данное руководство описывает все аспекты конфигурации биллинг-системы OK-Telecom, включая переменные окружения, файлы конфигурации и настройки внешних сервисов.

## Структура конфигурации

### Файлы переменных окружения

```
.env.development      # Настройки для разработки
.env.production       # Настройки для продакшена
.env.development.example  # Пример настроек для разработки
.env.production.example   # Пример настроек для продакшена
```

### Файлы конфигурации приложений

```
packages/app-server/src/config/config.ts        # Основная конфигурация API сервера
packages/app-web/src/shared/config/config.ts    # Конфигурация публичного сайта
packages/app-web-billing/src/shared/config/config.ts  # Конфигурация админки
```

### Конфигурация инфраструктуры

```
docker-compose.dev.yml        # Docker Compose для разработки
docker-compose.production.yml # Docker Compose для продакшена
nginx/                        # Конфигурация Nginx
grafana/                      # Конфигурация Grafana
```

## Переменные окружения

### Основные настройки

#### NODE_ENV
```bash
NODE_ENV=development  # development | production | test
```
Определяет режим работы приложения.

#### Порты приложений
```bash
# API сервер
APP_SERVER_PORT=3001
APP_SERVER_HOST=0.0.0.0

# Публичный сайт
APP_WEB_PORT=3000

# Административная панель
APP_WEB_BILLING_PORT=3002
```

### База данных MongoDB

#### Строка подключения
```bash
# Development (одиночный экземпляр)
DATABASE_URL=mongodb://localhost:27017/billing

# Production (Replica Set)
DATABASE_URL=mongodb://username:password@mongodb-primary:27017,mongodb-secondary:27018/billing?replicaSet=rs0&authSource=admin
```

#### Параметры подключения
```bash
# Максимальное количество соединений в пуле
DB_MAX_POOL_SIZE=10

# Таймаут выбора сервера (мс)
DB_SERVER_SELECTION_TIMEOUT=5000

# Таймаут подключения (мс)
DB_CONNECT_TIMEOUT=10000

# Таймаут сокета (мс)
DB_SOCKET_TIMEOUT=45000
```

#### Аутентификация MongoDB
```bash
# Пользователь и пароль для MongoDB
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=your_secure_password

# База данных для приложения
MONGO_INITDB_DATABASE=billing

# Пользователь приложения
MONGO_APP_USERNAME=billing_user
MONGO_APP_PASSWORD=billing_password
```

### Kafka

#### Подключение к Kafka
```bash
# Список брокеров Kafka
KAFKA_BROKERS=kafka:9092,kafka2:9092

# ID клиента
KAFKA_CLIENT_ID=app-server

# ID группы потребителей
KAFKA_GROUP_ID=billing-group

# Таймаут подключения (мс)
KAFKA_CONNECTION_TIMEOUT=3000

# Таймаут запроса (мс)
KAFKA_REQUEST_TIMEOUT=30000
```

#### Топики Kafka
```bash
# Топик для команд MikroTik
KAFKA_MIKROTIK_TOPIC=mikrotik-commands

# Топик для уведомлений
KAFKA_NOTIFICATIONS_TOPIC=notifications

# Топик для аудита
KAFKA_AUDIT_TOPIC=audit-logs
```

### JWT и безопасность

#### JWT настройки
```bash
# Секретный ключ для подписи JWT токенов
JWT_SECRET=your_very_secure_jwt_secret_key_here

# Время жизни токена
JWT_EXPIRES_IN=24h

# Секретный ключ для refresh токенов
JWT_REFRESH_SECRET=your_refresh_token_secret

# Время жизни refresh токена
JWT_REFRESH_EXPIRES_IN=7d
```

#### Настройки безопасности
```bash
# Секретный ключ для сессий
SESSION_SECRET=your_session_secret

# Соль для хеширования паролей
BCRYPT_SALT_ROUNDS=12

# Включение HTTPS принуждения в продакшене
FORCE_HTTPS=true

# Домены для CORS
CORS_ORIGIN=https://yourdomain.com,https://admin.yourdomain.com
```

### Внешние сервисы

#### Robokassa
```bash
# Идентификатор магазина
ROBOKASSA_MERCHANT_ID=your_merchant_id

# Пароль #1 (для формирования подписи)
ROBOKASSA_PASSWORD1=your_password1

# Пароль #2 (для проверки уведомлений)
ROBOKASSA_PASSWORD2=your_password2

# Тестовый режим
ROBOKASSA_TEST_MODE=false

# URL для уведомлений
ROBOKASSA_RESULT_URL=https://yourdomain.com/api/payments/robokassa/webhook

# URL успешной оплаты
ROBOKASSA_SUCCESS_URL=https://yourdomain.com/payment/success

# URL неуспешной оплаты
ROBOKASSA_FAIL_URL=https://yourdomain.com/payment/fail
```

#### Telegram Bot
```bash
# Токен бота
TELEGRAM_BOT_TOKEN=your_bot_token

# URL для webhook
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/telegram/webhook

# Секретный токен для webhook
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret

# Максимальное время сессии (мс)
TELEGRAM_SESSION_TIMEOUT=1800000  # 30 минут
```

#### SMS Gateway (Huawei E3372)
```bash
# IP адрес модема
SMS_GATEWAY_IP=192.168.1.1

# Имя пользователя для подключения
SMS_GATEWAY_USERNAME=admin

# Пароль для подключения
SMS_GATEWAY_PASSWORD=admin

# Таймаут подключения (мс)
SMS_GATEWAY_TIMEOUT=10000

# Максимальное количество попыток отправки
SMS_MAX_RETRY_ATTEMPTS=3
```

#### Yandex Maps API
```bash
# API ключ для Yandex Maps
YANDEX_MAPS_API_KEY=your_yandex_maps_api_key

# Таймаут запросов к API (мс)
YANDEX_MAPS_TIMEOUT=5000
```

### Redis (кеширование)

```bash
# URL подключения к Redis
REDIS_URL=redis://localhost:6379

# Пароль Redis
REDIS_PASSWORD=your_redis_password

# База данных Redis
REDIS_DB=0

# Префикс для ключей
REDIS_KEY_PREFIX=billing:

# TTL по умолчанию (секунды)
REDIS_DEFAULT_TTL=3600
```

### Мониторинг и логирование

#### Winston логирование
```bash
# Уровень логирования
LOG_LEVEL=info  # error | warn | info | debug

# Формат логов
LOG_FORMAT=json  # json | simple

# Максимальный размер файла лога (байты)
LOG_MAX_SIZE=10485760  # 10MB

# Максимальное количество файлов логов
LOG_MAX_FILES=5

# Директория для логов
LOG_DIR=./logs
```

#### Zabbix мониторинг
```bash
# Адрес Zabbix сервера
ZABBIX_SERVER=localhost

# Порт Zabbix сервера
ZABBIX_PORT=10051

# Имя хоста в Zabbix
ZABBIX_HOSTNAME=ok-telecom-billing

# Интервал отправки метрик (секунды)
ZABBIX_INTERVAL=60
```

### Настройки биллинга

```bash
# Интервал проверки биллинга (мс)
BILLING_CHECK_INTERVAL=3600000  # 1 час

# Пороги уведомлений о низком балансе (рубли)
BILLING_NOTIFICATION_THRESHOLDS=100,50,10

# Автоматическая блокировка при нулевом балансе
BILLING_AUTO_BLOCK_ENABLED=true

# Время блокировки после исчерпания баланса (мс)
BILLING_BLOCK_DELAY=300000  # 5 минут

# Включение почасовой тарификации
BILLING_HOURLY_ENABLED=true
```

### Rate Limiting

```bash
# Общий лимит запросов в час на IP
RATE_LIMIT_GENERAL=1000

# Лимит попыток входа в 15 минут
RATE_LIMIT_AUTH=10

# Лимит создания ресурсов в час на пользователя
RATE_LIMIT_CREATE=100

# Время окна для rate limiting (мс)
RATE_LIMIT_WINDOW=3600000  # 1 час
```

## Файлы конфигурации приложений

### app-server/src/config/config.ts

```typescript
import { config as dotenvConfig } from 'dotenv';
import Joi from 'joi';

// Загрузка переменных окружения
dotenvConfig();

// Схема валидации конфигурации
const configSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  
  // Сервер
  APP_SERVER_PORT: Joi.number().port().default(3001),
  APP_SERVER_HOST: Joi.string().default('0.0.0.0'),
  
  // База данных
  DATABASE_URL: Joi.string().required(),
  DB_MAX_POOL_SIZE: Joi.number().default(10),
  DB_SERVER_SELECTION_TIMEOUT: Joi.number().default(5000),
  
  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  
  // Kafka
  KAFKA_BROKERS: Joi.string().required(),
  KAFKA_CLIENT_ID: Joi.string().default('app-server'),
  
  // Внешние сервисы
  ROBOKASSA_MERCHANT_ID: Joi.string().required(),
  TELEGRAM_BOT_TOKEN: Joi.string().required(),
  SMS_GATEWAY_IP: Joi.string().ip().required(),
  YANDEX_MAPS_API_KEY: Joi.string().required(),
}).unknown();

// Валидация конфигурации
const { error, value: envVars } = configSchema.validate(process.env);

if (error) {
  throw new Error(`Ошибка конфигурации: ${error.message}`);
}

// Экспорт конфигурации
export const config = {
  env: envVars.NODE_ENV,
  
  server: {
    port: envVars.APP_SERVER_PORT,
    host: envVars.APP_SERVER_HOST,
    cors: {
      origin: envVars.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
  },
  
  database: {
    url: envVars.DATABASE_URL,
    options: {
      maxPoolSize: envVars.DB_MAX_POOL_SIZE,
      serverSelectionTimeoutMS: envVars.DB_SERVER_SELECTION_TIMEOUT,
      connectTimeoutMS: envVars.DB_CONNECT_TIMEOUT || 10000,
      socketTimeoutMS: envVars.DB_SOCKET_TIMEOUT || 45000,
    },
  },
  
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  kafka: {
    brokers: envVars.KAFKA_BROKERS.split(','),
    clientId: envVars.KAFKA_CLIENT_ID,
    groupId: envVars.KAFKA_GROUP_ID || 'billing-group',
    connectionTimeout: envVars.KAFKA_CONNECTION_TIMEOUT || 3000,
    requestTimeout: envVars.KAFKA_REQUEST_TIMEOUT || 30000,
    topics: {
      mikrotik: envVars.KAFKA_MIKROTIK_TOPIC || 'mikrotik-commands',
      notifications: envVars.KAFKA_NOTIFICATIONS_TOPIC || 'notifications',
      audit: envVars.KAFKA_AUDIT_TOPIC || 'audit-logs',
    },
  },
  
  robokassa: {
    merchantId: envVars.ROBOKASSA_MERCHANT_ID,
    password1: envVars.ROBOKASSA_PASSWORD1,
    password2: envVars.ROBOKASSA_PASSWORD2,
    testMode: envVars.ROBOKASSA_TEST_MODE === 'true',
    resultUrl: envVars.ROBOKASSA_RESULT_URL,
    successUrl: envVars.ROBOKASSA_SUCCESS_URL,
    failUrl: envVars.ROBOKASSA_FAIL_URL,
  },
  
  telegram: {
    botToken: envVars.TELEGRAM_BOT_TOKEN,
    webhookUrl: envVars.TELEGRAM_WEBHOOK_URL,
    webhookSecret: envVars.TELEGRAM_WEBHOOK_SECRET,
    sessionTimeout: envVars.TELEGRAM_SESSION_TIMEOUT || 1800000,
  },
  
  sms: {
    gatewayIp: envVars.SMS_GATEWAY_IP,
    username: envVars.SMS_GATEWAY_USERNAME,
    password: envVars.SMS_GATEWAY_PASSWORD,
    timeout: envVars.SMS_GATEWAY_TIMEOUT || 10000,
    maxRetryAttempts: envVars.SMS_MAX_RETRY_ATTEMPTS || 3,
  },
  
  yandexMaps: {
    apiKey: envVars.YANDEX_MAPS_API_KEY,
    timeout: envVars.YANDEX_MAPS_TIMEOUT || 5000,
  },
  
  redis: {
    url: envVars.REDIS_URL || 'redis://localhost:6379',
    password: envVars.REDIS_PASSWORD,
    db: envVars.REDIS_DB || 0,
    keyPrefix: envVars.REDIS_KEY_PREFIX || 'billing:',
    defaultTtl: envVars.REDIS_DEFAULT_TTL || 3600,
  },
  
  logging: {
    level: envVars.LOG_LEVEL || 'info',
    format: envVars.LOG_FORMAT || 'json',
    maxSize: envVars.LOG_MAX_SIZE || 10485760,
    maxFiles: envVars.LOG_MAX_FILES || 5,
    dir: envVars.LOG_DIR || './logs',
  },
  
  billing: {
    checkInterval: envVars.BILLING_CHECK_INTERVAL || 3600000,
    notificationThresholds: envVars.BILLING_NOTIFICATION_THRESHOLDS?.split(',').map(Number) || [100, 50, 10],
    autoBlockEnabled: envVars.BILLING_AUTO_BLOCK_ENABLED !== 'false',
    blockDelay: envVars.BILLING_BLOCK_DELAY || 300000,
    hourlyEnabled: envVars.BILLING_HOURLY_ENABLED !== 'false',
  },
  
  rateLimiting: {
    general: envVars.RATE_LIMIT_GENERAL || 1000,
    auth: envVars.RATE_LIMIT_AUTH || 10,
    create: envVars.RATE_LIMIT_CREATE || 100,
    window: envVars.RATE_LIMIT_WINDOW || 3600000,
  },
  
  security: {
    bcryptSaltRounds: envVars.BCRYPT_SALT_ROUNDS || 12,
    sessionSecret: envVars.SESSION_SECRET,
    forceHttps: envVars.FORCE_HTTPS === 'true',
  },
};
```

## Docker Compose конфигурация

### docker-compose.production.yml

```yaml
version: '3.8'

services:
  # MongoDB Replica Set
  mongodb-primary:
    image: mongo:6.0
    container_name: mongodb-primary
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_INITDB_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_INITDB_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: ${MONGO_INITDB_DATABASE}
    volumes:
      - mongodb-primary-data:/data/db
      - ./mongodb-keyfile:/opt/keyfile/mongodb-keyfile:ro
    command: >
      mongod --replSet rs0 --keyFile /opt/keyfile/mongodb-keyfile
      --bind_ip_all --port 27017
    networks:
      - billing-network
    ports:
      - "27017:27017"

  mongodb-secondary:
    image: mongo:6.0
    container_name: mongodb-secondary
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_INITDB_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_INITDB_ROOT_PASSWORD}
    volumes:
      - mongodb-secondary-data:/data/db
      - ./mongodb-keyfile:/opt/keyfile/mongodb-keyfile:ro
    command: >
      mongod --replSet rs0 --keyFile /opt/keyfile/mongodb-keyfile
      --bind_ip_all --port 27018
    networks:
      - billing-network
    ports:
      - "27018:27018"

  # Redis для кеширования
  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    environment:
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - billing-network
    ports:
      - "6379:6379"

  # Kafka и Zookeeper
  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    container_name: zookeeper
    restart: unless-stopped
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    volumes:
      - zookeeper-data:/var/lib/zookeeper/data
      - zookeeper-logs:/var/lib/zookeeper/log
    networks:
      - billing-network

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    container_name: kafka
    restart: unless-stopped
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: true
    volumes:
      - kafka-data:/var/lib/kafka/data
    networks:
      - billing-network
    ports:
      - "9092:9092"

  # Основные приложения
  app-server:
    build:
      context: .
      dockerfile: packages/app-server/Dockerfile
    container_name: app-server
    restart: unless-stopped
    environment:
      NODE_ENV: production
    env_file:
      - .env.production
    depends_on:
      - mongodb-primary
      - redis
      - kafka
    volumes:
      - ./logs:/app/logs
    networks:
      - billing-network
    ports:
      - "3001:3001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  app-web:
    build:
      context: .
      dockerfile: packages/app-web/Dockerfile
    container_name: app-web
    restart: unless-stopped
    environment:
      NODE_ENV: production
    env_file:
      - .env.production
    depends_on:
      - app-server
    networks:
      - billing-network
    ports:
      - "3000:3000"

  app-web-billing:
    build:
      context: .
      dockerfile: packages/app-web-billing/Dockerfile
    container_name: app-web-billing
    restart: unless-stopped
    environment:
      NODE_ENV: production
    env_file:
      - .env.production
    depends_on:
      - app-server
    networks:
      - billing-network
    ports:
      - "3002:3002"

  # Мониторинг
  grafana:
    image: grafana/grafana:10.0.0
    container_name: grafana
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD}
      GF_SERVER_ROOT_URL: http://localhost/grafana
      GF_SERVER_SERVE_FROM_SUB_PATH: true
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    networks:
      - billing-network
    ports:
      - "3003:3000"

  zabbix-server:
    image: zabbix/zabbix-server-mysql:6.0-ubuntu-latest
    container_name: zabbix-server
    restart: unless-stopped
    environment:
      DB_SERVER_HOST: zabbix-mysql
      MYSQL_DATABASE: zabbix
      MYSQL_USER: zabbix
      MYSQL_PASSWORD: ${ZABBIX_DB_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${ZABBIX_DB_ROOT_PASSWORD}
    depends_on:
      - zabbix-mysql
    volumes:
      - zabbix-server-data:/var/lib/zabbix
    networks:
      - billing-network
    ports:
      - "10051:10051"

  zabbix-web:
    image: zabbix/zabbix-web-nginx-mysql:6.0-ubuntu-latest
    container_name: zabbix-web
    restart: unless-stopped
    environment:
      ZBX_SERVER_HOST: zabbix-server
      DB_SERVER_HOST: zabbix-mysql
      MYSQL_DATABASE: zabbix
      MYSQL_USER: zabbix
      MYSQL_PASSWORD: ${ZABBIX_DB_PASSWORD}
      PHP_TZ: Europe/Moscow
    depends_on:
      - zabbix-server
      - zabbix-mysql
    networks:
      - billing-network
    ports:
      - "8080:8080"

  zabbix-mysql:
    image: mysql:8.0
    container_name: zabbix-mysql
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: zabbix
      MYSQL_USER: zabbix
      MYSQL_PASSWORD: ${ZABBIX_DB_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${ZABBIX_DB_ROOT_PASSWORD}
    volumes:
      - zabbix-mysql-data:/var/lib/mysql
    networks:
      - billing-network

volumes:
  mongodb-primary-data:
  mongodb-secondary-data:
  redis-data:
  zookeeper-data:
  zookeeper-logs:
  kafka-data:
  grafana-data:
  zabbix-server-data:
  zabbix-mysql-data:

networks:
  billing-network:
    driver: bridge
```

## Nginx конфигурация

### nginx/nginx.conf

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Логирование
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # Основные настройки
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Размеры буферов
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    output_buffers 1 32k;
    postpone_output 1460;

    # Сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    gzip_disable "MSIE [1-6]\.";

    # Кеширование
    open_file_cache max=1000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;

    # Включение конфигураций сайтов
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

### nginx/web-proxy.conf

```nginx
# Публичный сайт и личный кабинет
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL сертификаты
    ssl_certificate /opt/ok-telecom/ssl/fullchain.pem;
    ssl_certificate_key /opt/ok-telecom/ssl/privkey.pem;
    
    # SSL настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Заголовки безопасности
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Проксирование к app-web
    location / {
        proxy_pass http://app-web:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Таймауты
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Статические файлы
    location /_next/static/ {
        proxy_pass http://app-web:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Мониторинг и алерты

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "OK-Telecom Billing System",
    "panels": [
      {
        "title": "API Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Active Clients",
        "type": "stat",
        "targets": [
          {
            "expr": "billing_active_clients_total",
            "legendFormat": "Active Clients"
          }
        ]
      }
    ]
  }
}
```

### Zabbix Templates

```xml
<?xml version="1.0" encoding="UTF-8"?>
<zabbix_export>
    <templates>
        <template>
            <template>OK-Telecom Billing</template>
            <name>OK-Telecom Billing System</name>
            <items>
                <item>
                    <name>API Health Check</name>
                    <key>web.page.get[localhost,/health,3001]</key>
                    <delay>60s</delay>
                    <triggers>
                        <trigger>
                            <expression>{last()}=0</expression>
                            <name>API Server is down</name>
                            <priority>4</priority>
                        </trigger>
                    </triggers>
                </item>
            </items>
        </template>
    </templates>
</zabbix_export>
```

## Валидация конфигурации

### Скрипт проверки конфигурации

```bash
#!/bin/bash

echo "Проверка конфигурации OK-Telecom Billing System..."

# Проверка переменных окружения
if [ ! -f .env.production ]; then
    echo "❌ Файл .env.production не найден"
    exit 1
fi

# Проверка обязательных переменных
required_vars=(
    "DATABASE_URL"
    "JWT_SECRET"
    "ROBOKASSA_MERCHANT_ID"
    "TELEGRAM_BOT_TOKEN"
    "SMS_GATEWAY_IP"
    "YANDEX_MAPS_API_KEY"
)

for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env.production; then
        echo "❌ Переменная $var не найдена в .env.production"
        exit 1
    fi
done

# Проверка SSL сертификатов
if [ ! -f ssl/fullchain.pem ] || [ ! -f ssl/privkey.pem ]; then
    echo "❌ SSL сертификаты не найдены"
    exit 1
fi

# Проверка Docker Compose
if ! docker-compose -f docker-compose.production.yml config > /dev/null 2>&1; then
    echo "❌ Ошибка в docker-compose.production.yml"
    exit 1
fi

# Проверка Nginx конфигурации
if ! nginx -t -c nginx/nginx.conf > /dev/null 2>&1; then
    echo "❌ Ошибка в конфигурации Nginx"
    exit 1
fi

echo "✅ Конфигурация корректна"
```

## Миграция конфигурации

### Обновление с предыдущих версий

```bash
#!/bin/bash

echo "Миграция конфигурации..."

# Резервное копирование текущей конфигурации
cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)

# Добавление новых переменных
if ! grep -q "REDIS_URL" .env.production; then
    echo "REDIS_URL=redis://redis:6379" >> .env.production
fi

if ! grep -q "BILLING_HOURLY_ENABLED" .env.production; then
    echo "BILLING_HOURLY_ENABLED=true" >> .env.production
fi

echo "Миграция завершена"
```

## Troubleshooting

### Частые проблемы конфигурации

#### 1. Ошибка подключения к MongoDB
```bash
# Проверка строки подключения
echo $DATABASE_URL

# Проверка доступности MongoDB
docker exec mongodb-primary mongo --eval "db.adminCommand('ping')"
```

#### 2. Проблемы с JWT токенами
```bash
# Проверка длины секретного ключа (должен быть минимум 32 символа)
echo $JWT_SECRET | wc -c
```

#### 3. Ошибки Kafka
```bash
# Проверка топиков Kafka
docker exec kafka kafka-topics.sh --bootstrap-server localhost:9092 --list
```

#### 4. Проблемы с SSL
```bash
# Проверка сертификатов
openssl x509 -in ssl/fullchain.pem -text -noout
```

## Контакты

Для получения помощи по конфигурации:
- **Email**: support@ok-telecom.ru
- **Документация**: `/docs` в корне проекта