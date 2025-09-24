# Документация проекта Kiro

## Описание

Этот проект настроен для работы с Yarn Workspace и содержит несколько пакетов в монорепозитории.

## Архитектура

### Пакеты

- **@workspace/shared** - Общие утилиты, типы и компоненты
- **@workspace/app** - Основное приложение

### Зависимости между пакетами

```
@workspace/app → @workspace/shared
```

## Команды для разработки

### Установка и настройка
```bash
yarn install
```

### Сборка проекта
```bash
# Сборка всех пакетов
yarn build

# Сборка конкретного пакета
yarn workspace @workspace/shared build
```

### Разработка
```bash
# Запуск в режиме разработки
yarn workspace @workspace/app dev

# Запуск с отслеживанием изменений
yarn workspace @workspace/shared dev
```

## Добавление новых функций

1. Общие утилиты добавляйте в `packages/shared/src/`
2. Логику приложения добавляйте в `packages/app/src/`
3. Не забывайте экспортировать новые функции из `index.ts`

## Тестирование

```bash
# Запуск всех тестов
yarn test

# Тесты конкретного пакета
yarn workspace @workspace/shared test
```