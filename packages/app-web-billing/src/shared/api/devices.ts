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
    return apiClient.get<PaginatedResponse<Device>>('/devices', params);
  },

  // Получение устройства по ID
  async getDevice(id: string) {
    return apiClient.get<Device>(`/devices/${id}`);
  },

  // Создание устройства
  async createDevice(data: CreateDeviceRequest) {
    return apiClient.post<Device>('/devices', data);
  },

  // Обновление устройства
  async updateDevice(id: string, data: Partial<CreateDeviceRequest>) {
    return apiClient.put<Device>(`/devices/${id}`, data);
  },

  // Удаление устройства
  async deleteDevice(id: string) {
    return apiClient.delete(`/devices/${id}`);
  },

  // Проверка доступности устройства
  async pingDevice(id: string) {
    return apiClient.post<{ success: boolean; responseTime?: number }>(`/devices/${id}/ping`);
  },

  // Проверка подключения к API устройства
  async testConnection(id: string) {
    return apiClient.post<{ success: boolean; error?: string }>(`/devices/${id}/test`);
  },

  // Получение статистики устройства
  async getDeviceStats(id: string) {
    return apiClient.get(`/devices/${id}/stats`);
  },

  // Получение списка активных устройств (для селектов)
  async getActiveDevices() {
    return apiClient.get<Device[]>('/devices/active');
  },

  // Синхронизация с устройством
  async syncDevice(id: string) {
    return apiClient.post(`/devices/${id}/sync`);
  },
};