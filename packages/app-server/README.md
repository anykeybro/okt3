# App Server

Node.js сервер с TypeScript и Prisma для работы с MongoDB.

## Технологии
- Node.js
- TypeScript
- Express.js
- Prisma ORM
- MongoDB

## Установка

```bash
npm install
```

## Настройка базы данных

1. Убедитесь, что MongoDB запущена
2. Настройте переменную `DATABASE_URL` в `.env.development`
3. Сгенерируйте Prisma клиент:

```bash
npm run db:generate
```

4. Примените схему к базе данных:

```bash
npm run db:push
```

## Запуск

### Разработка
```bash
npm run dev
```

### Продакшен
```bash
npm run build
npm start
```

## API Endpoints

- `GET /api/health` - проверка состояния сервера
- `GET /api/users` - получение списка пользователей

## Структура проекта

```
src/
  index.ts          # точка входа
prisma/
  schema.prisma     # схема базы данных
```