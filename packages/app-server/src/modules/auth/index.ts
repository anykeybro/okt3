// Auth модуль
import { Router } from 'express';
import { authMiddleware } from './middleware';

const router = Router();

// Логин (временная заглушка)
router.post('/login', (req, res) => {
  res.json({ 
    success: true,
    data: {
      token: 'temp_token_123',
      refreshToken: 'temp_refresh_123',
      user: {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin'
      }
    }
  });
});

// Логаут
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Получение текущего пользователя
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    success: true,
    data: {
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      permissions: [
        // Dashboard права
        'dashboard:read',
        
        // Клиенты права
        'clients:read',
        'clients:write',
        'clients:create',
        'clients:update',
        'clients:delete',
        
        // Тарифы права
        'tariffs:read',
        'tariffs:write',
        'tariffs:create',
        'tariffs:update',
        'tariffs:delete',
        
        // Устройства права
        'devices:read',
        'devices:write',
        'devices:create',
        'devices:update',
        'devices:delete',
        
        // Заявки права
        'requests:read',
        'requests:write',
        'requests:create',
        'requests:update',
        'requests:delete',
        
        // Платежи права
        'payments:read',
        'payments:write',
        'payments:create',
        'payments:update',
        'payments:delete',
        
        // Уведомления права
        'notifications:read',
        'notifications:write',
        'notifications:create',
        'notifications:update',
        'notifications:delete',
        
        // Настройки права
        'settings:read',
        'settings:write',
        'settings:create',
        'settings:update',
        'settings:delete',
        
        // Системные права
        'system:admin',
        'audit:read'
      ]
    }
  });
});

// Проверка токена
router.get('/verify', authMiddleware, (req, res) => {
  res.json({ success: true, valid: true });
});

// Обновление токена
router.post('/refresh', (req, res) => {
  res.json({
    success: true,
    data: {
      token: 'new_temp_token_456',
      refreshToken: 'new_temp_refresh_456'
    }
  });
});

// Смена пароля
router.post('/change-password', authMiddleware, (req, res) => {
  res.json({ success: true, message: 'Password changed successfully' });
});

export { router as authRoutes };
export * from './middleware';