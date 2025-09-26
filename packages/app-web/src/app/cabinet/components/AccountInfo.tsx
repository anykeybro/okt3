'use client';

import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  LinearProgress,
  Alert
} from '@mui/material';
import { 
  AccountBalance, 
  Speed, 
  CalendarToday, 
  Warning,
  CheckCircle,
  Block
} from '@mui/icons-material';
import { Account, AccountStatus, BillingType } from '@/shared/types';

interface AccountInfoProps {
  account: Account;
}

export function AccountInfo({ account }: AccountInfoProps) {
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

  const getStatusIcon = (status: AccountStatus) => {
    switch (status) {
      case AccountStatus.ACTIVE:
        return <CheckCircle />;
      case AccountStatus.BLOCKED:
        return <Block />;
      case AccountStatus.SUSPENDED:
        return <Warning />;
      default:
        return undefined;
    }
  };

  const calculateDaysLeft = () => {
    if (!account.tariff || account.tariff.billingType !== BillingType.PREPAID_MONTHLY) {
      return null;
    }
    
    const daysLeft = Math.floor(account.balance / (account.tariff.price / 30));
    return Math.max(0, daysLeft);
  };

  const daysLeft = calculateDaysLeft();
  const isLowBalance = account.balance <= account.blockThreshold;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" component="h2">
            Лицевой счет {account.accountNumber}
          </Typography>
          <Chip
            icon={getStatusIcon(account.status)}
            label={getStatusText(account.status)}
            color={getStatusColor(account.status)}
            variant="outlined"
          />
        </Box>

        {/* Предупреждения */}
        {isLowBalance && account.status === AccountStatus.ACTIVE && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Низкий баланс! Пополните счет, чтобы избежать блокировки услуг.
            </Typography>
          </Alert>
        )}

        {account.status === AccountStatus.BLOCKED && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Услуги заблокированы из-за недостатка средств. Пополните баланс для разблокировки.
            </Typography>
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Баланс */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2, color: 'white' }}>
              <AccountBalance sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h4" component="div" fontWeight="bold">
                {account.balance} ₽
              </Typography>
              <Typography variant="body2">
                Текущий баланс
              </Typography>
            </Box>
          </Grid>

          {/* Тариф */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'secondary.light', borderRadius: 2, color: 'white' }}>
              <Speed sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="h6" component="div" fontWeight="bold">
                {account.tariff?.name}
              </Typography>
              <Typography variant="body2">
                {account.tariff?.price} ₽/мес
              </Typography>
            </Box>
          </Grid>

          {/* Скорость */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2, color: 'white' }}>
              <Typography variant="h6" component="div" fontWeight="bold">
                ↓ {account.tariff?.speedDown} Мбит/с
              </Typography>
              <Typography variant="h6" component="div" fontWeight="bold">
                ↑ {account.tariff?.speedUp} Мбит/с
              </Typography>
              <Typography variant="body2">
                Скорость
              </Typography>
            </Box>
          </Grid>

          {/* Дни до списания */}
          {daysLeft !== null && (
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2, color: 'white' }}>
                <CalendarToday sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" component="div" fontWeight="bold">
                  {daysLeft}
                </Typography>
                <Typography variant="body2">
                  {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'} до списания
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>

        {/* Услуги */}
        {account.tariff?.services && account.tariff.services.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Подключенные услуги
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {account.tariff.services.map((service) => (
                <Chip
                  key={service.id}
                  label={service.name}
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Прогресс до блокировки */}
        {account.status === AccountStatus.ACTIVE && account.balance > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              До блокировки осталось: {Math.max(0, account.balance - account.blockThreshold)} ₽
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (account.balance / (account.blockThreshold + 100)) * 100)}
              color={isLowBalance ? 'warning' : 'success'}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}