/**
 * Типы для API взаимодействия
 */

// Базовые типы
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Аутентификация
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: SystemUser;
}

export interface SystemUser {
  id: string;
  username: string;
  email: string;
  role: string; // Роль как строка
  permissions: string[]; // Массив прав доступа
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  description?: string;
}

export interface Permission {
  id: string;
  resource: string;
  actions: string[];
}

// Клиенты и лицевые счета
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
  device?: Device;
  createdAt: string;
  updatedAt: string;
}

export type AccountStatus = 'active' | 'blocked' | 'suspended';

// Тарифы и услуги
export interface Service {
  id: string;
  name: string;
  description?: string;
  type: ServiceType;
  isActive: boolean;
}

export type ServiceType = 'internet' | 'iptv' | 'cloud_storage';

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

export type BillingType = 'prepaid_monthly' | 'hourly';

export interface TariffGroup {
  id: string;
  name: string;
  description?: string;
  tariffs: Tariff[];
}

// Устройства
export interface Device {
  id: string;
  ipAddress: string;
  username: string;
  description?: string;
  status: DeviceStatus;
  lastCheck: string;
  accounts: Account[];
}

export type DeviceStatus = 'online' | 'offline' | 'error';

// Заявки
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
  assignedUser?: SystemUser;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type RequestStatus = 'new' | 'in_progress' | 'completed' | 'cancelled';

// Платежи
export interface Payment {
  id: string;
  accountId: string;
  account?: Account;
  amount: number;
  source: PaymentSource;
  externalId?: string;
  comment?: string;
  processedBy?: string;
  processedByUser?: SystemUser;
  status: PaymentStatus;
  createdAt: string;
  processedAt?: string;
}

export type PaymentSource = 'manual' | 'robokassa';
export type PaymentStatus = 'pending' | 'completed' | 'failed';

// Уведомления
export interface Notification {
  id: string;
  clientId: string;
  client?: Client;
  type: NotificationType;
  channel: NotificationChannel;
  message: string;
  status: NotificationStatus;
  externalId?: string;
  sentAt?: string;
  createdAt: string;
}

export type NotificationType = 'welcome' | 'payment' | 'low_balance' | 'blocked' | 'unblocked';
export type NotificationChannel = 'telegram' | 'sms';
export type NotificationStatus = 'pending' | 'sent' | 'failed';

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  template: string;
  isActive: boolean;
}

// Dashboard
export interface DashboardStats {
  activeClients: number;
  blockedClients: number;
  todayPayments: number;
  monthPayments: number;
  newRequests: number;
  onlineDevices: number;
  totalDevices: number;
}

export interface RecentActivity {
  payments: Payment[];
  requests: Request[];
}

// Формы создания/редактирования
export interface CreateClientRequest {
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
}

export interface CreateAccountRequest {
  clientId: string;
  tariffId: string;
  macAddress?: string;
  poolName: string;
  blockThreshold: number;
  deviceId?: string;
}

export interface CreateTariffRequest {
  name: string;
  description?: string;
  price: number;
  billingType: BillingType;
  speedDown: number;
  speedUp: number;
  serviceIds: string[];
  groupId?: string;
  isVisibleInLK: boolean;
  notificationDays: number;
}

export interface CreateDeviceRequest {
  ipAddress: string;
  username: string;
  password: string;
  description?: string;
}

export interface CreatePaymentRequest {
  accountId: string;
  amount: number;
  comment?: string;
}

export interface UpdateRequestStatusRequest {
  status: RequestStatus;
  assignedTo?: string;
  notes?: string;
}