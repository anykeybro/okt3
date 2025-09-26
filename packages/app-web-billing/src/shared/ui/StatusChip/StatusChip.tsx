'use client';

import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { config } from '../../config/config';

interface StatusChipProps extends Omit<ChipProps, 'color'> {
  status: string;
  statusLabels?: Record<string, string>;
}

const defaultStatusLabels: Record<string, string> = {
  // Статусы аккаунтов
  active: 'Активен',
  blocked: 'Заблокирован',
  suspended: 'Приостановлен',
  
  // Статусы заявок
  new: 'Новая',
  in_progress: 'В работе',
  completed: 'Выполнена',
  cancelled: 'Отменена',
  
  // Статусы платежей
  pending: 'Ожидает',
  failed: 'Ошибка',
  
  // Статусы устройств
  online: 'Онлайн',
  offline: 'Офлайн',
  error: 'Ошибка',
  
  // Статусы уведомлений
  sent: 'Отправлено',
};

export const StatusChip: React.FC<StatusChipProps> = ({ 
  status, 
  statusLabels = defaultStatusLabels,
  ...props 
}) => {
  const getStatusColor = (status: string): ChipProps['color'] => {
    switch (status) {
      case 'active':
      case 'completed':
      case 'sent':
      case 'online':
        return 'success';
      case 'blocked':
      case 'failed':
      case 'error':
        return 'error';
      case 'suspended':
      case 'pending':
      case 'in_progress':
      case 'offline':
        return 'warning';
      case 'cancelled':
        return 'default';
      case 'new':
        return 'info';
      default:
        return 'default';
    }
  };

  const label = statusLabels[status] || status;
  const color = getStatusColor(status);

  return (
    <Chip
      label={label}
      color={color}
      size="small"
      variant="filled"
      {...props}
    />
  );
};