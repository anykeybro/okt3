'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../../hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermissions = [] 
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Показываем загрузку пока проверяем аутентификацию
  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body1">Проверка авторизации...</Typography>
      </Box>
    );
  }

  // Если не авторизован, не показываем контент (произойдет редирект)
  if (!isAuthenticated) {
    return null;
  }

  // Проверяем права доступа
  if (requiredPermissions.length > 0 && user) {
    const userPermissions = user.role.permissions.flatMap(p => 
      p.actions.map(action => `${p.resource}:${action}`)
    );
    
    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
          gap={2}
        >
          <Typography variant="h5" color="error">
            Недостаточно прав доступа
          </Typography>
          <Typography variant="body1" color="text.secondary">
            У вас нет прав для просмотра этой страницы
          </Typography>
        </Box>
      );
    }
  }

  return <>{children}</>;
};