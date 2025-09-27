/**
 * Общие утилиты для workspace
 */

export interface Logger {
  info(message: string): void;
  error(message: string): void;
  warn(message: string): void;
}

export class ConsoleLogger implements Logger {
  info(message: string): void {
    console.log(`[INFO] ${message}`);
  }

  error(message: string): void {
    console.error(`[ERROR] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[WARN] ${message}`);
  }
}

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Экспорт конфигурации
export { default as sharedConfig } from './config/config';
export type {
  SharedConfig,
  AccountStatus,
  RequestStatus,
  PaymentStatus,
  DeviceStatus,
  NotificationStatus,
  UserStatus,
  ServiceType,
  BillingType,
  PaymentSource,
  NotificationChannel,
  NotificationType,
  UserRole,
  Permission,
} from './config/config';