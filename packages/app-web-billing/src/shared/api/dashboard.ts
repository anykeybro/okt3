/**
 * API методы для дашборда
 */

import { apiClient } from './client';
import type { DashboardStats, RecentActivity } from '../types/api';

export const dashboardApi = {
  // Получение основной статистики
  async getStats() {
    return apiClient.get<DashboardStats>('/dashboard/stats');
  },

  // Получение последней активности
  async getRecentActivity() {
    return apiClient.get<RecentActivity>('/dashboard/activity');
  },

  // Получение данных для графиков
  async getChartData(type: string, period: string) {
    return apiClient.get(`/dashboard/charts/${type}`, { period });
  },

  // Получение метрик по периоду
  async getMetrics(params: {
    dateFrom: string;
    dateTo: string;
    metrics: string[];
  }) {
    return apiClient.get('/dashboard/metrics', params);
  },
};