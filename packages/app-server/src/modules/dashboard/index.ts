// Модуль панели управления и аналитики

// Экспорт сервисов
export { DashboardService } from './dashboard.service';
export { CacheService } from './cache.service';

// Экспорт контроллера
export { DashboardController } from './dashboard.controller';

// Экспорт типов
export type {
  DashboardStats,
  PaymentStats,
  DashboardClientStats,
  RequestStats,
  TariffStats,
  DashboardDeviceStats,
  RecentActivity,
  DashboardFilters,
  ChartData,
  TopClientsData,
  LowBalanceClients
} from './types';

// Экспорт функций валидации
export {
  validateDashboardFilters,
  validateLimit,
  validateChartType,
  validateDateRange,
  validateStatsRequest
} from './validation';

// Экспорт маршрутов
export { default as dashboardRoutes } from './routes';