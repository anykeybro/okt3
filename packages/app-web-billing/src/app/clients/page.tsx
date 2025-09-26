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
  Chip,
  TablePagination,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Visibility,
  Block,
  PlayArrow,
  Pause,
} from '@mui/icons-material';
import { ProtectedRoute, SearchField, StatusChip, CurrencyDisplay, DateDisplay } from '../../shared/ui';
import { useClients } from '../../shared/hooks';
import type { Client } from '../../shared/types/api';

export default function ClientsPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useClients({
    page: page + 1,
    pageSize,
    search: search || undefined,
  });

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
        Ошибка загрузки списка клиентов
      </Alert>
    );
  }

  return (
    <ProtectedRoute requiredPermissions={['clients:read']}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Абоненты
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {/* TODO: открыть форму создания */}}
          >
            Добавить абонента
          </Button>
        </Box>

        <Box mb={3}>
          <SearchField
            placeholder="Поиск по ФИО, телефону, адресу..."
            onSearch={handleSearch}
            fullWidth
          />
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Л/С</TableCell>
                <TableCell>ФИО</TableCell>
                <TableCell>Телефон</TableCell>
                <TableCell>Адрес</TableCell>
                <TableCell>Тариф</TableCell>
                <TableCell>Баланс</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Создан</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.map((client: Client) => (
                <TableRow key={client.id} hover>
                  <TableCell>
                    {client.accounts.map(account => (
                      <Chip
                        key={account.id}
                        label={account.accountNumber}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {client.lastName} {client.firstName}
                    </Typography>
                    {client.middleName && (
                      <Typography variant="body2" color="text.secondary">
                        {client.middleName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {client.phones.map((phone, index) => (
                      <Typography key={index} variant="body2">
                        {phone}
                      </Typography>
                    ))}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {client.address || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {client.accounts.map(account => (
                      <Typography key={account.id} variant="body2">
                        {account.tariff?.name || '—'}
                      </Typography>
                    ))}
                  </TableCell>
                  <TableCell>
                    {client.accounts.map(account => (
                      <CurrencyDisplay
                        key={account.id}
                        amount={account.balance}
                        variant="body2"
                        colorize
                      />
                    ))}
                  </TableCell>
                  <TableCell>
                    {client.accounts.map(account => (
                      <StatusChip
                        key={account.id}
                        status={account.status}
                        sx={{ mb: 0.5 }}
                      />
                    ))}
                  </TableCell>
                  <TableCell>
                    <DateDisplay date={client.createdAt} format="date" />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      title="Просмотр"
                      onClick={() => {/* TODO: открыть карточку клиента */}}
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      title="Редактировать"
                      onClick={() => {/* TODO: открыть форму редактирования */}}
                    >
                      <Edit />
                    </IconButton>
                    {client.accounts.some(acc => acc.status === 'active') && (
                      <IconButton
                        size="small"
                        title="Заблокировать"
                        color="error"
                        onClick={() => {/* TODO: заблокировать */}}
                      >
                        <Block />
                      </IconButton>
                    )}
                    {client.accounts.some(acc => acc.status === 'blocked') && (
                      <IconButton
                        size="small"
                        title="Разблокировать"
                        color="success"
                        onClick={() => {/* TODO: разблокировать */}}
                      >
                        <PlayArrow />
                      </IconButton>
                    )}
                    {client.accounts.some(acc => acc.status === 'active') && (
                      <IconButton
                        size="small"
                        title="Приостановить"
                        color="warning"
                        onClick={() => {/* TODO: приостановить */}}
                      >
                        <Pause />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!data?.items || data.items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary">
                      {search ? 'Клиенты не найдены' : 'Нет клиентов'}
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
      </Box>
    </ProtectedRoute>
  );
}