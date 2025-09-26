/**
 * Хуки для дашборда
 */

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api';
import { config } from '../config/config';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await dashboardApi.getStats();
      return response.data;
    },
    refetchInterval: config.refetch.interval,
    staleTime: config.refetch.staleTime,
  });
};

export const useRecentActivity = () => {
  return useQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: async () => {
      const response = await dashboardApi.getRecentActivity();
      return response.data;
    },
    refetchInterval: config.refetch.interval,
    staleTime: config.refetch.staleTime,
  });
};

export const useChartData = (type: string, period: string) => {
  return useQuery({
    queryKey: ['dashboard', 'charts', type, period],
    queryFn: async () => {
      const response = await dashboardApi.getChartData(type, period);
      return response.data;
    },
    enabled: !!type && !!period,
    staleTime: config.refetch.staleTime,
  });
};