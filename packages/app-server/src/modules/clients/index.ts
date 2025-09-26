// Модуль управления абонентами

// Экспорт сервисов
export { ClientsService } from './clients.service';
export { AccountsService } from './accounts.service';
export { GeocodingService } from './geocoding.service';

// Экспорт контроллеров
export { ClientsController } from './clients.controller';
export { AccountsController } from './accounts.controller';

// Экспорт специфичных типов модуля
export type {
  CreateClientDto,
  UpdateClientDto,
  CreateAccountDto,
  UpdateAccountDto,
  ClientFilters,
  AccountFilters,
  ClientWithAccounts,
  AccountWithDetails,
  ClientStats,
  ClientSearchResult,
  BalanceOperation,
  ClientAction,
  ClientExportData,
  GeocodeRequest,
  GeocodeResponse
} from './types';

// Экспорт специфичных функций валидации
export {
  validateClient,
  validateAccount,
  validatePhoneNumber,
  normalizePhoneNumber,
  validateEmail,
  validateMacAddress,
  normalizeMacAddress,
  validateClientFilters,
  validateClientBusinessRules,
  validateAccountBusinessRules
} from './validation';

// Экспорт маршрутов
export { default as clientsRoutes } from './routes';