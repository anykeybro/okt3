# Исправление проблемы бесконечных логов Prisma

## Проблема

При запуске сервера (`yarn dev:server`) происходили бесконечные логи с сообщениями:

```
prisma:query db.notification_templates.aggregate([...])
```

Это приводило к спаму в консоли и затрудняло отладку.

## Причины

1. **Включено логирование всех Prisma запросов** в `packages/app-server/src/common/database.ts`
2. **Периодический мониторинг** пытался получить метрики из недоступной базы данных
3. **Множественный запуск мониторинга** при каждом создании маршрутов

## Исправления

### 1. Отключено избыточное логирование Prisma

**Файл**: `packages/app-server/src/common/database.ts`

Изменено с:
```typescript
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

На:
```typescript
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['info', 'warn', 'error'] // Отключаем 'query' для уменьшения спама
    : ['warn', 'error'], // В продакшене только важные сообщения
});
```

### 2. Добавлена проверка подключения к БД в мониторинге

**Файл**: `packages/app-server/src/modules/monitoring/monitoring.service.ts`

Добавлена проверка подключения к базе данных перед выполнением запросов:

```typescript
setInterval(async () => {
  try {
    // Проверяем подключение к базе данных перед получением метрик
    await this.prisma.$runCommandRaw({ ping: 1 });
    const metrics = await this.getAllMetrics();
    await this.sendToZabbix(metrics);
  } catch (error) {
    // Логируем ошибку, но не спамим в консоль
    if (error instanceof Error && !error.message.includes('Server selection timeout')) {
      mainLogger.error('Ошибка периодического мониторинга', error as Error);
    }
  }
}, interval);
```

### 3. Предотвращен множественный запуск мониторинга

Добавлена проверка для предотвращения множественного запуска:

```typescript
export class MonitoringService {
  private monitoringStarted = false;
  
  startPeriodicMonitoring(): void {
    // Предотвращаем множественный запуск
    if (this.monitoringStarted) {
      return;
    }
    
    this.monitoringStarted = true;
    // ... остальной код
  }
}
```

## Результат

После применения исправлений:

1. ✅ Убран спам Prisma запросов в консоли
2. ✅ Мониторинг не пытается выполнять запросы к недоступной БД
3. ✅ Предотвращен множественный запуск мониторинга
4. ✅ Сохранено логирование важных событий (info, warn, error)

## Рекомендации

1. **Для разработки**: Используйте `directConnection=true` в DATABASE_URL
2. **Для отладки Prisma**: Временно включите `'query'` в логах
3. **Для продакшена**: Используйте минимальное логирование для производительности

## Дополнительная информация

- Логирование Prisma настраивается в `packages/app-server/src/common/database.ts`
- Мониторинг запускается в `packages/app-server/src/modules/monitoring/monitoring.routes.ts`
- Интервал мониторинга настраивается в `config.monitoring.healthCheckInterval`