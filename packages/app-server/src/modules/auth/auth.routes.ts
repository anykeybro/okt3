// Маршруты для модуля аутентификации
import { Router } from 'express';
import { AuthController } from './auth.controller';
import { 
  authenticateToken, 
  authorize, 
  requireSuperAdmin, 
  auditLog, 
  rateLimit,
  checkSystemInitialization,
  validateRequest,
  validateParams
} from './auth.middleware';
import { Resources, Actions } from './auth.types';
import {
  loginSchema,
  refreshTokenSchema,
  initializeSystemSchema,
  createUserSchema,
  updateUserSchema,
  createRoleSchema,
  updateRoleSchema,
  objectIdSchema
} from './auth.validation';

const router = Router();
const authController = new AuthController();

// Применяем rate limiting ко всем маршрутам
router.use(rateLimit(100, 15 * 60 * 1000)); // 100 запросов за 15 минут

// === Публичные маршруты (без аутентификации) ===

// Проверка инициализации системы
router.get('/check-initialization', authController.checkInitialization);

// Инициализация системы (создание первого администратора)
router.post('/initialize', 
  validateRequest(initializeSystemSchema), 
  authController.initializeSystem
);

// Вход в систему
router.post('/login', 
  checkSystemInitialization, 
  validateRequest(loginSchema), 
  authController.login
);

// Обновление токена
router.post('/refresh-token', 
  validateRequest(refreshTokenSchema), 
  authController.refreshToken
);

// === Защищенные маршруты (требуют аутентификации) ===

// Получение профиля текущего пользователя
router.get('/profile', authenticateToken, authController.getProfile);

// Выход из системы
router.post('/logout', authenticateToken, authController.logout);

// === Управление пользователями (только для суперадмина) ===

// Получение списка пользователей
router.get('/users', 
  authenticateToken, 
  authorize(Resources.USERS, Actions.READ),
  auditLog('Просмотр списка пользователей'),
  authController.getUsers
);

// Получение пользователя по ID
router.get('/users/:id', 
  authenticateToken, 
  authorize(Resources.USERS, Actions.READ),
  validateParams(objectIdSchema),
  auditLog('Просмотр пользователя'),
  authController.getUserById
);

// Создание нового пользователя
router.post('/users', 
  authenticateToken, 
  authorize(Resources.USERS, Actions.CREATE),
  validateRequest(createUserSchema),
  auditLog('Создание пользователя'),
  authController.createUser
);

// Обновление пользователя
router.put('/users/:id', 
  authenticateToken, 
  authorize(Resources.USERS, Actions.UPDATE),
  validateParams(objectIdSchema),
  validateRequest(updateUserSchema),
  auditLog('Обновление пользователя'),
  authController.updateUser
);

// Удаление пользователя
router.delete('/users/:id', 
  authenticateToken, 
  authorize(Resources.USERS, Actions.DELETE),
  validateParams(objectIdSchema),
  auditLog('Удаление пользователя'),
  authController.deleteUser
);

// === Управление ролями (только для суперадмина) ===

// Получение списка ролей
router.get('/roles', 
  authenticateToken, 
  authorize(Resources.USERS, Actions.READ),
  auditLog('Просмотр списка ролей'),
  authController.getRoles
);

// Получение роли по ID
router.get('/roles/:id', 
  authenticateToken, 
  authorize(Resources.USERS, Actions.READ),
  validateParams(objectIdSchema),
  auditLog('Просмотр роли'),
  authController.getRoleById
);

// Создание новой роли
router.post('/roles', 
  authenticateToken, 
  requireSuperAdmin,
  validateRequest(createRoleSchema),
  auditLog('Создание роли'),
  authController.createRole
);

// Обновление роли
router.put('/roles/:id', 
  authenticateToken, 
  requireSuperAdmin,
  validateParams(objectIdSchema),
  validateRequest(updateRoleSchema),
  auditLog('Обновление роли'),
  authController.updateRole
);

// Удаление роли
router.delete('/roles/:id', 
  authenticateToken, 
  requireSuperAdmin,
  validateParams(objectIdSchema),
  auditLog('Удаление роли'),
  authController.deleteRole
);

export default router;