// Типы для модуля уведомлений

export interface NotificationData {
  clientId: string;
  type: NotificationType;
  variables?: Record<string, any>;
}

export interface SMSGatewayResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface TelegramResponse {
  success: boolean;
  messageId?: number;
  error?: string;
}

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
}

export enum NotificationType {
  WELCOME = 'WELCOME',
  PAYMENT = 'PAYMENT',
  LOW_BALANCE = 'LOW_BALANCE',
  BLOCKED = 'BLOCKED',
  UNBLOCKED = 'UNBLOCKED'
}

export enum NotificationChannel {
  TELEGRAM = 'TELEGRAM',
  SMS = 'SMS'
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED'
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  template: string;
  isActive: boolean;
}

export interface ProcessedTemplate {
  message: string;
  variables: Record<string, any>;
}