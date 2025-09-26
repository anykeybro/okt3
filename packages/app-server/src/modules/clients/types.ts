// Типы для модуля управления абонентами
import { AccountStatus } from '@prisma/client';
import { Coordinates } from '../../common/types';

// DTO для создания абонента
export interface CreateClientDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  phones: string[];
  email?: string;
  telegramId?: string;
  address?: string;
  coordinates?: Coordinates;
}

// DTO для обновления абонента
export interface UpdateClientDto {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  phones?: string[];
  email?: string;
  telegramId?: string;
  address?: string;
  coordinates?: Coordinates;
}

// DTO для создания лицевого счета
export interface CreateAccountDto {
  clientId: string;
  tariffId: string;
  macAddress?: string;
  poolName?: string;
  blockThreshold?: number;
  deviceId?: string;
}

// DTO для обновления лицевого счета
export interface UpdateAccountDto {
  tariffId?: string;
  macAddress?: string;
  poolName?: string;
  blockThreshold?: number;
  deviceId?: string;
  status?: AccountStatus;
}

// Фильтры для поиска абонентов
export interface ClientFilters {
  search?: string; // Поиск по ФИО, телефону, адресу
  status?: AccountStatus; // Статус лицевого счета
  tariffId?: string;
  deviceId?: string;
  hasEmail?: boolean;
  hasTelegram?: boolean;
  balanceMin?: number;
  balanceMax?: number;
  createdFrom?: Date;
  createdTo?: Date;
}

// Фильтры для поиска лицевых счетов
export interface AccountFilters {
  clientId?: string;
  status?: AccountStatus;
  tariffId?: string;
  deviceId?: string;
  balanceMin?: number;
  balanceMax?: number;
  search?: string; // Поиск по номеру счета, ФИО клиента
}

// Параметры пагинации
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Результат с пагинацией
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Расширенный абонент с лицевыми счетами
export interface ClientWithAccounts {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phones: string[];
  email?: string | null;
  telegramId?: string | null;
  address?: string | null;
  coordinates?: any;
  createdAt: Date;
  updatedAt: Date;
  accounts: AccountWithDetails[];
}

// Расширенный лицевой счет с деталями
export interface AccountWithDetails {
  id: string;
  accountNumber: string;
  clientId: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    phones: string[];
    email?: string | null;
    address?: string | null;
  };
  tariffId: string;
  tariff: {
    id: string;
    name: string;
    price: number;
    billingType: string;
    speedDown: number;
    speedUp: number;
  };
  balance: number;
  status: AccountStatus;
  macAddress?: string | null;
  poolName: string;
  blockThreshold: number;
  deviceId?: string | null;
  device?: {
    id: string;
    ipAddress: string;
    description?: string | null;
    status: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

// Статистика по абоненту
export interface ClientStats {
  totalAccounts: number;
  activeAccounts: number;
  blockedAccounts: number;
  suspendedAccounts: number;
  totalBalance: number;
  averageBalance: number;
  totalPayments: number;
  lastPaymentDate?: Date;
  registrationDate: Date;
}

// Данные для геокодирования
export interface GeocodeRequest {
  address: string;
}

export interface GeocodeResponse {
  coordinates?: Coordinates;
  formattedAddress?: string;
  error?: string;
}

// Поиск абонентов
export interface ClientSearchResult {
  id: string;
  fullName: string;
  phones: string[];
  address?: string | null;
  accounts: Array<{
    id: string;
    accountNumber: string;
    balance: number;
    status: AccountStatus;
    tariffName: string;
  }>;
}

// Операции с балансом
export interface BalanceOperation {
  accountId: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  operatorId?: string;
}

// История действий абонента
export interface ClientAction {
  id: string;
  type: 'created' | 'updated' | 'account_created' | 'payment' | 'blocked' | 'unblocked' | 'tariff_changed';
  description: string;
  performedBy?: string;
  performedAt: Date;
  metadata?: Record<string, any>;
}

// Экспорт абонентов
export interface ClientExportData {
  fullName: string;
  phones: string;
  email?: string;
  address?: string;
  accountNumber: string;
  tariffName: string;
  balance: number;
  status: string;
  createdAt: string;
}