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
      permissions: ['dashboard:read', 'clients:read', 'clients:write']
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