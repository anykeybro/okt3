/**
 * API методы для управления тарифами и услугами
 */

import { apiClient } from './client';
import type {
  Tariff,
  Service,
  TariffGroup,
  PaginatedResponse,
  PaginationParams,
  CreateTariffRequest,
} from '../types/api';

export const tariffsApi = {
  // Получение списка тарифов
  async getTariffs(params?: PaginationParams & {
    groupId?: string;
    isActive?: boolean;
  }) {
    return apiClient.get<PaginatedResponse<Tariff>>('/api/tariffs', params);
  },

  // Получение тарифа по ID
  async getTariff(id: string) {
    return apiClient.get<Tariff>(`/api/tariffs/${id}`);
  },

  // Создание тарифа
  async createTariff(data: CreateTariffRequest) {
    return apiClient.post<Tariff>('/api/tariffs', data);
  },

  // Обновление тарифа
  async updateTariff(id: string, data: Partial<CreateTariffRequest>) {
    return apiClient.put<Tariff>(`/api/tariffs/${id}`, data);
  },

  // Удаление тарифа
  async deleteTariff(id: string) {
    return apiClient.delete(`/api/tariffs/${id}`);
  },

  // Активация/деактивация тарифа
  async toggleTariffStatus(id: string, isActive: boolean) {
    return apiClient.patch(`/api/tariffs/${id}/status`, { isActive });
  },

  // Получение списка услуг
  async getServices(params?: PaginationParams & {
    type?: string;
    isActive?: boolean;
  }) {
    return apiClient.get<PaginatedResponse<Service>>('/api/services', params);
  },

  // Получение услуги по ID
  async getService(id: string) {
    return apiClient.get<Service>(`/api/services/${id}`);
  },

  // Создание услуги
  async createService(data: {
    name: string;
    description?: string;
    type: string;
  }) {
    return apiClient.post<Service>('/api/services', data);
  },

  // Обновление услуги
  async updateService(id: string, data: {
    name?: string;
    description?: string;
    type?: string;
  }) {
    return apiClient.put<Service>(`/api/services/${id}`, data);
  },

  // Удаление услуги
  async deleteService(id: string) {
    return apiClient.delete(`/api/services/${id}`);
  },

  // Активация/деактивация услуги
  async toggleServiceStatus(id: string, isActive: boolean) {
    return apiClient.patch(`/api/services/${id}/status`, { isActive });
  },

  // Получение групп тарифов
  async getTariffGroups(params?: PaginationParams) {
    return apiClient.get<PaginatedResponse<TariffGroup>>('/api/tariff-groups', params);
  },

  // Получение группы тарифов по ID
  async getTariffGroup(id: string) {
    return apiClient.get<TariffGroup>(`/api/tariff-groups/${id}`);
  },

  // Создание группы тарифов
  async createTariffGroup(data: {
    name: string;
    description?: string;
  }) {
    return apiClient.post<TariffGroup>('/api/tariff-groups', data);
  },

  // Обновление группы тарифов
  async updateTariffGroup(id: string, data: {
    name?: string;
    description?: string;
  }) {
    return apiClient.put<TariffGroup>(`/api/tariff-groups/${id}`, data);
  },

  // Удаление группы тарифов
  async deleteTariffGroup(id: string) {
    return apiClient.delete(`/api/tariff-groups/${id}`);
  },

  // Получение всех активных тарифов (для селектов)
  async getActiveTariffs() {
    return apiClient.get<Tariff[]>('/api/tariffs/active');
  },

  // Получение всех активных услуг (для селектов)
  async getActiveServices() {
    return apiClient.get<Service[]>('/api/services/active');
  },
};