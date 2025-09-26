// Типы для модуля управления устройствами MikroTik

import { DeviceStatus } from '@prisma/client';

// Запросы API
export interface CreateDeviceRequest {
  ipAddress: string;
  username: string;
  password: string;
  description?: string;
}

export interface UpdateDeviceRequest {
  username?: string;
  password?: string;
  description?: string;
  status?: DeviceStatus;
}

export interface DeviceFilters {
  status?: DeviceStatus;
  search?: string; // Поиск по IP или описанию
  page?: number;
  limit?: number;
}

// Ответы API
export interface DeviceResponse {
  id: string;
  ipAddress: string;
  username: string;
  description?: string;
  status: DeviceStatus;
  lastCheck?: Date;
  createdAt: Date;
  updatedAt: Date;
  accountsCount?: number; // Количество привязанных лицевых счетов
}

// MikroTik API типы
export interface MikroTikConnectionConfig {
  host: string;
  username: string;
  password: string;
  port?: number;
  timeout?: number;
}

export interface MikroTikApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface DHCPLease {
  macAddress: string;
  ipAddress: string;
  poolName: string;
  comment?: string;
}

export interface DeviceClientStats {
  macAddress: string;
  ipAddress?: string;
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  uptime: number;
  lastSeen: Date;
}

// Kafka команды для MikroTik
export interface MikroTikCommand {
  type: 'ADD_DHCP' | 'REMOVE_DHCP' | 'BLOCK_CLIENT' | 'UNBLOCK_CLIENT' | 'GET_STATS';
  deviceId: string;
  accountId: string;
  macAddress: string;
  ipAddress?: string;
  poolName?: string;
  timestamp: number;
}

export interface MikroTikCommandResult {
  commandId: string;
  deviceId: string;
  success: boolean;
  result?: any;
  error?: string;
  timestamp: number;
}

// Проверка устройства
export interface DeviceHealthCheck {
  deviceId: string;
  pingSuccess: boolean;
  apiSuccess: boolean;
  responseTime: number;
  error?: string;
  timestamp: Date;
}

// Статистика устройства
export interface DeviceStats {
  deviceId: string;
  totalClients: number;
  activeClients: number;
  blockedClients: number;
  totalTraffic: {
    bytesIn: number;
    bytesOut: number;
  };
  uptime: number;
  lastUpdate: Date;
}