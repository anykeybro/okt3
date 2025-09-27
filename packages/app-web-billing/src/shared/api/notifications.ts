/**
 * API методы для управления уведомлениями
 */

import { apiClient } from './client';
import type {
  Notification,
  NotificationTemplate,
  PaginatedResponse,
  PaginationParams,
} from '../types/api';

export const notificationsApi = {
  // Получение списка уведомлений
  async getNotifications(params?: PaginationParams & {
    clientId?: string;
    type?: string;
    channel?: string;
    status?: string;
  }) {
    return apiClient.get<PaginatedResponse<Notification>>('/notifications', params);
  },

  // Получение уведомления по ID
  async getNotification(id: string) {
    return apiClient.get<Notification>(`/notifications/${id}`);
  },

  // Отправка уведомления
  async sendNotification(data: {
    clientId: string;
    type: string;
    channel?: string;
    message?: string;
  }) {
    return apiClient.post<Notification>('/notifications/send', data);
  },

  // Повторная отправка уведомления
  async resendNotification(id: string) {
    return apiClient.post(`/notifications/${id}/resend`);
  },

  // Получение шаблонов уведомлений
  async getTemplates(params?: PaginationParams & {
    type?: string;
    channel?: string;
  }) {
    return apiClient.get<PaginatedResponse<NotificationTemplate>>('/notification-templates', params);
  },

  // Получение шаблона по ID
  async getTemplate(id: string) {
    return apiClient.get<NotificationTemplate>(`/notification-templates/${id}`);
  },

  // Создание шаблона
  async createTemplate(data: {
    type: string;
    channel: string;
    template: string;
  }) {
    return apiClient.post<NotificationTemplate>('/notification-templates', data);
  },

  // Обновление шаблона
  async updateTemplate(id: string, data: {
    template?: string;
    isActive?: boolean;
  }) {
    return apiClient.put<NotificationTemplate>(`/notification-templates/${id}`, data);
  },

  // Удаление шаблона
  async deleteTemplate(id: string) {
    return apiClient.delete(`/notification-templates/${id}`);
  },

  // Тестирование отправки уведомления
  async testNotification(data: {
    clientId: string;
    type: string;
    channel: string;
    template: string;
  }) {
    return apiClient.post('/notifications/test', data);
  },

  // Получение статистики уведомлений
  async getNotificationsStats() {
    return apiClient.get('/notifications/stats');
  },
};