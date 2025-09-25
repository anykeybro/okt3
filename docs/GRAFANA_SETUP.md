# Быстрая настройка Grafana с Zabbix

## Шаг 1: Запуск системы

```bash
# Разработка
docker-compose -f docker-compose.dev.yml --env-file .env.development up -d

# Продакшен
docker-compose -f docker-compose.production.yml --env-file .env.production up -d
```

## Шаг 2: Доступ к Grafana

1. Откройте браузер и перейдите на http://localhost/grafana/
2. Войдите с учетными данными:
   - **Разработка**: admin / admin
   - **Продакшен**: admin / пароль из .env.production

## Шаг 3: Настройка источника данных Zabbix

1. В Grafana перейдите в **Configuration** → **Data sources**
2. Нажмите **Add data source**
3. Найдите и выберите **Zabbix**
4. Заполните настройки:
   - **URL**: `http://zabbix-web:8080`
   - **Username**: `Admin`
   - **Password**: `zabbix` (для разработки) или пароль из .env.production
5. Нажмите **Save & Test**

## Шаг 4: Включение плагина Zabbix

1. Перейдите в **Configuration** → **Plugins**
2. Найдите **Zabbix** в списке установленных плагинов
3. Нажмите на плагин и затем **Enable**

## Шаг 5: Создание первого дашборда

1. Нажмите **+** → **Dashboard**
2. Нажмите **Add new panel**
3. В настройках панели:
   - Выберите **Data source**: Zabbix
   - Выберите **Group**: например, "Zabbix servers"
   - Выберите **Host**: ваш Zabbix сервер
   - Выберите **Item**: например, "CPU utilization"
4. Нажмите **Apply**

## Готовые дашборды

Рекомендуется импортировать готовые дашборды:

1. Перейдите в **+** → **Import**
2. Введите ID дашборда или загрузите JSON файл
3. Популярные дашборды для Zabbix:
   - **1860**: Node Exporter Full
   - **11074**: Zabbix Server Performance
   - **12787**: Zabbix Host Overview

## Полезные ссылки

- [Документация плагина Zabbix для Grafana](https://grafana.com/grafana/plugins/alexanderzobnin-zabbix-app/)
- [Готовые дашборды на Grafana.com](https://grafana.com/grafana/dashboards/)
- [Официальная документация Grafana](https://grafana.com/docs/grafana/latest/)

## Troubleshooting

### Не удается подключиться к Zabbix
- Убедитесь, что Zabbix веб-интерфейс доступен по адресу http://localhost/zabbix/
- Проверьте, что контейнеры запущены: `docker-compose ps`
- Проверьте логи: `docker logs grafana-dev`

### Плагин Zabbix не найден
- Перезапустите контейнер Grafana: `docker-compose restart grafana`
- Проверьте логи установки плагина: `docker logs grafana-dev | grep zabbix`