// Общие типы системы
import { 
  AccountStatus, 
  ServiceType, 
  BillingType, 
  DeviceStatus, 
  RequestStatus, 
  PaymentSource, 
  PaymentStatus, 
  NotificationType, 
  NotificationChannel, 
  NotificationStatus 
} from '@prisma/client';

// API Response типы
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Координаты
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Статистика для дашборда
export interface DashboardStats {
  activeClients: number;
  blockedClients: number;
  todayPayments: number;
  monthlyPayments: number;
  totalRevenue: number;
  newRequests: number;
  onlineDevices: number;
  totalDevices: number;
}

// Фильтры для поиска
export interface ClientFilters {
  search?: string;
  status?: AccountStatus;
  tariffId?: string;
  deviceId?: string;
  page?: number;
  limit?: number;
}

export interface PaymentFilters {
  accountId?: string;
  source?: PaymentSource;
  status?: PaymentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface RequestFilters {
  status?: RequestStatus;
  assignedToId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

// Kafka сообщения
export interface MikroTikCommand {
  type: 'ADD_DHCP' | 'REMOVE_DHCP' | 'BLOCK_CLIENT' | 'UNBLOCK_CLIENT';
  deviceId: string;
  accountId: string;
  macAddress: string;
  ipAddress?: string;
  poolName?: string;
}

export interface DeviceStatusMessage {
  deviceId: string;
  status: DeviceStatus;
  lastCheck: Date;
  error?: string;
}

export interface NotificationMessage {
  clientId: string;
  type: NotificationType;
  channel: NotificationChannel;
  message: string;
  templateData?: Record<string, any>;
}

// Robokassa типы
export interface RobokassaPayment {
  merchantId: string;
  amount: number;
  accountId: string;
  description: string;
  signature: string;
}

export interface RobokassaWebhook {
  OutSum: string;
  InvId: string;
  SignatureValue: string;
  PaymentMethod?: string;
  IncCurrLabel?: string;
}

// Telegram типы
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  contact?: TelegramContact;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

// SMS типы
export interface SMSMessage {
  phone: string;
  message: string;
  priority?: number;
}

export interface SMSStatus {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  error?: string;
}

// Экспорт всех enum'ов для удобства
export {
  AccountStatus,
  ServiceType,
  BillingType,
  DeviceStatus,
  RequestStatus,
  PaymentSource,
  PaymentStatus,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
};