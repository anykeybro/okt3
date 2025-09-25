# Проект с Yarn Workspace и мониторингом

Этот проект использует Yarn Workspace для управления монорепозиторием с несколькими пакетами и включает систему мониторинга на базе Zabbix и Grafana.

## Структура проекта

```
├── packages/
│   ├── shared/          # Общие утилиты и компоненты
│   └── app/            # Основное приложение
├── package.json        # Корневой package.json с настройками workspace
└── tsconfig.json       # Общая конфигурация TypeScript
```

## Установка зависимостей

```bash
yarn install
```

## Доступные команды

### Сборка всех пакетов
```bash
yarn build
```

### Запуск тестов во всех пакетах
```bash
yarn test
```

### Запуск в режиме разработки
```bash
yarn dev
```

Эта команда запустит:
- Docker контейнеры (Zabbix, Grafana, PostgreSQL, nginx)
- Все локальные dev серверы:
  - app-web на порту 3003 (главное приложение)
  - app-server на порту 3001 (API сервер)
  - app-web-billing на порту 3002 (биллинг)

### Очистка сборочных файлов
```bash
yarn clean
```

## Работа с отдельными пакетами

### Запуск команд в конкретном пакете
```bash
yarn workspace @workspace/app dev
yarn workspace @workspace/shared build
```

### Добавление зависимостей в конкретный пакет
```bash
yarn workspace @workspace/app add lodash
yarn workspace @workspace/shared add -D jest
```

## Пакеты

### @workspace/shared
Содержит общие утилиты и компоненты, которые могут использоваться другими пакетами в workspace.

### @workspace/app
Основное приложение, которое использует пакет @workspace/shared.

## Разработка

1. Установите зависимости: `yarn install`
2. Соберите shared пакет: `yarn workspace @workspace/shared build`
3. Запустите приложение: `yarn workspace @workspace/app dev`

## Добавление новых пакетов

Для добавления нового пакета в workspace:

1. Создайте папку в `packages/`
2. Добавьте `package.json` с именем в формате `@workspace/package-name`
3. Убедитесь, что имя пакета уникально в рамках workspace
4. Запустите `yarn install` для обновления зависимостей

## Система мониторинга

Проект включает полную систему мониторинга:

### Zabbix
- Сервер мониторинга для сбора метрик
- Веб-интерфейс для управления
- Доступ: http://localhost/zabbix/
- Подробности в [ZABBIX_README.md](ZABBIX_README.md)

### Grafana
- Система визуализации данных из Zabbix
- Доступ: http://localhost:3000 или http://localhost/grafana/
- Подробности в [GRAFANA_README.md](GRAFANA_README.md)

### Запуск мониторинга

#### Разработка
```bash
docker-compose -f docker-compose.dev.yml --env-file .env.development up -d
```

#### Продакшен
```bash
docker-compose -f docker-compose.production.yml --env-file .env.production up -d
```

### Доступ к сервисам
- **App Web (главная)**: http://localhost/
- **App Server API**: http://localhost/api/ (например: http://localhost/api/health)
- **App Web Billing**: http://localhost/billing
- **Zabbix**: http://localhost/zabbix/ (Admin/zabbix)
- **Grafana**: http://localhost/grafana/ (admin/admin для разработки)
- PostgreSQL: localhost:5432

### Подробная документация
- [Руководство по разработке](docs/DEVELOPMENT_GUIDE.md)
- [Настройка App Web Billing](docs/APP_WEB_BILLING_DEV_SETUP.md)