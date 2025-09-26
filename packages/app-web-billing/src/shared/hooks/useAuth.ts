/**
 * Хук для работы с аутентификацией
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '../api';
import { config } from '../config/config';
import type { LoginRequest } from '../types/api';

export const useAuth = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Получение текущего пользователя
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'currentUser'],
    queryFn: async () => {
      const response = await authApi.getCurrentUser();
      return response.data;
    },
    retry: false,
    staleTime: config.refetch.staleTime,
  });

  // Вход в систему
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authApi.login(credentials),
    onSuccess: (response) => {
      if (response.success && response.data) {
        // Сохраняем токены
        localStorage.setItem(config.auth.tokenKey, response.data.token);
        localStorage.setItem(config.auth.refreshTokenKey, response.data.refreshToken);
        
        // Обновляем кеш пользователя
        queryClient.setQueryData(['auth', 'currentUser'], response.data.user);
        
        // Перенаправляем на главную
        router.push('/');
      }
    },
  });

  // Выход из системы
  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      // Очищаем токены
      localStorage.removeItem(config.auth.tokenKey);
      localStorage.removeItem(config.auth.refreshTokenKey);
      
      // Очищаем кеш
      queryClient.clear();
      
      // Перенаправляем на логин
      router.push('/login');
    },
  });

  // Смена пароля
  const changePasswordMutation = useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      authApi.changePassword(oldPassword, newPassword),
  });

  const login = (credentials: LoginRequest) => {
    return loginMutation.mutateAsync(credentials);
  };

  const logout = () => {
    return logoutMutation.mutateAsync();
  };

  const changePassword = (oldPassword: string, newPassword: string) => {
    return changePasswordMutation.mutateAsync({ oldPassword, newPassword });
  };

  const isAuthenticated = !!user && !error;

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    changePassword,
    loginMutation,
    logoutMutation,
    changePasswordMutation,
  };
};