'use client';

import React from 'react';
import { Typography, TypographyProps, Tooltip } from '@mui/material';
import { config } from '../../config/config';

interface DateDisplayProps extends Omit<TypographyProps, 'children'> {
  date: string | Date;
  format?: 'date' | 'datetime' | 'relative';
  showTooltip?: boolean;
}

export const DateDisplay: React.FC<DateDisplayProps> = ({ 
  date, 
  format = 'datetime',
  showTooltip = false,
  ...props 
}) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const formatDate = (date: Date, formatType: string): string => {
    const locale = config.format.locale;
    
    switch (formatType) {
      case 'date':
        return date.toLocaleDateString(locale, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      case 'datetime':
        return date.toLocaleString(locale, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      case 'relative':
        return getRelativeTime(date);
      default:
        return date.toLocaleString(locale);
    }
  };

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'только что';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} мин. назад`;
    } else if (diffHours < 24) {
      return `${diffHours} ч. назад`;
    } else if (diffDays < 7) {
      return `${diffDays} дн. назад`;
    } else {
      return formatDate(date, 'date');
    }
  };

  const displayValue = formatDate(dateObj, format);
  const tooltipValue = format === 'relative' ? formatDate(dateObj, 'datetime') : undefined;

  const content = (
    <Typography {...props}>
      {displayValue}
    </Typography>
  );

  if (showTooltip && tooltipValue) {
    return (
      <Tooltip title={tooltipValue}>
        {content}
      </Tooltip>
    );
  }

  return content;
};