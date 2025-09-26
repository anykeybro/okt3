/**
 * Хуки для работы с тарифами
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tariffsApi } from '../api';
import { config } from '../config/config';
import type { CreateTariffRequest, PaginationParams } from '../types/api';

export const useTariffs = (params?: PaginationParams & { groupId?: string; isActive?: boolean }) => {
  return useQuery({
    queryKey: ['tariffs', params],
    queryFn: async () => {
      const response = await tariffsApi.getTariffs(params);
      return response.data;
    },
    staleTime: config.refetch.staleTime,
  });
};

export const useTariff = (id: string) => {
  return useQuery({
    queryKey: ['tariffs', id],
    queryFn: async () => {
      const response = await tariffsApi.getTariff(id);
      return response.data;
    },
    enabled: !!id,
    staleTime: config.refetch.staleTime,
  });
};

export const useActiveTariffs = () => {
  return useQuery({
    queryKey: ['tariffs', 'active'],
    queryFn: async () => {
      const response = await tariffsApi.getActiveTariffs();
      return response.data;
    },
    staleTime: config.refetch.staleTime,
  });
};

export const useCreateTariff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTariffRequest) => tariffsApi.createTariff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tariffs'] });
    },
  });
};

export const useUpdateTariff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTariffRequest> }) =>
      tariffsApi.updateTariff(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tariffs'] });
      queryClient.invalidateQueries({ queryKey: ['tariffs', id] });
    },
  });
};

export const useDeleteTariff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tariffsApi.deleteTariff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tariffs'] });
    },
  });
};

export const useToggleTariffStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      tariffsApi.toggleTariffStatus(id, isActive),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tariffs'] });
      queryClient.invalidateQueries({ queryKey: ['tariffs', id] });
    },
  });
};

// Услуги
export const useServices = (params?: PaginationParams & { type?: string; isActive?: boolean }) => {
  return useQuery({
    queryKey: ['services', params],
    queryFn: async () => {
      const response = await tariffsApi.getServices(params);
      return response.data;
    },
    staleTime: config.refetch.staleTime,
  });
};

export const useActiveServices = () => {
  return useQuery({
    queryKey: ['services', 'active'],
    queryFn: async () => {
      const response = await tariffsApi.getActiveServices();
      return response.data;
    },
    staleTime: config.refetch.staleTime,
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string; type: string }) =>
      tariffsApi.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; type?: string } }) =>
      tariffsApi.updateService(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['services', id] });
    },
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tariffsApi.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
};

// Группы тарифов
export const useTariffGroups = (params?: PaginationParams) => {
  return useQuery({
    queryKey: ['tariff-groups', params],
    queryFn: async () => {
      const response = await tariffsApi.getTariffGroups(params);
      return response.data;
    },
    staleTime: config.refetch.staleTime,
  });
};

export const useCreateTariffGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      tariffsApi.createTariffGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tariff-groups'] });
    },
  });
};