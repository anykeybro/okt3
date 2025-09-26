'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TablePagination,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add,
  Visibility,
  Receipt,
  Cancel,
  CheckCircle,
} from '@mui/icons-material';
import { ProtectedRoute, SearchField, StatusChip, CurrencyDisplay, DateDisplay } from '../../shared/ui';

// Заглушка для хуков (будут созданы позже)
const usePayments = (params: any) => ({
  data: {
    items: [
      {
        id: '1',
        account: {
          id: '1',
          accountNumber: 'ACC001',
          client: {
            firstName: 'Иван',
            lastName: 'Петров',
          },
        },
        amount: 1500,
        source: 'manual',
        comment: 'Пополнение через кассу',
        processedBy: 'admin1',
        processedByUser: { username: 'Кассир' },
        status: 'completed',
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
      },
      {
        id: '2',
        account: {
          id: '2',
          accountNumber: 'ACC002',
          client: {
            firstName: 'Мария',
            lastName: 'Сидорова',
          },
        },
        amount: 2000,
        source: 'robokassa',
        externalId: 'RBK123456',
        status: 'pending',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
    total: 2,
  },
  isLoading: false,
  error: null,
});

const useSearchClients = (query: string) => ({
  data: query.length >= 2 ? [
    {
      id: '1',
      firstName: 'Иван',
      lastName: 'Петров',
      phones: ['+7 (999) 123-45-67'],
      accounts: [{ id: '1', accountNumber: 'ACC001', balance: 500 }],
    },
    {
      id: '2',
      firstName: 'Мария',
      lastName: 'Сидорова',
      phones: ['+7 (999) 987-65-43'],
      accounts: [{ id: '2', accountNumber: 'ACC002', balance: -100 }],
    },
  ] : [],
  isLoading: false,
});

export default function PaymentsPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  const { data, isLoading, error } = usePayments({
    page: page + 1,
    pageSize,
    search: search || undefined,
    source: sourceFilter || undefined,
    status: statusFilter || undefined,
  });

  const { data: clientsData } = useSearchClients(clientSearch);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearch = (query: string) => {
    setSearch(query);
    setPage(0);
  };

  const handleCreatePayment = () => {
    setPaymentDialogOpen(true);
    setSelectedClient(null);
    setSelectedAccount(null);
    setAmount('');
    setComment('');
    setClientSearch('');
  };

  const handleSubmitPayment = () => {
    // TODO: реализовать создание платежа
    console.log('Create payment:', {
      accountId: selectedAccount?.id,
      amount: parseFloat(amount),
      comment,
    });
    setPaymentDialogOpen(false);
  };

  const handleClientSelect = (client: any) => {
    setSelectedClient(client);
    if (client?.accounts?.length === 1) {
      setSelectedAccount(client.accounts[0]);
    } else {
      setSelectedAccount(null);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Ошибка загрузки списка платежей
      </Alert>
    );
  }

  return (
    <ProtectedRoute requiredPermissions={['payments:read']}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Касса и платежи
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreatePayment}
          >
            Пополнить счет
          </Button>
        </Box>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Платежи за сегодня
                </Typography>
                <CurrencyDisplay amount={15000} variant="h5" />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Платежи за месяц
                </Typography>
                <CurrencyDisplay amount={450000} variant="h5" />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Ожидающие платежи
                </Typography>
                <Typography variant="h5">3</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box mb={3}>
          <SearchField
            placeholder="Поиск по номеру счета, ФИО клиента..."
            onSearch={handleSearch}
            fullWidth
          />
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Дата</TableCell>
                <TableCell>Лицевой счет</TableCell>
                <TableCell>Клиент</TableCell>
                <TableCell>Сумма</TableCell>
                <TableCell>Источник</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Обработал</TableCell>
                <TableCell>Комментарий</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.map((payment: any) => (
                <TableRow key={payment.id} hover>
                  <TableCell>
                    <DateDisplay date={payment.createdAt} format="datetime" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {payment.account.accountNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {payment.account.client.lastName} {payment.account.client.firstName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <CurrencyDisplay amount={payment.amount} variant="body2" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payment.source === 'manual' ? 'Касса' : 'Robokassa'}
                      size="small"
                      variant="outlined"
                      color={payment.source === 'manual' ? 'primary' : 'secondary'}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={payment.status} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {payment.processedByUser?.username || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200 }}>
                      {payment.comment || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" title="Просмотр">
                      <Visibility />
                    </IconButton>
                    <IconButton size="small" title="Чек">
                      <Receipt />
                    </IconButton>
                    {payment.status === 'pending' && (
                      <>
                        <IconButton size="small" title="Подтвердить" color="success">
                          <CheckCircle />
                        </IconButton>
                        <IconButton size="small" title="Отменить" color="error">
                          <Cancel />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!data?.items || data.items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary">
                      {search ? 'Платежи не найдены' : 'Нет платежей'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 20, 50, 100]}
          component="div"
          count={data?.total || 0}
          rowsPerPage={pageSize}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Строк на странице:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} из ${count !== -1 ? count : `более чем ${to}`}`
          }
        />

        {/* Диалог создания платежа */}
        <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Пополнение лицевого счета</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Autocomplete
                options={clientsData || []}
                getOptionLabel={(option) => 
                  `${option.lastName} ${option.firstName} (${option.phones[0]})`
                }
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body2">
                        {option.lastName} {option.firstName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.phones[0]} • Счетов: {option.accounts.length}
                      </Typography>
                    </Box>
                  </Box>
                )}
                value={selectedClient}
                onChange={(_, value) => handleClientSelect(value)}
                inputValue={clientSearch}
                onInputChange={(_, value) => setClientSearch(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Поиск клиента"
                    placeholder="Введите ФИО или телефон"
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                )}
              />

              {selectedClient?.accounts?.length > 1 && (
                <Autocomplete
                  options={selectedClient.accounts}
                  getOptionLabel={(option) => 
                    `${option.accountNumber} (баланс: ${option.balance} ₽)`
                  }
                  value={selectedAccount}
                  onChange={(_, value) => setSelectedAccount(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Лицевой счет"
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                  )}
                />
              )}

              {selectedAccount && (
                <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2">
                    <strong>Текущий баланс:</strong>{' '}
                    <CurrencyDisplay amount={selectedAccount.balance} colorize />
                  </Typography>
                </Box>
              )}

              <TextField
                fullWidth
                label="Сумма пополнения"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                sx={{ mb: 2 }}
                inputProps={{ min: 0, step: 0.01 }}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Комментарий"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Комментарий к платежу (необязательно)"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPaymentDialogOpen(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleSubmitPayment} 
              variant="contained"
              disabled={!selectedAccount || !amount || parseFloat(amount) <= 0}
            >
              Пополнить
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ProtectedRoute>
  );
}