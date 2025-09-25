# Структура пакетов

Проект содержит три основных пакета в директории `packages/`:

## 1. app-server
**Технологии:** Node.js, TypeScript, Prisma, MongoDB, Express

**Порт:** 3001

**Описание:** Серверное приложение для обработки API запросов и работы с базой данных MongoDB.

### Основные файлы:
- `src/index.ts` - точка входа сервера
- `prisma/schema.prisma` - схема базы данных
- `package.json` - зависимости и скрипты

### Команды:
```bash
cd packages/app-server
npm run dev          # запуск в режиме разработки
npm run build        # сборка проекта
npm run db:generate  # генерация Prisma клиента
npm run db:push      # применение схемы к БД
```

## 2. app-web-billing
**Технологии:** Next.js 15, App Router, FSD архитектура, TanStack React Query, MUI

**Порт:** 3002

**Описание:** Веб-приложение для управления биллингом с современной архитектурой FSD.

### Структура FSD:
- `src/app/` - конфигурация приложения
- `src/shared/` - общие компоненты и утилиты
- `src/entities/` - бизнес-сущности
- `src/features/` - функциональные возможности
- `src/widgets/` - составные компоненты
- `src/pages/` - страницы приложения

### Команды:
```bash
cd packages/app-web-billing
npm run dev    # запуск в режиме разработки
npm run build  # сборка для продакшена
```

## 3. app-web
**Технологии:** Next.js 15, App Router, FSD архитектура, TanStack React Query, MUI

**Порт:** 3003

**Описание:** Основное веб-приложение с аналогичной архитектурой.

### Структура аналогична app-web-billing

### Команды:
```bash
cd packages/app-web
npm run dev    # запуск в режиме разработки
npm run build  # сборка для продакшена
```

## Переменные окружения

Все чувствительные данные должны храниться в файлах:
- `.env.development` - для разработки
- `.env.production` - для продакшена

### Необходимые переменные:
```
DATABASE_URL=mongodb://localhost:27017/myapp
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Установка зависимостей

Для установки зависимостей во всех пакетах из корня проекта:
```bash
yarn install
```

Или для каждого пакета отдельно:
```bash
cd packages/app-server && npm install
cd packages/app-web-billing && npm install  
cd packages/app-web && npm install
```