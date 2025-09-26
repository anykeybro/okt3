// Основные типы данных для app-web

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phones: string[];
  email?: string;
  telegramId?: string;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  accounts: Account[];
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  accountNumber: string;
  clientId: string;
  client?: Client;
  tariffId: string;
  tariff?: Tariff;
  balance: number;
  status: AccountStatus;
  macAddress?: string;
  poolName: string;
  blockThreshold: number;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tariff {
  id: string;
  name: string;
  description?: string;
  price: number;
  billingType: BillingType;
  speedDown: number;
  speedUp: number;
  services: Service[];
  groupId?: string;
  group?: TariffGroup;
  isVisibleInLK: boolean;
  notificationDays: number;
  isActive: boolean;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  type: ServiceType;
  isActive: boolean;
}

export interface TariffGroup {
  id: string;
  name: string;
  description?: string;
  tariffs: Tariff[];
}

export interface Request {
  id: string;
  clientId?: string;
  client?: Client;
  address: string;
  firstName: string;
  lastName: string;
  phone: string;
  desiredServices: string[];
  status: RequestStatus;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  accountId: string;
  account?: Account;
  amount: number;
  source: PaymentSource;
  externalId?: string;
  comment?: string;
  processedBy?: string;
  status: PaymentStatus;
  createdAt: string;
  processedAt?: string;
}

// Перечисления
export enum AccountStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  SUSPENDED = 'suspended'
}

export enum ServiceType {
  INTERNET = 'internet',
  IPTV = 'iptv',
  CLOUD_STORAGE = 'cloud_storage'
}

export enum BillingType {
  PREPAID_MONTHLY = 'prepaid_monthly',
  HOURLY = 'hourly'
}

export enum RequestStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PaymentSource {
  MANUAL = 'manual',
  ROBOKASSA = 'robokassa'
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Формы
export interface RequestForm {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  desiredServices: string[];
}

export interface AuthForm {
  phone: string;
}

export interface VerificationForm {
  phone: string;
  code: string;
}

// Состояние аутентификации
export interface AuthState {
  isAuthenticated: boolean;
  client?: Client;
  selectedAccountId?: string;
  token?: string;
}

// Robokassa
export interface RobokassaPaymentData {
  merchantId: string;
  amount: number;
  accountId: string;
  description: string;
  signatureValue: string;
  culture: string;
}