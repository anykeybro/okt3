/**
 * Экспорт всех хуков
 */

export { useAuth } from './useAuth';
export { useClients, useClient, useCreateClient, useUpdateClient, useDeleteClient, useSearchClients, useClientAccounts, useAccount, useCreateAccount, useUpdateAccount, useBlockAccount, useUnblockAccount, useSuspendAccount, useActivateAccount } from './useClients';
export { useTariffs, useTariff, useActiveTariffs, useCreateTariff, useUpdateTariff, useDeleteTariff, useToggleTariffStatus, useServices, useActiveServices, useCreateService, useUpdateService, useDeleteService, useTariffGroups, useCreateTariffGroup } from './useTariffs';
export { useDashboardStats, useRecentActivity, useChartData } from './useDashboard';
export { useDebounce } from './useDebounce';