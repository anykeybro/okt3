# Система конфигурации app-server

## Обзор

Этот модуль содержит систему конфигурации для app-server с автоматической валидацией переменных окружения.

## Файлы

- `config.ts` - Основная конфигурация приложения
- `env-validator.ts` - Валидатор переменных окружения
- `README.md` - Эта документация

## Использование

### Импорт конфигурации

```typescript
import { config } from './config/config';

// Использование настроек
const port = config.server.port;
const dbUrl = config.database.url;
```

### Валидация

Валидация происходит автоматически при импорте `config.ts`. Для ручной валидации:

```typescript
import { validateEnvironment, printValidationResults } from './config/env-validator';

const result = validateEnvironment();
printValidationResults(result);
```

### Скрипты

```bash
# Валидация текущего окружения
yarn validate-env

# Валидация development
yarn validate-env:dev

# Валидация production
yarn validate-env:prod

# Генерация примера .env файла
yarn generate-env-example
```

## Добавление новых переменных

1. Добавьте правило в `env-validator.ts`:

```typescript
{
  name: 'NEW_VARIABLE',
  required: false,
  type: 'string',
  defaultValue: 'default_value',
  description: 'Описание переменной',
}
```

2. Добавьте в `config.ts`:

```typescript
export const config = {
  // ...
  newSection: {
    newVariable: process.env.NEW_VARIABLE || 'default_value',
  },
};
```

3. Обновите `.env.development` и `.env.production`

## Типы валидации

- `string` - Строка (не пустая)
- `number` - Число
- `boolean` - Булево значение ('true'/'false', '1'/'0')
- `url` - Валидный URL
- `email` - Валидный email
- `json` - Валидный JSON

## Кастомная валидация

```typescript
{
  name: 'PORT',
  required: true,
  type: 'number',
  validator: (value) => {
    const port = parseInt(value);
    return port >= 1024 && port <= 65535;
  },
  description: 'Порт должен быть в диапазоне 1024-65535',
}
```