// Типы для модуля dashboard
export interface DashboardStats {
  // Основные метрики
  activeClients: number;
  blockedClients: number;
  suspendedClients: number;
  totalClients: number;
  
  // Финансовые метрики
  todayPayments: number;
  todayPaymentsAmount: number;
  monthlyPayments: number;
  monthlyPaymentsAmount: number;
  totalRevenue: number;
  averageBalance: number;
  
  // Заявки
  newRequests: number;
  inProgressRequests: number;
  completedRequestsToday: number;
  totalRequests: number;
  
  // Устройства
  onlineDevices: number;
  offlineDevices: number;
  errorDevices: number;
  totalDevices: number;
  
  // Уведомления
  pendingNotifications: number;
  sentNotificationsToday: number;
  failedNotificationsToday: number;
}

export interface PaymentStats {
  date: string;
  amount: number;
  count: number;
}

export interface DashboardClientStats {
  date: string;
  active: number;
  blocked: number;
  new: number;
}

export interface RequestStats {
  date: string;
  new: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export interface TariffStats {
  tariffId: string;
  tariffName: string;
  clientsCount: number;
  revenue: number;
  averageBalance: number;
}

export interface DashboardDeviceStats {
  deviceId: string;
  deviceDescription: string;
  ipAddress: string;
  status: string;
  clientsCount: number;
  lastCheck: Date | null;
}

export interface RecentActivity {
  id: string;
  type: 'payment' | 'request' | 'client_blocked' | 'client_unblocked' | 'new_client';
  description: string;
  amount?: number;
  clientName?: string;
  timestamp: Date;
}

export interface DashboardFilters {
  dateFrom?: Date;
  dateTo?: Date;
  period?: 'today' | 'week' | 'month' | 'year' | 'custom';
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
  }[];
}

export interface TopClientsData {
  clientId: string;
  clientName: string;
  accountNumber: string;
  balance: number;
  totalPayments: number;
  lastPayment: Date | null;
}

export interface LowBalanceClients {
  clientId: string;
  clientName: string;
  accountNumber: string;
  balance: number;
  tariffPrice: number;
  daysLeft: number;
  phone: string;
}