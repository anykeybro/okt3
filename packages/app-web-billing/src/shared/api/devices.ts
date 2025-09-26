/**
 * API методы для управления устройствами
 */

import { apiClient } from './client';
import type {
  Device,
  PaginatedResponse,
  PaginationParams,
  CreateDeviceRequest,
} from '../types/api';

export const devicesApi = {
  // Получение списка устройств
  async getDevices(params?: PaginationParams & {
    status?: string;
  }) {
    return apiClient.get<PaginatedResponse<Device>>('/api/devices', params);
  },

  // Получение устройства по ID
  async getDevice(id: string) {
    return apiClient.get<Device>(`/api/devices/${id}`);
  },

  // Создание устройства
  async createDevice(data: CreateDeviceRequest) {
    return apiClient.post<Device>('/api/devices', data);
  },

  // Обновление устройства
  async updateDevice(id: string, data: Partial<CreateDeviceRequest>) {
    return apiClient.put<Device>(`/api/devices/${id}`, data);
  },

  // Удаление устройства
  async deleteDevice(id: string) {
    return apiClient.delete(`/api/devices/${id}`);
  },

  // Проверка доступности устройства
  async pingDevice(id: string) {
    return apiClient.post<{ success: boolean; responseTime?: number }>(`/api/devices/${id}/ping`);
  },

  // Проверка подключения к API устройства
  async testConnection(id: string) {
    return apiClient.post<{ success: boolean; error?: string }>(`/api/devices/${id}/test`);
  },

  // Получение статистики устройства
  async getDeviceStats(id: string) {
    return apiClient.get(`/api/devices/${id}/stats`);
  },

  // Получение списка активных устройств (для селектов)
  async getActiveDevices() {
    return apiClient.get<Device[]>('/api/devices/active');
  },

  // Синхронизация с устройством
  async syncDevice(id: string) {
    return apiClient.post(`/api/devices/${id}/sync`);
  },
};