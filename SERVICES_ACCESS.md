# Доступ к сервисам мониторинга

## 🌐 URL сервисов

### Zabbix
- **URL**: http://localhost/zabbix/
- **Логин**: Admin
- **Пароль**: zabbix (разработка) / из .env.production (продакшен)
- **Описание**: Система мониторинга и сбора метрик

### Grafana
- **URL**: http://localhost:3000
- **Логин**: admin
- **Пароль**: admin (разработка) / из .env.production (продакшен)
- **Описание**: Система визуализации данных из Zabbix

### PostgreSQL
- **Host**: localhost
- **Port**: 5432
- **Database**: zabbix
- **Username**: zabbix
- **Password**: zabbix_pwd (разработка) / из .env.production (продакшен)

## 🚀 Быстрый запуск

```bash
# Разработка
docker-compose -f docker-compose.dev.yml --env-file .env.development up -d

# Продакшен
docker-compose -f docker-compose.production.yml --env-file .env.production up -d
```

## ✅ Проверка работоспособности

```bash
# Проверить статус контейнеров
docker-compose -f docker-compose.dev.yml --env-file .env.development ps

# Проверить доступность Zabbix
curl -I http://localhost/zabbix/

# Проверить доступность Grafana
curl -I http://localhost/grafana/
```

## 📊 Первые шаги

1. **Zabbix**: Войдите и настройте мониторинг хостов
2. **Grafana**: Подключите источник данных Zabbix и создайте дашборды
3. **Интеграция**: Используйте данные из Zabbix для создания красивых графиков в Grafana

## 📚 Документация

- [ZABBIX_README.md](ZABBIX_README.md) - Подробная настройка Zabbix
- [GRAFANA_README.md](GRAFANA_README.md) - Подробная настройка Grafana
- [GRAFANA_SETUP.md](GRAFANA_SETUP.md) - Быстрая настройка Grafana с Zabbix