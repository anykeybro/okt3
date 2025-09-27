# Руководство по развертыванию - OK-Telecom Биллинг-система

## Обзор

Данное руководство описывает процесс развертывания биллинг-системы OK-Telecom в production и development окружениях.

## Системные требования

### Минимальные требования

#### Сервер приложений
- **CPU**: 4 ядра (2.4 GHz+)
- **RAM**: 8 GB
- **Диск**: 100 GB SSD
- **ОС**: Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+

#### База данных (MongoDB)
- **CPU**: 2 ядра (2.4 GHz+)
- **RAM**: 4 GB
- **Диск**: 50 GB SSD (с возможностью расширения)

#### Kafka (опционально)
- **CPU**: 2 ядра
- **RAM**: 2 GB
- **Диск**: 20 GB SSD

### Рекомендуемые требования

#### Сервер приложений
- **CPU**: 8 ядер (3.0 GHz+)
- **RAM**: 16 GB
- **Диск**: 200 GB NVMe SSD

#### База данных (MongoDB Replica Set)
- **3 сервера** с характеристиками:
  - **CPU**: 4 ядра (2.8 GHz+)
  - **RAM**: 8 GB
  - **Диск**: 100 GB NVMe SSD

## Предварительная подготовка

### 1. Установка Docker и Docker Compose

#### Ubuntu/Debian
```bash
# Обновление пакетов
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### CentOS/RHEL
```bash
# Установка Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Windows Server
1. Установите Docker Desktop for Windows
2. Включите WSL2 backend
3. Установите Docker Compose (входит в Docker Desktop)

### 2. Установка Node.js и Yarn

#### Ubuntu/Debian
```bash
# Установка Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка Yarn
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt update && sudo apt install yarn
```

#### Windows
1. Скачайте и установите Node.js 18.x с официального сайта
2. Установите Yarn: `npm install -g yarn`

### 3. Настройка файрвола

```bash
# Открытие необходимых портов
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # app-web
sudo ufw allow 3001/tcp    # app-server
sudo ufw allow 3002/tcp    # app-web-billing
sudo ufw allow 27017/tcp   # MongoDB (только для внутренней сети)
sudo ufw allow 9092/tcp    # Kafka (только для внутренней сети)
sudo ufw enable
```

## Развертывание в Development окружении

### 1. Клонирование репозитория

```bash
git clone <repository-url> ok-telecom-billing
cd ok-telecom-billing
```

### 2. Настройка переменных окружения

```bash
# Копирование примеров конфигурации
cp .env.development.example .env.development

# Редактирование конфигурации
nano .env.development
```

### 3. Установка зависимостей

```bash
# Установка зависимостей для всех пакетов
yarn install

# Генерация Prisma клиента
yarn workspace app-server db:generate
```

### 4. Запуск MongoDB

```bash
# Запуск MongoDB через Docker
docker-compose -f docker-compose.dev.yml up -d mongodb-primary mongodb-secondary mongodb-arbiter

# Ожидание запуска (30 секунд)
sleep 30

# Инициализация replica set
yarn workspace app-server db:indexes
```

### 5. Запуск Kafka (опционально)

```bash
# Запуск Kafka
docker-compose -f docker-compose.dev.yml up -d zookeeper kafka

# Ожидание запуска
sleep 20
```

### 6. Инициализация базы данных

```bash
# Создание индексов
yarn workspace app-server db:indexes

# Заполнение начальными данными
yarn workspace app-server db:seed
```

### 7. Запуск приложений

```bash
# Запуск всех сервисов в development режиме
yarn dev

# Или запуск отдельных сервисов
yarn workspace app-server dev      # API сервер (порт 3001)
yarn workspace app-web dev         # Публичный сайт (порт 3000)
yarn workspace app-web-billing dev # Админка (порт 3002)
```

### 8. Проверка работоспособности

```bash
# Проверка API сервера
curl http://localhost:3001/health

# Проверка веб-приложений
curl http://localhost:3000
curl http://localhost:3002
```

## Развертывание в Production окружении

### 1. Подготовка сервера

```bash
# Создание пользователя для приложения
sudo useradd -m -s /bin/bash oktelecom
sudo usermod -aG docker oktelecom

# Создание директорий
sudo mkdir -p /opt/ok-telecom
sudo chown oktelecom:oktelecom /opt/ok-telecom

# Переключение на пользователя приложения
sudo su - oktelecom
cd /opt/ok-telecom
```

### 2. Клонирование и настройка

```bash
# Клонирование репозитория
git clone <repository-url> .

# Настройка production конфигурации
cp .env.production.example .env.production
nano .env.production
```

### 3. Настройка SSL сертификатов

#### Использование Let's Encrypt
```bash
# Установка Certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com -d admin.yourdomain.com

# Копирование сертификатов
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/ok-telecom/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/ok-telecom/ssl/
sudo chown oktelecom:oktelecom /opt/ok-telecom/ssl/*
```

### 4. Сборка приложений

```bash
# Установка зависимостей
yarn install --production=false

# Сборка всех приложений
yarn build

# Генерация Prisma клиента
yarn workspace app-server db:generate
```

### 5. Запуск production сервисов

```bash
# Запуск всех сервисов
docker-compose -f docker-compose.production.yml up -d

# Проверка статуса
docker-compose -f docker-compose.production.yml ps
```

### 6. Настройка Nginx (обратный прокси)

```bash
# Установка Nginx
sudo apt install nginx

# Копирование конфигурации
sudo cp nginx/nginx.conf /etc/nginx/nginx.conf
sudo cp nginx/*.conf /etc/nginx/sites-available/

# Активация сайтов
sudo ln -s /etc/nginx/sites-available/web-proxy.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/billing-proxy.conf /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/server-proxy.conf /etc/nginx/sites-enabled/

# Проверка конфигурации
sudo nginx -t

# Перезапуск Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 7. Настройка мониторинга

#### Zabbix Agent
```bash
# Установка Zabbix Agent
wget https://repo.zabbix.com/zabbix/6.0/ubuntu/pool/main/z/zabbix-release/zabbix-release_6.0-4+ubuntu20.04_all.deb
sudo dpkg -i zabbix-release_6.0-4+ubuntu20.04_all.deb
sudo apt update
sudo apt install zabbix-agent

# Настройка агента
sudo nano /etc/zabbix/zabbix_agentd.conf
# Server=your-zabbix-server-ip
# ServerActive=your-zabbix-server-ip
# Hostname=ok-telecom-billing

sudo systemctl restart zabbix-agent
sudo systemctl enable zabbix-agent
```

#### Grafana и Zabbix Server (опционально)
```bash
# Запуск мониторинга
docker-compose -f docker-compose.production.yml up -d grafana zabbix-server zabbix-web
```

### 8. Настройка автозапуска

```bash
# Создание systemd сервиса
sudo tee /etc/systemd/system/ok-telecom.service > /dev/null <<EOF
[Unit]
Description=OK-Telecom Billing System
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/ok-telecom
ExecStart=/usr/local/bin/docker-compose -f docker-compose.production.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.production.yml down
User=oktelecom
Group=oktelecom

[Install]
WantedBy=multi-user.target
EOF

# Активация сервиса
sudo systemctl daemon-reload
sudo systemctl enable ok-telecom.service
sudo systemctl start ok-telecom.service
```

## Настройка резервного копирования

### 1. Резервное копирование MongoDB

```bash
# Создание скрипта резервного копирования
sudo tee /opt/ok-telecom/scripts/backup-mongodb.sh > /dev/null <<'EOF'
#!/bin/bash

BACKUP_DIR="/opt/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mongodb_backup_$DATE"

# Создание директории для бэкапов
mkdir -p $BACKUP_DIR

# Создание бэкапа
docker exec mongodb-primary mongodump --out /tmp/$BACKUP_NAME
docker cp mongodb-primary:/tmp/$BACKUP_NAME $BACKUP_DIR/

# Сжатие бэкапа
cd $BACKUP_DIR
tar -czf $BACKUP_NAME.tar.gz $BACKUP_NAME
rm -rf $BACKUP_NAME

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
EOF

chmod +x /opt/ok-telecom/scripts/backup-mongodb.sh
```

### 2. Настройка cron для автоматического резервного копирования

```bash
# Добавление задачи в cron (ежедневно в 2:00)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/ok-telecom/scripts/backup-mongodb.sh") | crontab -
```

### 3. Резервное копирование конфигурации

```bash
# Создание скрипта для бэкапа конфигурации
sudo tee /opt/ok-telecom/scripts/backup-config.sh > /dev/null <<'EOF'
#!/bin/bash

BACKUP_DIR="/opt/backups/config"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="config_backup_$DATE"

mkdir -p $BACKUP_DIR

# Создание архива с конфигурацией
tar -czf $BACKUP_DIR/$BACKUP_NAME.tar.gz \
  .env.production \
  nginx/ \
  ssl/ \
  docker-compose.production.yml

echo "Config backup completed: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
EOF

chmod +x /opt/ok-telecom/scripts/backup-config.sh
```

## Обновление системы

### 1. Создание скрипта обновления

```bash
sudo tee /opt/ok-telecom/scripts/update.sh > /dev/null <<'EOF'
#!/bin/bash

set -e

echo "Начало обновления OK-Telecom Billing System..."

# Создание бэкапа перед обновлением
./scripts/backup-mongodb.sh
./scripts/backup-config.sh

# Остановка сервисов
docker-compose -f docker-compose.production.yml down

# Обновление кода
git pull origin main

# Установка зависимостей
yarn install --production=false

# Сборка приложений
yarn build

# Генерация Prisma клиента
yarn workspace app-server db:generate

# Запуск миграций (если есть)
# yarn workspace app-server db:migrate

# Запуск сервисов
docker-compose -f docker-compose.production.yml up -d

# Проверка здоровья системы
sleep 30
curl -f http://localhost:3001/health || exit 1

echo "Обновление завершено успешно!"
EOF

chmod +x /opt/ok-telecom/scripts/update.sh
```

### 2. Процедура обновления

```bash
# Переход в директорию приложения
cd /opt/ok-telecom

# Запуск обновления
./scripts/update.sh
```

## Мониторинг и логи

### 1. Просмотр логов

```bash
# Логи всех сервисов
docker-compose -f docker-compose.production.yml logs -f

# Логи конкретного сервиса
docker-compose -f docker-compose.production.yml logs -f app-server

# Логи Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Мониторинг ресурсов

```bash
# Использование ресурсов контейнерами
docker stats

# Использование диска
df -h

# Использование памяти
free -h

# Загрузка CPU
top
```

### 3. Health checks

```bash
# Проверка API сервера
curl http://localhost:3001/health

# Проверка MongoDB
docker exec mongodb-primary mongo --eval "db.adminCommand('ping')"

# Проверка Kafka
docker exec kafka kafka-topics.sh --bootstrap-server localhost:9092 --list
```

## Устранение неполадок

### 1. Проблемы с MongoDB

#### Replica Set не инициализирован
```bash
# Подключение к primary узлу
docker exec -it mongodb-primary mongo

# Инициализация replica set
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb-primary:27017" },
    { _id: 1, host: "mongodb-secondary:27018" },
    { _id: 2, host: "mongodb-arbiter:27019", arbiterOnly: true }
  ]
})
```

#### Проблемы с подключением
```bash
# Проверка статуса контейнеров
docker-compose ps

# Проверка логов MongoDB
docker-compose logs mongodb-primary

# Проверка сетевого подключения
docker exec app-server ping mongodb-primary
```

### 2. Проблемы с Kafka

#### Kafka не запускается
```bash
# Проверка Zookeeper
docker-compose logs zookeeper

# Очистка логов Kafka (ВНИМАНИЕ: потеря данных!)
docker-compose down
docker volume rm ok-telecom_kafka-data
docker-compose up -d zookeeper kafka
```

### 3. Проблемы с приложениями

#### Ошибки сборки
```bash
# Очистка node_modules и пересборка
rm -rf node_modules packages/*/node_modules
yarn install
yarn build
```

#### Проблемы с памятью
```bash
# Увеличение лимита памяти для Node.js
export NODE_OPTIONS="--max-old-space-size=4096"
yarn build
```

### 4. Проблемы с SSL

#### Обновление сертификатов Let's Encrypt
```bash
# Обновление сертификатов
sudo certbot renew

# Копирование обновленных сертификатов
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/ok-telecom/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/ok-telecom/ssl/

# Перезапуск Nginx
sudo systemctl reload nginx
```

## Безопасность

### 1. Настройка файрвола

```bash
# Закрытие прямого доступа к внутренним сервисам
sudo ufw deny 27017  # MongoDB
sudo ufw deny 9092   # Kafka
sudo ufw deny 3001   # app-server (доступ только через Nginx)
```

### 2. Настройка fail2ban

```bash
# Установка fail2ban
sudo apt install fail2ban

# Создание конфигурации для Nginx
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

sudo systemctl restart fail2ban
```

### 3. Регулярные обновления безопасности

```bash
# Автоматические обновления безопасности
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Производительность

### 1. Оптимизация MongoDB

```bash
# Настройка индексов (выполняется автоматически при запуске)
yarn workspace app-server db:indexes

# Мониторинг производительности запросов
docker exec mongodb-primary mongo --eval "db.setProfilingLevel(1, {slowms: 100})"
```

### 2. Оптимизация Nginx

```bash
# Включение сжатия и кеширования (уже настроено в конфигурации)
# Мониторинг производительности
sudo tail -f /var/log/nginx/access.log | grep -E "HTTP/[0-9.]+ [45][0-9][0-9]"
```

### 3. Мониторинг производительности приложений

```bash
# Использование PM2 для production (альтернатива Docker)
npm install -g pm2
pm2 start ecosystem.config.js
pm2 monit
```

## Контакты и поддержка

- **Техническая поддержка**: support@ok-telecom.ru
- **Документация**: `/docs` в корне проекта
- **Мониторинг**: `http://localhost/grafana` (admin/admin)
- **Zabbix**: `http://localhost/zabbix` (Admin/zabbix)

## Чек-лист развертывания

### Development
- [ ] Docker и Docker Compose установлены
- [ ] Node.js 18+ и Yarn установлены
- [ ] Репозиторий склонирован
- [ ] `.env.development` настроен
- [ ] Зависимости установлены (`yarn install`)
- [ ] MongoDB запущен и инициализирован
- [ ] Kafka запущен (опционально)
- [ ] База данных инициализирована (`yarn workspace app-server db:seed`)
- [ ] Приложения запущены (`yarn dev`)
- [ ] Health checks проходят

### Production
- [ ] Сервер подготовлен (пользователь, директории, файрвол)
- [ ] SSL сертификаты настроены
- [ ] `.env.production` настроен
- [ ] Приложения собраны (`yarn build`)
- [ ] Docker Compose запущен
- [ ] Nginx настроен и запущен
- [ ] Мониторинг настроен (Zabbix, Grafana)
- [ ] Резервное копирование настроено
- [ ] Автозапуск настроен (systemd)
- [ ] Health checks проходят
- [ ] SSL сертификаты работают
- [ ] Логи пишутся корректно