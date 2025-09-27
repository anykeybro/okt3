/**
 * API методы для управления платежами
 */

import { apiClient } from './client';
import type {
  Payment,
  PaginatedResponse,
  PaginationParams,
  CreatePaymentRequest,
} from '../types/api';

export const paymentsApi = {
  // Получение списка платежей
  async getPayments(params?: PaginationParams & {
    accountId?: string;
    source?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    return apiClient.get<PaginatedResponse<Payment>>('/payments', params);
  },

  // Получение платежа по ID
  async getPayment(id: string) {
    return apiClient.get<Payment>(`/payments/${id}`);
  },

  // Создание ручного платежа
  async createPayment(data: CreatePaymentRequest) {
    return apiClient.post<Payment>('/payments', data);
  },

  // Получение платежей по лицевому счету
  async getAccountPayments(accountId: string, params?: PaginationParams) {
    return apiClient.get<PaginatedResponse<Payment>>(`/accounts/${accountId}/payments`, params);
  },

  // Отмена платежа
  async cancelPayment(id: string, reason?: string) {
    return apiClient.post(`/payments/${id}/cancel`, { reason });
  },

  // Подтверждение платежа
  async confirmPayment(id: string) {
    return apiClient.post(`/payments/${id}/confirm`);
  },

  // Получение статистики платежей
  async getPaymentsStats(params?: {
    dateFrom?: string;
    dateTo?: string;
  }) {
    return apiClient.get('/payments/stats', params);
  },

  // Экспорт платежей
  async exportPayments(params?: {
    dateFrom?: string;
    dateTo?: string;
    format?: 'csv' | 'xlsx';
  }) {
    return apiClient.get('/payments/export', params);
  },
};