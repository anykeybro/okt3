'use client';

import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip
} from '@mui/material';
import { Account, AccountStatus } from '@/shared/types';

interface AccountSelectorProps {
  accounts: Account[];
  selectedAccountId?: string;
  onAccountChange: (accountId: string) => void;
}

export function AccountSelector({ accounts, selectedAccountId, onAccountChange }: AccountSelectorProps) {
  if (accounts.length <= 1) {
    return null; // Не показываем селектор если счет один или нет счетов
  }

  const getStatusColor = (status: AccountStatus) => {
    switch (status) {
      case AccountStatus.ACTIVE:
        return 'success';
      case AccountStatus.BLOCKED:
        return 'error';
      case AccountStatus.SUSPENDED:
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: AccountStatus) => {
    switch (status) {
      case AccountStatus.ACTIVE:
        return 'Активен';
      case AccountStatus.BLOCKED:
        return 'Заблокирован';
      case AccountStatus.SUSPENDED:
        return 'Приостановлен';
      default:
        return status;
    }
  };

  return (
    <FormControl fullWidth sx={{ mb: 3 }}>
      <InputLabel>Лицевой счет</InputLabel>
      <Select
        value={selectedAccountId || ''}
        onChange={(e) => onAccountChange(e.target.value)}
        label="Лицевой счет"
      >
        {accounts.map((account) => (
          <MenuItem key={account.id} value={account.id}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Box>
                <Typography variant="body1">
                  {account.accountNumber}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {account.tariff?.name} • Баланс: {account.balance} ₽
                </Typography>
              </Box>
              <Chip
                label={getStatusText(account.status)}
                color={getStatusColor(account.status)}
                size="small"
              />
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}