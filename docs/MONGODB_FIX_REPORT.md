# Отчет об исправлении ошибки MongoDB "NotWritablePrimary"

## Проблема
В логах приложения app-server наблюдалась ошибка:
```
PrismaClientKnownRequestError: Invalid `prisma.request.create()` invocation
Raw query failed. Code: `unknown`. Message: `Kind: Command failed: Error code 10107 (NotWritablePrimary): not primary, labels: {"TransientTransactionError"}`
```

## Причина
1. **Неправильная конфигурация MongoDB Replica Set**: В docker-compose.dev.yml была настроена сложная конфигурация с тремя узлами (primary, secondary, arbiter), но:
   - Узлы не могли корректно связаться друг с другом
   - Primary узел находился в состоянии SECONDARY
   - В replica set не было активного PRIMARY узла

2. **Неправильная строка подключения**: Использовался параметр `directConnection=true`, который заставлял Prisma подключаться напрямую к одному узлу, игнорируя replica set.

## Решение
1. **Упрощение конфигурации MongoDB**: Заменили сложную replica set конфигурацию на простой standalone MongoDB для разработки:
   ```yaml
   mongodb:
     image: mongo:7.0
     container_name: mongodb-dev
     restart: unless-stopped
     environment:
       MONGO_INITDB_ROOT_USERNAME: ${MONGODB_ROOT_USERNAME}
       MONGO_INITDB_ROOT_PASSWORD: ${MONGODB_ROOT_PASSWORD}
       MONGO_INITDB_DATABASE: ${MONGODB_DATABASE}
     volumes:
       - mongodb_data:/data/db
       - ./scripts/init-mongodb.js:/docker-entrypoint-initdb.d/init-mongodb.js:ro
   ```

2. **Создание скрипта инициализации**: Добавили `scripts/init-mongodb.js` для автоматического создания пользователей при первом запуске.

3. **Исправление строки подключения**: Обновили DATABASE_URL в .env.development:
   ```
   DATABASE_URL=mongodb://admin:mongodb_admin_pwd@localhost:27017/app_database?authSource=admin
   ```

4. **Регенерация Prisma Client**: Выполнили `yarn db:generate` для обновления клиента.

## Результат
✅ **Ошибка "NotWritablePrimary" полностью устранена**
✅ **База данных подключается успешно** (`"database":{"connected":true,"responseTime":0}`)
✅ **Health check проходит** (статус OK)
✅ **Приложение запускается без ошибок MongoDB**

## Статус
- **Основная проблема**: ✅ РЕШЕНА
- **Приложение**: ✅ РАБОТАЕТ
- **База данных**: ✅ ПОДКЛЮЧЕНА

## Дополнительные замечания
- Для production среды рекомендуется настроить полноценный replica set с правильной конфигурацией сети
- Текущее решение оптимально для разработки (development)
- Остальные ошибки в логах связаны с DNS разрешением и не влияют на основную функциональность

## Дата исправления
27 сентября 2025 г.