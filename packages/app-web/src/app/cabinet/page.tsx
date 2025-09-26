'use client';

import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Paper,
  Alert
} from '@mui/material';
import { 
  ArrowBack, 
  Logout, 
  Payment as PaymentIcon,
  Person,
  Phone,
  Email
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/hooks/useAuth';
import { ProtectedRoute } from '@/shared/components/ProtectedRoute';
import { AccountSelector } from './components/AccountSelector';
import { AccountInfo } from './components/AccountInfo';
import { PaymentHistory } from './components/PaymentHistory';

export default function CabinetPage() {
  const router = useRouter();
  const { auth, logout, selectAccount } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const selectedAccount = auth.client?.accounts?.find(
    account => account.id === auth.selectedAccountId
  );

  return (
    <ProtectedRoute>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Шапка */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Button
              startIcon={<ArrowBack />}
              component={Link}
              href="/"
              sx={{ mb: 2 }}
            >
              На главную
            </Button>
            <Typography variant="h3" component="h1">
              Личный кабинет
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Добро пожаловать, {auth.client?.firstName} {auth.client?.lastName}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Logout />}
            onClick={handleLogout}
            color="error"
          >
            Выйти
          </Button>
        </Box>

      <Grid container spacing={4}>
        {/* Левая колонка - информация о клиенте */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Контактная информация
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Person color="primary" />
              <Box>
                <Typography variant="body1" fontWeight="medium">
                  {auth.client?.firstName} {auth.client?.lastName}
                </Typography>
                {auth.client?.middleName && (
                  <Typography variant="body2" color="text.secondary">
                    {auth.client.middleName}
                  </Typography>
                )}
              </Box>
            </Box>

            {auth.client?.phones && auth.client.phones.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Phone color="primary" />
                <Box>
                  {auth.client.phones.map((phone, index) => (
                    <Typography key={index} variant="body2">
                      {phone}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}

            {auth.client?.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Email color="primary" />
                <Typography variant="body2">
                  {auth.client.email}
                </Typography>
              </Box>
            )}

            {auth.client?.address && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Адрес:
                </Typography>
                <Typography variant="body2">
                  {auth.client.address}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Быстрые действия */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Быстрые действия
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<PaymentIcon />}
                component={Link}
                href="/payment"
                fullWidth
              >
                Пополнить баланс
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Правая колонка - информация о счетах */}
        <Grid item xs={12} md={8}>
          {/* Селектор лицевых счетов */}
          {auth.client?.accounts && auth.client.accounts.length > 0 && (
            <AccountSelector
              accounts={auth.client.accounts}
              selectedAccountId={auth.selectedAccountId}
              onAccountChange={selectAccount}
            />
          )}

          {/* Информация о выбранном счете */}
          {selectedAccount ? (
            <Box sx={{ mb: 4 }}>
              <AccountInfo account={selectedAccount} />
            </Box>
          ) : auth.client?.accounts && auth.client.accounts.length > 0 ? (
            <Alert severity="warning" sx={{ mb: 4 }}>
              Выберите лицевой счет для просмотра информации
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 4 }}>
              У вас пока нет активных лицевых счетов. Обратитесь в службу поддержки для подключения услуг.
            </Alert>
          )}

          {/* История платежей */}
          {selectedAccount && (
            <PaymentHistory accountId={selectedAccount.id} />
          )}
        </Grid>
      </Grid>
    </Container>
    </ProtectedRoute>
  );
}