/**
 * API методы для управления заявками
 */

import { apiClient } from './client';
import type {
  Request,
  PaginatedResponse,
  PaginationParams,
  UpdateRequestStatusRequest,
} from '../types/api';

export const requestsApi = {
  // Получение списка заявок
  async getRequests(params?: PaginationParams & {
    status?: string;
    assignedTo?: string;
  }) {
    return apiClient.get<PaginatedResponse<Request>>('/api/requests', params);
  },

  // Получение заявки по ID
  async getRequest(id: string) {
    return apiClient.get<Request>(`/api/requests/${id}`);
  },

  // Обновление статуса заявки
  async updateRequestStatus(id: string, data: UpdateRequestStatusRequest) {
    return apiClient.patch<Request>(`/api/requests/${id}/status`, data);
  },

  // Назначение заявки на исполнителя
  async assignRequest(id: string, assignedTo: string) {
    return apiClient.patch<Request>(`/api/requests/${id}/assign`, { assignedTo });
  },

  // Добавление комментария к заявке
  async addComment(id: string, comment: string) {
    return apiClient.post(`/api/requests/${id}/comments`, { comment });
  },

  // Получение комментариев к заявке
  async getComments(id: string) {
    return apiClient.get(`/api/requests/${id}/comments`);
  },

  // Создание лицевого счета из заявки
  async createAccountFromRequest(requestId: string, accountData: {
    tariffId: string;
    macAddress?: string;
    poolName: string;
    blockThreshold: number;
    deviceId?: string;
  }) {
    return apiClient.post(`/api/requests/${requestId}/create-account`, accountData);
  },

  // Получение статистики заявок
  async getRequestsStats() {
    return apiClient.get('/api/requests/stats');
  },
};