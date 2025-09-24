# Проект с Yarn Workspace

Этот проект использует Yarn Workspace для управления монорепозиторием с несколькими пакетами.

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