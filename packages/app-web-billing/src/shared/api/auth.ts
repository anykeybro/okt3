/**
 * API методы для аутентификации
 */

import { apiClient } from './client';
import type { LoginRequest, LoginResponse, SystemUser } from '../types/api';

export const authApi = {
  // Вход в систему
  async login(credentials: LoginRequest) {
    return apiClient.post<LoginResponse>('/auth/login', credentials);
  },

  // Выход из системы
  async logout() {
    return apiClient.post('/auth/logout');
  },

  // Обновление токена
  async refreshToken(refreshToken: string) {
    return apiClient.post<LoginResponse>('/auth/refresh', { refreshToken });
  },

  // Получение информации о текущем пользователе
  async getCurrentUser() {
    return apiClient.get<SystemUser>('/auth/me');
  },

  // Проверка токена
  async verifyToken() {
    return apiClient.get('/auth/verify');
  },

  // Смена пароля
  async changePassword(oldPassword: string, newPassword: string) {
    return apiClient.post('/auth/change-password', {
      oldPassword,
      newPassword,
    });
  },
};