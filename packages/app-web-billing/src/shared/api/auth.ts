/**
 * API методы для аутентификации
 */

import { apiClient } from './client';
import type { LoginRequest, LoginResponse, SystemUser } from '../types/api';

export const authApi = {
  // Вход в систему
  async login(credentials: LoginRequest) {
    return apiClient.post<LoginResponse>('/api/auth/login', credentials);
  },

  // Выход из системы
  async logout() {
    return apiClient.post('/api/auth/logout');
  },

  // Обновление токена
  async refreshToken(refreshToken: string) {
    return apiClient.post<LoginResponse>('/api/auth/refresh', { refreshToken });
  },

  // Получение информации о текущем пользователе
  async getCurrentUser() {
    return apiClient.get<SystemUser>('/api/auth/me');
  },

  // Проверка токена
  async verifyToken() {
    return apiClient.get('/api/auth/verify');
  },

  // Смена пароля
  async changePassword(oldPassword: string, newPassword: string) {
    return apiClient.post('/api/auth/change-password', {
      oldPassword,
      newPassword,
    });
  },
};