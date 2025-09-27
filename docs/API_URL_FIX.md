# Исправление дублирования /api в URL запросах app-web-billing

## Проблема

В приложении app-web-billing происходило дублирование `/api` в URL запросах. Вместо правильного URL `http://localhost/api/dashboard/stats` формировался неправильный URL `http://localhost/api/api/dashboard/stats`.

## Причина

Проблема была в методе `get` API клиента (`packages/app-web-billing/src/shared/api/client.ts`). 

В исходном коде:
```typescript
async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
  const url = new URL(endpoint, this.baseUrl);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return this.request<T>(url.pathname + url.search);
}
```

При использовании `new URL(endpoint, this.baseUrl)` и последующем вызове `url.pathname + url.search`, терялся базовый URL, что приводило к некорректному формированию итогового URL.

## Решение

Исправлен метод `get` в API клиенте:

```typescript
async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
  let finalEndpoint = endpoint;
  
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    
    const queryString = searchParams.toString();
    if (queryString) {
      finalEndpoint += (endpoint.includes('?') ? '&' : '?') + queryString;
    }
  }

  return this.request<T>(finalEndpoint);
}
```

## Конфигурация

Текущая конфигурация в `.env.development`:
```
NEXT_PUBLIC_API_URL=http://localhost
```

Базовый URL в конфигурации:
```typescript
baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'
```

Поскольку переменная `NEXT_PUBLIC_API_URL` установлена как `http://localhost`, базовый URL будет `http://localhost`.

## Результат

Теперь API запросы формируются корректно:
- `apiClient.get('/api/dashboard/stats')` → `http://localhost/api/dashboard/stats`
- `apiClient.get('/api/clients')` → `http://localhost/api/clients`
- И так далее для всех API методов

## Затронутые файлы

1. `packages/app-web-billing/src/shared/api/client.ts` - исправлен метод `get`

## Проверка

После исправления все API запросы в app-web-billing должны работать корректно:
- Dashboard API
- Clients API  
- Tariffs API
- Payments API
- Notifications API
- Devices API
- Auth API
- Requests API

## Дата исправления

27 сентября 2025