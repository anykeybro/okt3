'use client';

import React from 'react';
import { Typography, TypographyProps } from '@mui/material';
import { config } from '../../config/config';

interface CurrencyDisplayProps extends Omit<TypographyProps, 'children'> {
  amount: number;
  showSign?: boolean;
  colorize?: boolean;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ 
  amount, 
  showSign = false,
  colorize = false,
  ...props 
}) => {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat(config.format.locale, {
      style: 'currency',
      currency: config.format.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getColor = (): string | undefined => {
    if (!colorize) return undefined;
    
    if (amount > 0) return 'success.main';
    if (amount < 0) return 'error.main';
    return 'text.secondary';
  };

  const displayValue = showSign && amount > 0 ? `+${formatCurrency(amount)}` : formatCurrency(amount);

  return (
    <Typography
      {...props}
      sx={{
        color: getColor(),
        fontWeight: amount !== 0 ? 'medium' : 'normal',
        ...props.sx,
      }}
    >
      {displayValue}
    </Typography>
  );
};