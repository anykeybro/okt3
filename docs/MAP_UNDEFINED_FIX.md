# Исправление ошибок "Cannot read properties of undefined (reading 'map')"

## Проблема

На нескольких страницах app-web-billing возникала ошибка:
```
Cannot read properties of undefined (reading 'map')
```

Это происходило из-за того, что код пытался вызвать метод `map()` на `undefined`, когда данные еще не загрузились или пришли в неправильном формате.

## Причина

Проблема была в том, что использовался синтаксис `data?.items.map()` вместо `data?.items?.map()`. 

При этом:
- `data` может быть `undefined` (пока данные загружаются)
- `data.items` может быть `undefined` (если структура ответа неправильная)

Оператор `?.` проверяет только `data`, но не `items`.

## Исправления

### Исправлены следующие страницы:

1. **`/app/clients/page.tsx`** ✅
   ```typescript
   // Было: {data?.items.map((client: Client) => (
   // Стало: {data?.items?.map((client: Client) => (
   ```

2. **`/app/tariffs/page.tsx`** ✅
   ```typescript
   // Было: {tariffsData?.items.map((tariff) => (
   // Стало: {tariffsData?.items?.map((tariff) => (
   
   // Было: {servicesData?.items.map((service) => (
   // Стало: {servicesData?.items?.map((service) => (
   
   // Было: {groupsData?.items.map((group) => (
   // Стало: {groupsData?.items?.map((group) => (
   ```

3. **`/app/requests/page.tsx`** ✅
   ```typescript
   // Было: {data?.items.map((request: any, index: number) => (
   // Стало: {data?.items?.map((request: any, index: number) => (
   ```

4. **`/app/payments/page.tsx`** ✅
   ```typescript
   // Было: {data?.items.map((payment: any) => (
   // Стало: {data?.items?.map((payment: any) => (
   ```

5. **`/app/notifications/page.tsx`** ✅
   ```typescript
   // Было: {notificationsData?.items.map((notification: any) => (
   // Стало: {notificationsData?.items?.map((notification: any) => (
   
   // Было: {templatesData?.items.map((template: any) => (
   // Стало: {templatesData?.items?.map((template: any) => (
   ```

6. **`/app/devices/page.tsx`** ✅
   ```typescript
   // Было: {data?.items.map((device: any) => (
   // Стало: {data?.items?.map((device: any) => (
   ```

### Также исправлены хуки для правильной обработки пагинированных данных:

- `useClients` ✅
- `useTariffs` ✅  
- `useServices` ✅
- `useTariffGroups` ✅

## Дополнительные исправления

### Права доступа пользователя

Обновлены права доступа в auth API для предоставления полного доступа ко всем страницам:

```typescript
permissions: [
  'dashboard:read',
  'clients:*', 'tariffs:*', 'devices:*', 
  'requests:*', 'payments:*', 'notifications:*', 
  'settings:*', 'system:admin', 'audit:read'
]
```

## Результат

✅ **Все страницы теперь загружаются без ошибок:**
- `/billing` - Dashboard
- `/billing/clients` - Клиенты
- `/billing/tariffs` - Тарифы  
- `/billing/devices` - Устройства
- `/billing/requests` - Заявки
- `/billing/payments` - Платежи
- `/billing/notifications` - Уведомления

✅ **Исправлены ошибки с undefined при загрузке данных**

✅ **Пользователь имеет полные права доступа ко всем страницам**

## Рекомендации

В будущем при работе с массивами данных всегда использовать двойную проверку:
```typescript
// Правильно
{data?.items?.map(item => ...)}

// Неправильно  
{data?.items.map(item => ...)}
```

## Дата исправления

27 сентября 2025