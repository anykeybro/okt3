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
    return apiClient.get<PaginatedResponse<Tariff>>('/tariffs', params);
  },

  // Получение тарифа по ID
  async getTariff(id: string) {
    return apiClient.get<Tariff>(`/tariffs/${id}`);
  },

  // Создание тарифа
  async createTariff(data: CreateTariffRequest) {
    return apiClient.post<Tariff>('/tariffs', data);
  },

  // Обновление тарифа
  async updateTariff(id: string, data: Partial<CreateTariffRequest>) {
    return apiClient.put<Tariff>(`/tariffs/${id}`, data);
  },

  // Удаление тарифа
  async deleteTariff(id: string) {
    return apiClient.delete(`/tariffs/${id}`);
  },

  // Активация/деактивация тарифа
  async toggleTariffStatus(id: string, isActive: boolean) {
    return apiClient.patch(`/tariffs/${id}/status`, { isActive });
  },

  // Получение списка услуг
  async getServices(params?: PaginationParams & {
    type?: string;
    isActive?: boolean;
  }) {
    return apiClient.get<PaginatedResponse<Service>>('/tariffs/services', params);
  },

  // Получение услуги по ID
  async getService(id: string) {
    return apiClient.get<Service>(`/tariffs/services/${id}`);
  },

  // Создание услуги
  async createService(data: {
    name: string;
    description?: string;
    type: string;
  }) {
    return apiClient.post<Service>('/tariffs/services', data);
  },

  // Обновление услуги
  async updateService(id: string, data: {
    name?: string;
    description?: string;
    type?: string;
  }) {
    return apiClient.put<Service>(`/tariffs/services/${id}`, data);
  },

  // Удаление услуги
  async deleteService(id: string) {
    return apiClient.delete(`/tariffs/services/${id}`);
  },

  // Активация/деактивация услуги
  async toggleServiceStatus(id: string, isActive: boolean) {
    return apiClient.patch(`/tariffs/services/${id}/status`, { isActive });
  },

  // Получение групп тарифов
  async getTariffGroups(params?: PaginationParams) {
    return apiClient.get<PaginatedResponse<TariffGroup>>('/tariffs/groups', params);
  },

  // Получение группы тарифов по ID
  async getTariffGroup(id: string) {
    return apiClient.get<TariffGroup>(`/tariffs/groups/${id}`);
  },

  // Создание группы тарифов
  async createTariffGroup(data: {
    name: string;
    description?: string;
  }) {
    return apiClient.post<TariffGroup>('/tariffs/groups', data);
  },

  // Обновление группы тарифов
  async updateTariffGroup(id: string, data: {
    name?: string;
    description?: string;
  }) {
    return apiClient.put<TariffGroup>(`/tariffs/groups/${id}`, data);
  },

  // Удаление группы тарифов
  async deleteTariffGroup(id: string) {
    return apiClient.delete(`/tariffs/groups/${id}`);
  },

  // Получение всех активных тарифов (для селектов)
  async getActiveTariffs() {
    return apiClient.get<Tariff[]>('/tariffs/visible');
  },

  // Получение всех активных услуг (для селектов)
  async getActiveServices() {
    return apiClient.get<Service[]>('/tariffs/services/active');
  },
};