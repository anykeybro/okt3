// Типы для биллингового движка

export interface BillingResult {
  accountId: string;
  success: boolean;
  amount?: number;
  error?: string;
  action: 'charge' | 'block' | 'unblock' | 'notify';
}

export interface BillingStats {
  totalProcessed: number;
  successfulCharges: number;
  failedCharges: number;
  blockedAccounts: number;
  notificationsSent: number;
  totalAmount: number;
}

export interface AccountBillingInfo {
  id: string;
  accountNumber: string;
  balance: number;
  tariffPrice: number;
  billingType: 'PREPAID_MONTHLY' | 'HOURLY';
  status: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED';
  blockThreshold: number;
  notificationDays: number;
  lastChargeDate?: Date;
  clientId: string;
  clientName: string;
  clientPhones: string[];
  telegramId?: string;
}

export interface BillingEngineConfig {
  hourlyCheckInterval: number;
  notificationThresholds: number[];
  autoBlockEnabled: boolean;
  defaultBlockThreshold: number;
  dryRun?: boolean; // Для тестирования без реальных изменений
}

export interface ChargeCalculation {
  accountId: string;
  amount: number;
  reason: string;
  shouldCharge: boolean;
  shouldNotify: boolean;
  shouldBlock: boolean;
}