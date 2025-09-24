# Рефакторинг переменных окружения

## Описание изменений

Проведен рефакторинг конфигурации для разделения чувствительных данных и обычных настроек конфигурации.

## Что изменилось

### .env файлы
Теперь содержат **только чувствительные данные**, которые не должны попадать в репозиторий:

#### .env.development
```bash
# Учетные данные базы данных
POSTGRES_USER=zabbix
POSTGRES_PASSWORD=zabbix_pwd
POSTGRES_DB=zabbix

# Учетные данные администраторов
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
GRAFANA_ZABBIX_USER=Admin
GRAFANA_ZABBIX_PASSWORD=zabbix
```

#### .env.production
```bash
# Учетные данные базы данных
POSTGRES_USER=zabbix
POSTGRES_PASSWORD=your_secure_password_here_change_me
POSTGRES_DB=zabbix

# Учетные данные администраторов
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your_secure_grafana_password_here_change_me
GRAFANA_ZABBIX_USER=Admin
GRAFANA_ZABBIX_PASSWORD=your_secure_password_here_change_me
```

### Docker Compose файлы
Все остальные настройки (порты, имена контейнеров, настройки производительности) перенесены непосредственно в docker-compose файлы как статические значения.

## Преимущества

1. **Безопасность**: В .env файлах остались только пароли и другие чувствительные данные
2. **Простота**: Не нужно настраивать множество переменных окружения для базовой конфигурации
3. **Прозрачность**: Все настройки видны непосредственно в docker-compose файлах
4. **Версионирование**: Основная конфигурация теперь версионируется в git

## Что нужно сделать при развертывании

1. Скопировать `.env.development.example` в `.env.development` для разработки
2. Скопировать `.env.production.example` в `.env.production` для продакшена
3. Изменить пароли в .env файлах на безопасные значения
4. Убедиться, что .env файлы добавлены в .gitignore

## Структура конфигурации

### Чувствительные данные (в .env)
- Логины и пароли базы данных
- Логины и пароли администраторов
- Имена баз данных
- API ключи (если будут добавлены)

### Обычные настройки (в docker-compose)
- Порты сервисов
- Имена контейнеров
- Настройки производительности
- Пути к файлам
- Временные зоны
- Размеры кэшей