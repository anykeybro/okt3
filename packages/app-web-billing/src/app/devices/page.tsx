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
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  NetworkCheck,
  Settings,
} from '@mui/icons-material';
import { ProtectedRoute, SearchField, StatusChip, DateDisplay } from '../../shared/ui';

// Заглушка для хука устройств (будет создан позже)
const useDevices = (params: any) => ({
  data: {
    items: [
      {
        id: '1',
        ipAddress: '192.168.1.1',
        description: 'Главный роутер',
        status: 'online',
        lastCheck: new Date().toISOString(),
        accounts: [{ id: '1' }, { id: '2' }],
      },
      {
        id: '2',
        ipAddress: '192.168.1.2',
        description: 'Резервный роутер',
        status: 'offline',
        lastCheck: new Date(Date.now() - 3600000).toISOString(),
        accounts: [],
      },
    ],
    total: 2,
  },
  isLoading: false,
  error: null,
});

export default function DevicesPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useDevices({
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

  const handlePingDevice = (deviceId: string) => {
    // TODO: реализовать ping устройства
    console.log('Ping device:', deviceId);
  };

  const handleTestConnection = (deviceId: string) => {
    // TODO: реализовать тест подключения
    console.log('Test connection:', deviceId);
  };

  const handleSyncDevice = (deviceId: string) => {
    // TODO: реализовать синхронизацию
    console.log('Sync device:', deviceId);
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
        Ошибка загрузки списка устройств
      </Alert>
    );
  }

  return (
    <ProtectedRoute requiredPermissions={['devices:read']}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Сетевые устройства
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {/* TODO: открыть форму создания */}}
          >
            Добавить устройство
          </Button>
        </Box>

        <Box mb={3}>
          <SearchField
            placeholder="Поиск по IP-адресу, описанию..."
            onSearch={handleSearch}
            fullWidth
          />
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>IP-адрес</TableCell>
                <TableCell>Описание</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Последняя проверка</TableCell>
                <TableCell>Подключенные абоненты</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items?.map((device: any) => (
                <TableRow key={device.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {device.ipAddress}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {device.description || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={device.status} />
                  </TableCell>
                  <TableCell>
                    <DateDisplay date={device.lastCheck} format="relative" showTooltip />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {device.accounts?.length || 0}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Ping">
                      <IconButton
                        size="small"
                        onClick={() => handlePingDevice(device.id)}
                      >
                        <NetworkCheck />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Тест подключения">
                      <IconButton
                        size="small"
                        onClick={() => handleTestConnection(device.id)}
                      >
                        <Settings />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Синхронизация">
                      <IconButton
                        size="small"
                        onClick={() => handleSyncDevice(device.id)}
                      >
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Редактировать">
                      <IconButton
                        size="small"
                        onClick={() => {/* TODO: открыть форму редактирования */}}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Удалить">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {/* TODO: удалить устройство */}}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {(!data?.items || data.items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      {search ? 'Устройства не найдены' : 'Нет устройств'}
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