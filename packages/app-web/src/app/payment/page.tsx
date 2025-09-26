'use client';

import { useState, useEffect, Suspense } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment
} from '@mui/material';
import { 
  ArrowBack, 
  Payment as PaymentIcon,
  Search,
  AccountBalance,
  CreditCard
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/shared/api';
import { Account, Client } from '@/shared/types';
import { config } from '@/shared/config/config';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('robokassa');

  // Предустановленные суммы
  const presetAmounts = [100, 300, 500, 1000, 2000, 5000];

  useEffect(() => {
    // Если передан accountId в URL, загружаем информацию о счете
    const accountId = searchParams.get('accountId');
    if (accountId) {
      loadAccountById(accountId);
    }
  }, [searchParams]);

  const loadAccountById = async (accountId: string) => {
    setSearchLoading(true);
    setSearchError(null);

    try {
      const response = await apiClient.get(`/accounts/${accountId}`);
      
      if (response.success && response.data) {
        const account = response.data as Account;
        setSelectedAccount(account);
        setSearchResults([account]);
      } else {
        setSearchError('Лицевой счет не найден');
      }
    } catch (err) {
      setSearchError('Ошибка при загрузке информации о счете');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError('Введите номер телефона, адрес или лицевой счет');
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    setSelectedAccount(null);

    try {
      const response = await apiClient.get(`/accounts/search?query=${encodeURIComponent(searchQuery)}`);
      
      if (response.success && response.data) {
        const accounts = response.data as Account[];
        setSearchResults(accounts);
        if (accounts.length === 1) {
          setSelectedAccount(accounts[0]);
        }
      } else {
        setSearchError('Лицевые счета не найдены');
      }
    } catch (err) {
      setSearchError('Ошибка поиска. Попробуйте позже.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account);
  };

  const handleAmountChange = (value: string) => {
    // Разрешаем только цифры и точку
    const cleanValue = value.replace(/[^\d.]/g, '');
    setAmount(cleanValue);
  };

  const handlePresetAmount = (presetAmount: number) => {
    setAmount(presetAmount.toString());
  };

  const validatePayment = (): boolean => {
    if (!selectedAccount) {
      setError('Выберите лицевой счет');
      return false;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Введите корректную сумму');
      return false;
    }

    if (parseFloat(amount) < 10) {
      setError('Минимальная сумма пополнения: 10 рублей');
      return false;
    }

    if (parseFloat(amount) > 50000) {
      setError('Максимальная сумма пополнения: 50 000 рублей');
      return false;
    }

    return true;
  };

  const handlePayment = async () => {
    setError(null);

    if (!validatePayment()) {
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/payments/create', {
        accountId: selectedAccount!.id,
        amount: parseFloat(amount),
        method: paymentMethod
      });

      if (response.success && response.data) {
        const paymentData = response.data as { paymentUrl: string };
        // Перенаправляем на страницу оплаты Robokassa
        window.location.href = paymentData.paymentUrl;
      } else {
        setError(response.error || 'Ошибка создания платежа');
      }
    } catch (err) {
      setError('Произошла ошибка. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Шапка */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          component={Link}
          href="/"
          sx={{ mb: 2 }}
        >
          Назад на главную
        </Button>
        <Typography variant="h3" component="h1" gutterBottom>
          Оплата услуг
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Пополните баланс лицевого счета онлайн
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Поиск лицевого счета */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Поиск лицевого счета
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  fullWidth
                  label="Номер телефона, адрес или лицевой счет"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="+7 (999) 123-45-67 или ул. Примерная, д. 1"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  disabled={searchLoading}
                  sx={{ minWidth: 120 }}
                >
                  {searchLoading ? <CircularProgress size={24} /> : 'Найти'}
                </Button>
              </Box>

              {searchError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {searchError}
                </Alert>
              )}

              {/* Результаты поиска */}
              {searchResults.length > 1 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Найдено лицевых счетов: {searchResults.length}
                  </Typography>
                  {searchResults.map((account) => (
                    <Paper
                      key={account.id}
                      sx={{
                        p: 2,
                        mb: 1,
                        cursor: 'pointer',
                        border: selectedAccount?.id === account.id ? 2 : 1,
                        borderColor: selectedAccount?.id === account.id ? 'primary.main' : 'divider',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => handleAccountSelect(account)}
                    >
                      <Typography variant="body1" fontWeight="medium">
                        Л/С: {account.accountNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {account.client?.firstName} {account.client?.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Баланс: {account.balance} ₽ • {account.tariff?.name}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Информация о выбранном счете и форма оплаты */}
        {selectedAccount && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Пополнение баланса
                </Typography>

                {/* Информация о счете */}
                <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Лицевой счет
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedAccount.accountNumber}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Абонент
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedAccount.client?.firstName} {selectedAccount.client?.lastName}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Текущий баланс
                      </Typography>
                      <Typography variant="h6" color="primary.main">
                        {selectedAccount.balance} ₽
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Тариф
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedAccount.tariff?.name}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Сумма пополнения */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body1" gutterBottom>
                    Сумма пополнения
                  </Typography>
                  
                  {/* Быстрые суммы */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {presetAmounts.map((presetAmount) => (
                      <Button
                        key={presetAmount}
                        variant={amount === presetAmount.toString() ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => handlePresetAmount(presetAmount)}
                      >
                        {presetAmount} ₽
                      </Button>
                    ))}
                  </Box>

                  <TextField
                    fullWidth
                    label="Сумма"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="Введите сумму"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                    }}
                  />
                </Box>

                {/* Способ оплаты */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Способ оплаты</InputLabel>
                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    label="Способ оплаты"
                  >
                    <MenuItem value="robokassa">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CreditCard />
                        Банковская карта (Robokassa)
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                {/* Кнопка оплаты */}
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={handlePayment}
                  disabled={loading || !amount || !selectedAccount}
                  startIcon={loading ? <CircularProgress size={20} /> : <PaymentIcon />}
                >
                  {loading ? 'Создание платежа...' : `Оплатить ${amount || '0'} ₽`}
                </Button>

                {/* Информация о комиссии */}
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Комиссия банка может составлять от 0% до 3% в зависимости от способа оплаты.
                    Средства поступят на счет в течение нескольких минут.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    }>
      <PaymentContent />
    </Suspense>
  );
}