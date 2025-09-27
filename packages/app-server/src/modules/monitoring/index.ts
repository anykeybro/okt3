// Экспорты модуля мониторинга
export { default as MonitoringService } from './monitoring.service';
export { default as MonitoringController } from './monitoring.controller';
export { createMonitoringRoutes } from './monitoring.routes';

// Экспортируем типы
export type {
  ZabbixItem,
  MonitoringData,
} from './monitoring.service';