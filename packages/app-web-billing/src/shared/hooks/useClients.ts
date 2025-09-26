/**
 * Хуки для работы с клиентами
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../api';
import { config } from '../config/config';
import type { CreateClientRequest, CreateAccountRequest, PaginationParams } from '../types/api';

export const useClients = (params?: PaginationParams & { status?: string; tariffId?: string }) => {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: async () => {
      const response = await clientsApi.getClients(params);
      return response.data;
    },
    staleTime: config.refetch.staleTime,
  });
};

export const useClient = (id: string) => {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      const response = await clientsApi.getClient(id);
      return response.data;
    },
    enabled: !!id,
    staleTime: config.refetch.staleTime,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientRequest) => clientsApi.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateClientRequest> }) =>
      clientsApi.updateClient(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', id] });
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientsApi.deleteClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useSearchClients = (query: string) => {
  return useQuery({
    queryKey: ['clients', 'search', query],
    queryFn: async () => {
      const response = await clientsApi.searchClients(query);
      return response.data;
    },
    enabled: query.length >= 2,
    staleTime: config.refetch.staleTime,
  });
};

export const useClientAccounts = (clientId: string) => {
  return useQuery({
    queryKey: ['clients', clientId, 'accounts'],
    queryFn: async () => {
      const response = await clientsApi.getClientAccounts(clientId);
      return response.data;
    },
    enabled: !!clientId,
    staleTime: config.refetch.staleTime,
  });
};

export const useAccount = (id: string) => {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: async () => {
      const response = await clientsApi.getAccount(id);
      return response.data;
    },
    enabled: !!id,
    staleTime: config.refetch.staleTime,
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAccountRequest) => clientsApi.createAccount(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['clients', data.clientId, 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAccountRequest> }) =>
      clientsApi.updateAccount(id, data),
    onSuccess: (response) => {
      if (response.data) {
        queryClient.invalidateQueries({ queryKey: ['accounts', response.data.id] });
        queryClient.invalidateQueries({ queryKey: ['clients', response.data.clientId, 'accounts'] });
        queryClient.invalidateQueries({ queryKey: ['clients'] });
      }
    },
  });
};

export const useBlockAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      clientsApi.blockAccount(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['accounts', id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useUnblockAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientsApi.unblockAccount(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['accounts', id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useSuspendAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      clientsApi.suspendAccount(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['accounts', id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useActivateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientsApi.activateAccount(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['accounts', id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};