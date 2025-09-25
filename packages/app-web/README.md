# App Web

Основное веб-приложение на Next.js 15 с FSD архитектурой.

## Технологии
- Next.js 15 (App Router)
- React 18
- TypeScript
- MUI (Material-UI)
- TanStack React Query
- FSD архитектура

## Установка

```bash
npm install
```

## Запуск

### Разработка
```bash
npm run dev
```
Приложение будет доступно по адресу: http://localhost:3003

### Продакшен
```bash
npm run build
npm start
```

## Архитектура FSD

Проект использует Feature-Sliced Design архитектуру:

```
src/
  app/              # конфигурация приложения
  shared/           # общие компоненты и утилиты
    config/         # конфигурация (темы, константы)
    ui/             # переиспользуемые UI компоненты
    api/            # API клиенты
  entities/         # бизнес-сущности
  features/         # функциональные возможности
  widgets/          # составные компоненты
  pages/            # страницы приложения
```

## Настройка темы

Тема MUI настраивается в файле `src/shared/config/mui.theme.ts`

## Переменные окружения

- `NEXT_PUBLIC_API_URL` - URL API сервера