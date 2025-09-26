// Типы для модуля платежной системы
import { PaymentSource, PaymentStatus } from '@prisma/client';

// Интерфейсы для создания платежей
export interface CreateManualPaymentDto {
  accountId: string;
  amount: number;
  comment?: string;
  processedById: string;
}

export interface CreateRobokassaPaymentDto {
  accountId: string;
  amount: number;
  description?: string;
}

// Интерфейс для обновления платежа
export interface UpdatePaymentDto {
  status?: PaymentStatus;
  externalId?: string;
  comment?: string;
  processedAt?: Date;
}

// Интерфейс для фильтрации платежей
export interface PaymentFilters {
  accountId?: string;
  source?: PaymentSource;
  status?: PaymentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
}

// Интерфейс для пагинации
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Robokassa API типы
export interface RobokassaPaymentRequest {
  MerchantLogin: string;
  OutSum: string;
  InvId: string;
  Description: string;
  SignatureValue: string;
  Culture?: string;
  IsTest?: number;
}

export interface RobokassaWebhookData {
  OutSum: string;
  InvId: string;
  SignatureValue: string;
  PaymentMethod?: string;
  IncSum?: string;
  IncCurrLabel?: string;
}

export interface RobokassaPaymentUrl {
  url: string;
  invoiceId: string;
}

// Ответы API
export interface PaymentResponse {
  id: string;
  accountId: string;
  amount: number;
  source: PaymentSource;
  status: PaymentStatus;
  externalId?: string;
  comment?: string;
  processedBy?: {
    id: string;
    username: string;
  };
  createdAt: Date;
  processedAt?: Date;
  account: {
    accountNumber: string;
    client: {
      firstName: string;
      lastName: string;
      middleName?: string;
    };
  };
}

export interface PaymentListResponse {
  payments: PaymentResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Статистика платежей
export interface PaymentStats {
  totalAmount: number;
  totalCount: number;
  bySource: {
    [key in PaymentSource]: {
      amount: number;
      count: number;
    };
  };
  byStatus: {
    [key in PaymentStatus]: {
      amount: number;
      count: number;
    };
  };
  todayAmount: number;
  todayCount: number;
  monthAmount: number;
  monthCount: number;
}

// Ошибки платежной системы
export class PaymentError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class RobokassaError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'RobokassaError';
  }
}

export class InsufficientFundsError extends Error {
  constructor(accountId: string, balance: number, required: number) {
    super(`Недостаточно средств на счете ${accountId}. Баланс: ${balance}, требуется: ${required}`);
    this.name = 'InsufficientFundsError';
  }
}