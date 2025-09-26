# Модуль аутентификации и авторизации

## Обзор

Модуль аутентификации и авторизации обеспечивает безопасный доступ к системе биллинга OK-Telecom. Реализует JWT-токены, ролевую модель доступа (RBAC) и middleware для проверки прав.

## Основные компоненты

### AuthService
Основной сервис для работы с аутентификацией:
- Авторизация пользователей
- Создание и обновление JWT токенов
- Управление пользователями и ролями
- Инициализация системы

### AuthController
REST API контроллер:
- `POST /api/auth/login` - Вход в систему
- `POST /api/auth/refresh-token` - Обновление токена
- `GET /api/auth/profile` - Профиль пользователя
- `POST /api/auth/initialize` - Инициализация системы
- CRUD операции для пользователей и ролей

### Middleware
- `authenticateToken` - Проверка JWT токена
- `authorize` - Проверка прав доступа
- `requireSuperAdmin` - Проверка прав суперадмина
- `checkSystemInitialization` - Проверка инициализации системы
- `rateLimit` - Ограничение частоты запросов
- `validateRequest` - Валидация данных запроса

## Ролевая модель (RBAC)

### Предустановленные роли

#### Суперадмин
- Полный доступ ко всем функциям системы
- Управление пользователями и ролями
- Настройка системы

#### Кассир
- Работа с платежами и клиентами
- Просмотр и обновление данных абонентов
- Создание платежей

#### Монтажник
- Работа с заявками
- Создание и обновление абонентов
- Просмотр устройств

### Ресурсы системы
- `users` - Пользователи системы
- `clients` - Абоненты
- `accounts` - Лицевые счета
- `tariffs` - Тарифы и услуги
- `devices` - Сетевые устройства
- `requests` - Заявки
- `payments` - Платежи
- `notifications` - Уведомления
- `dashboard` - Панель управления
- `settings` - Настройки

### Действия
- `create` - Создание
- `read` - Чтение
- `update` - Обновление
- `delete` - Удаление
- `manage` - Полный доступ

## Безопасность

### JWT токены
- Access token: срок действия 24 часа
- Refresh token: срок действия 7 дней
- Подпись токенов секретным ключом

### Хеширование паролей
- Использование bcrypt с 12 раундами
- Соль генерируется автоматически

### Rate Limiting
- 100 запросов за 15 минут по умолчанию
- Настраивается для каждого эндпоинта

### Валидация данных
- Joi схемы для всех входных данных
- Проверка типов и форматов
- Санитизация входных данных

## Инициализация системы

При первом запуске система проверяет наличие администраторов:
1. Если администраторов нет - требует инициализации
2. Создаются стандартные роли
3. Создается первый суперадмин

## API Endpoints

### Публичные
- `GET /api/auth/check-initialization` - Проверка инициализации
- `POST /api/auth/initialize` - Инициализация системы
- `POST /api/auth/login` - Вход в систему
- `POST /api/auth/refresh-token` - Обновление токена

### Защищенные
- `GET /api/auth/profile` - Профиль пользователя
- `POST /api/auth/logout` - Выход из системы

### Управление пользователями (требует права на users)
- `GET /api/auth/users` - Список пользователей
- `GET /api/auth/users/:id` - Пользователь по ID
- `POST /api/auth/users` - Создание пользователя
- `PUT /api/auth/users/:id` - Обновление пользователя
- `DELETE /api/auth/users/:id` - Удаление пользователя

### Управление ролями (требует права суперадмина)
- `GET /api/auth/roles` - Список ролей
- `GET /api/auth/roles/:id` - Роль по ID
- `POST /api/auth/roles` - Создание роли
- `PUT /api/auth/roles/:id` - Обновление роли
- `DELETE /api/auth/roles/:id` - Удаление роли

## Использование в коде

### Защита маршрутов
```typescript
import { authenticateToken, authorize } from './modules/auth';
import { Resources, Actions } from './modules/auth/auth.types';

// Требует аутентификации
router.get('/protected', authenticateToken, handler);

// Требует права на чтение клиентов
router.get('/clients', 
  authenticateToken, 
  authorize(Resources.CLIENTS, Actions.READ), 
  handler
);
```

### Получение данных пользователя
```typescript
app.get('/profile', authenticateToken, (req, res) => {
  const user = req.user; // JwtPayload
  res.json({ userId: user.userId, username: user.username });
});
```

## Тестирование

Модуль покрыт unit тестами:
- `AuthService` - 15 тестов
- `AuthController` - 14 тестов  
- `AuthMiddleware` - 8 тестов

Запуск тестов:
```bash
yarn test
```

## Конфигурация

Переменные окружения:
```bash
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

## Логирование

Все действия пользователей логируются с помощью middleware `auditLog`:
- ID пользователя
- Имя пользователя
- Выполненное действие
- IP адрес
- User Agent
- Временная метка