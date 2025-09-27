# Исправление системы прав доступа в app-web-billing

## Проблема

В компоненте `ProtectedRoute` была ошибка в логике проверки прав доступа. Код пытался обратиться к `user.role.permissions`, но согласно API бэкенда:

- `role` - это строка (например, "admin"), а не объект
- `permissions` - это массив строк, находящийся прямо в объекте пользователя

## Структура ответа API

Бэкенд возвращает пользователя в следующем формате:

```json
{
  "success": true,
  "data": {
    "id": "1",
    "username": "admin",
    "email": "admin@example.com", 
    "role": "admin",
    "permissions": ["dashboard:read", "clients:read", "clients:write"]
  }
}
```

## Исправления

### 1. Исправлен тип `SystemUser`

**Было:**
```typescript
export interface SystemUser {
  id: string;
  username: string;
  role: Role; // объект
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

**Стало:**
```typescript
export interface SystemUser {
  id: string;
  username: string;
  email: string;
  role: string; // строка
  permissions: string[]; // массив прав доступа
}
```

### 2. Исправлена логика проверки прав в `ProtectedRoute`

**Было:**
```typescript
const userPermissions = user.role.permissions.flatMap(p => 
  p.actions.map(action => `${p.resource}:${action}`)
);
```

**Стало:**
```typescript
const userPermissions = user.permissions || [];
```

### 3. Исправлен хук `useAuth`

Добавлена правильная обработка ответа от API:

```typescript
queryFn: async () => {
  const response = await authApi.getCurrentUser();
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error('Failed to get user data');
}
```

### 4. Исправлены хуки для пагинированных данных

Исправлены хуки `useClients`, `useTariffs`, `useServices`, `useTariffGroups` для правильной обработки ответов API с пагинацией.

**Было:**
```typescript
return response.data; // неправильно
```

**Стало:**
```typescript
if (response.success && response.data && response.pagination) {
  return {
    items: response.data,
    total: response.pagination.total,
    page: response.pagination.page,
    pageSize: response.pagination.limit,
    totalPages: response.pagination.totalPages,
  };
}
```

### 5. Исправлена обработка данных в компонентах

Добавлены проверки на существование данных:

```typescript
{data?.items?.map((client: Client) => (
  // ...
  {client.accounts?.map(account => (
    // ...
  ))}
))}
```

## Результат

- ✅ Исправлена ошибка `Cannot read properties of undefined (reading 'map')`
- ✅ Правильная проверка прав доступа согласно API бэкенда
- ✅ Корректная обработка пагинированных данных
- ✅ Страницы app-web-billing теперь загружаются без ошибок

## Затронутые файлы

1. `packages/app-web-billing/src/shared/types/api.ts` - исправлен тип SystemUser
2. `packages/app-web-billing/src/shared/ui/ProtectedRoute/ProtectedRoute.tsx` - исправлена логика прав
3. `packages/app-web-billing/src/shared/hooks/useAuth.ts` - исправлена обработка ответа API
4. `packages/app-web-billing/src/shared/hooks/useClients.ts` - исправлена обработка пагинации
5. `packages/app-web-billing/src/shared/hooks/useTariffs.ts` - исправлена обработка пагинации
6. `packages/app-web-billing/src/app/clients/page.tsx` - добавлены проверки на undefined

## Дата исправления

27 сентября 2025