# Настройка Grafana для работы с Zabbix

## Описание

Grafana добавлена в Docker Compose конфигурацию для визуализации данных из Zabbix. Grafana автоматически настраивается с плагином Zabbix и подключается к серверу Zabbix.

## Доступ к Grafana

### Разработка
- **Прямой доступ**: http://localhost:3000 (рекомендуется)
- **Через nginx**: http://localhost/grafana/ (в разработке)
- Логин: admin
- Пароль: admin

### Продакшен
- **Прямой доступ**: http://localhost:3000 (рекомендуется)
- **Через nginx**: http://localhost/grafana/ (в разработке)
- Логин: admin
- Пароль: указан в переменной GRAFANA_ADMIN_PASSWORD в .env.production

**Примечание**: Доступ через nginx (localhost/grafana/) находится в стадии настройки. Для стабильной работы используйте прямой доступ на порту 3000.

## Автоматическая настройка

При запуске Grafana автоматически:
1. Устанавливает плагин Zabbix (alexanderzobnin-zabbix-app)
2. Настраивает источник данных Zabbix
3. Подключается к веб-интерфейсу Zabbix

## Настройка источника данных Zabbix

Источник данных Zabbix настраивается автоматически через provisioning файлы:
- URL: http://zabbix-web:8080
- Пользователь: Admin
- Пароль: берется из переменной GRAFANA_ZABBIX_PASSWORD

## Переменные окружения

### Разработка (.env.development)
```
GRAFANA_PORT=3000
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
GRAFANA_ZABBIX_URL=http://zabbix-web:8080
GRAFANA_ZABBIX_USER=Admin
GRAFANA_ZABBIX_PASSWORD=zabbix
GRAFANA_CONTAINER_NAME=grafana-dev
```

### Продакшен (.env.production)
```
GRAFANA_PORT=3000
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your_secure_grafana_password_here_change_me
GRAFANA_ZABBIX_URL=http://zabbix-web:8080
GRAFANA_ZABBIX_USER=Admin
GRAFANA_ZABBIX_PASSWORD=your_secure_password_here_change_me
GRAFANA_CONTAINER_NAME=grafana-prod
```

## Запуск

### Разработка
```bash
docker-compose -f docker-compose.dev.yml --env-file .env.development up -d
```

### Продакшен
```bash
docker-compose -f docker-compose.production.yml --env-file .env.production up -d
```

## Первоначальная настройка

1. Откройте Grafana в браузере
2. Войдите с учетными данными администратора
3. Перейдите в Configuration > Plugins
4. Найдите и включите плагин "Zabbix"
5. Источник данных Zabbix уже должен быть настроен автоматически

## Создание дашбордов

1. В Grafana перейдите в "+" > Dashboard
2. Добавьте новую панель
3. Выберите источник данных "Zabbix"
4. Настройте метрики и визуализацию

## Полезные дашборды

Рекомендуется импортировать готовые дашборды для Zabbix:
- Zabbix Server Performance
- Host Overview
- Network Interfaces
- System Performance

## Безопасность

### Для продакшена обязательно:
1. Измените пароль администратора Grafana
2. Измените пароль пользователя Zabbix
3. Настройте HTTPS
4. Ограничьте доступ к Grafana через firewall

## Логи

Логи Grafana сохраняются в:
- Разработка: Docker volume grafana_logs
- Продакшен: ./logs/grafana/

## Резервное копирование

Данные Grafana (дашборды, настройки) сохраняются в Docker volume grafana_data.
Для резервного копирования используйте:

```bash
docker run --rm -v grafana_data:/data -v $(pwd):/backup alpine tar czf /backup/grafana_backup.tar.gz -C /data .
```

## Восстановление

```bash
docker run --rm -v grafana_data:/data -v $(pwd):/backup alpine tar xzf /backup/grafana_backup.tar.gz -C /data
```

## Troubleshooting

### Grafana не может подключиться к Zabbix
1. Проверьте, что контейнеры находятся в одной сети
2. Убедитесь, что Zabbix веб-интерфейс доступен
3. Проверьте учетные данные в настройках источника данных

### Плагин Zabbix не установлен
1. Проверьте переменную окружения GF_INSTALL_PLUGINS
2. Перезапустите контейнер Grafana
3. Проверьте логи контейнера

### Нет данных в дашбордах
1. Убедитесь, что в Zabbix есть данные для отображения
2. Проверьте настройки источника данных
3. Проверьте права пользователя Zabbix