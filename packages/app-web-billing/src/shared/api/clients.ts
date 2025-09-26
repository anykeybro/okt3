/**
 * API методы для управления клиентами и лицевыми счетами
 */

import { apiClient } from './client';
import type {
  Client,
  Account,
  PaginatedResponse,
  PaginationParams,
  CreateClientRequest,
  CreateAccountRequest,
} from '../types/api';

export const clientsApi = {
  // Получение списка клиентов
  async getClients(params?: PaginationParams & {
    status?: string;
    tariffId?: string;
  }) {
    return apiClient.get<PaginatedResponse<Client>>('/api/clients', params);
  },

  // Получение клиента по ID
  async getClient(id: string) {
    return apiClient.get<Client>(`/api/clients/${id}`);
  },

  // Создание клиента
  async createClient(data: CreateClientRequest) {
    return apiClient.post<Client>('/api/clients', data);
  },

  // Обновление клиента
  async updateClient(id: string, data: Partial<CreateClientRequest>) {
    return apiClient.put<Client>(`/api/clients/${id}`, data);
  },

  // Удаление клиента
  async deleteClient(id: string) {
    return apiClient.delete(`/api/clients/${id}`);
  },

  // Поиск клиентов
  async searchClients(query: string) {
    return apiClient.get<Client[]>('/api/clients/search', { q: query });
  },

  // Получение лицевых счетов клиента
  async getClientAccounts(clientId: string) {
    return apiClient.get<Account[]>(`/api/clients/${clientId}/accounts`);
  },

  // Создание лицевого счета
  async createAccount(data: CreateAccountRequest) {
    return apiClient.post<Account>('/api/accounts', data);
  },

  // Получение лицевого счета по ID
  async getAccount(id: string) {
    return apiClient.get<Account>(`/api/accounts/${id}`);
  },

  // Обновление лицевого счета
  async updateAccount(id: string, data: Partial<CreateAccountRequest>) {
    return apiClient.put<Account>(`/api/accounts/${id}`, data);
  },

  // Блокировка лицевого счета
  async blockAccount(id: string, reason?: string) {
    return apiClient.post(`/api/accounts/${id}/block`, { reason });
  },

  // Разблокировка лицевого счета
  async unblockAccount(id: string) {
    return apiClient.post(`/api/accounts/${id}/unblock`);
  },

  // Приостановка лицевого счета
  async suspendAccount(id: string, reason?: string) {
    return apiClient.post(`/api/accounts/${id}/suspend`, { reason });
  },

  // Активация лицевого счета
  async activateAccount(id: string) {
    return apiClient.post(`/api/accounts/${id}/activate`);
  },

  // Получение истории действий по клиенту
  async getClientHistory(clientId: string, params?: PaginationParams) {
    return apiClient.get(`/api/clients/${clientId}/history`, params);
  },

  // Получение статистики по клиенту
  async getClientStats(clientId: string) {
    return apiClient.get(`/api/clients/${clientId}/stats`);
  },
};