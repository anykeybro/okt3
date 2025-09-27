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
    return apiClient.get<PaginatedResponse<Client>>('/clients/clients', params);
  },

  // Получение клиента по ID
  async getClient(id: string) {
    return apiClient.get<Client>(`/clients/clients/${id}`);
  },

  // Создание клиента
  async createClient(data: CreateClientRequest) {
    return apiClient.post<Client>('/clients/clients', data);
  },

  // Обновление клиента
  async updateClient(id: string, data: Partial<CreateClientRequest>) {
    return apiClient.put<Client>(`/clients/clients/${id}`, data);
  },

  // Удаление клиента
  async deleteClient(id: string) {
    return apiClient.delete(`/clients/clients/${id}`);
  },

  // Поиск клиентов
  async searchClients(query: string) {
    return apiClient.get<Client[]>('/clients/clients/search', { q: query });
  },

  // Получение лицевых счетов клиента
  async getClientAccounts(clientId: string) {
    return apiClient.get<Account[]>(`/clients/clients/${clientId}/accounts`);
  },

  // Создание лицевого счета
  async createAccount(data: CreateAccountRequest) {
    return apiClient.post<Account>('/clients/accounts', data);
  },

  // Получение лицевого счета по ID
  async getAccount(id: string) {
    return apiClient.get<Account>(`/clients/accounts/${id}`);
  },

  // Обновление лицевого счета
  async updateAccount(id: string, data: Partial<CreateAccountRequest>) {
    return apiClient.put<Account>(`/clients/accounts/${id}`, data);
  },

  // Блокировка лицевого счета
  async blockAccount(id: string, reason?: string) {
    return apiClient.post(`/clients/accounts/${id}/block`, { reason });
  },

  // Разблокировка лицевого счета
  async unblockAccount(id: string) {
    return apiClient.post(`/clients/accounts/${id}/unblock`);
  },

  // Приостановка лицевого счета
  async suspendAccount(id: string, reason?: string) {
    return apiClient.post(`/clients/accounts/${id}/suspend`, { reason });
  },

  // Активация лицевого счета
  async activateAccount(id: string) {
    return apiClient.post(`/clients/accounts/${id}/resume`);
  },

  // Получение истории действий по клиенту
  async getClientHistory(clientId: string, params?: PaginationParams) {
    return apiClient.get(`/clients/clients/${clientId}/stats`, params);
  },

  // Получение статистики по клиенту
  async getClientStats(clientId: string) {
    return apiClient.get(`/clients/clients/${clientId}/stats`);
  },
};