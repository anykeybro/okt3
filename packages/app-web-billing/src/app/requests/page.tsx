'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Visibility,
  Edit,
  Assignment,
  PersonAdd,
} from '@mui/icons-material';
import { ProtectedRoute, SearchField, StatusChip, DateDisplay } from '../../shared/ui';

// Заглушка для хука заявок (будет создан позже)
const useRequests = (params: any) => ({
  data: {
    items: [
      {
        id: '1',
        firstName: 'Иван',
        lastName: 'Петров',
        phone: '+7 (999) 123-45-67',
        address: 'ул. Ленина, 123',
        desiredServices: ['Интернет', 'IPTV'],
        status: 'new',
        assignedTo: null,
        assignedUser: null,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '2',
        firstName: 'Мария',
        lastName: 'Сидорова',
        phone: '+7 (999) 987-65-43',
        address: 'пр. Мира, 45',
        desiredServices: ['Интернет'],
        status: 'in_progress',
        assignedTo: 'admin1',
        assignedUser: { username: 'Администратор' },
        notes: 'Требуется прокладка кабеля',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
    total: 2,
  },
  isLoading: false,
  error: null,
});

export default function RequestsPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');

  const { data, isLoading, error } = useRequests({
    page: page + 1,
    pageSize,
    search: search || undefined,
    status: statusFilter || undefined,
    assignedTo: assignedFilter || undefined,
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

  const handleStatusChange = (request: any) => {
    setSelectedRequest(request);
    setNewStatus(request.status);
    setNotes(request.notes || '');
    setStatusDialogOpen(true);
  };

  const handleStatusUpdate = () => {
    // TODO: реализовать обновление статуса
    console.log('Update status:', selectedRequest.id, newStatus, notes);
    setStatusDialogOpen(false);
  };

  const handleCreateAccount = (requestId: string) => {
    // TODO: реализовать создание лицевого счета
    console.log('Create account for request:', requestId);
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
        Ошибка загрузки списка заявок
      </Alert>
    );
  }

  return (
    <ProtectedRoute requiredPermissions={['requests:read']}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Заявки (CRM)
        </Typography>

        <Box display="flex" gap={2} mb={3}>
          <SearchField
            placeholder="Поиск по ФИО, телефону, адресу..."
            onSearch={handleSearch}
            fullWidth
          />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Статус</InputLabel>
            <Select
              value={statusFilter}
              label="Статус"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="new">Новые</MenuItem>
              <MenuItem value="in_progress">В работе</MenuItem>
              <MenuItem value="completed">Выполненные</MenuItem>
              <MenuItem value="cancelled">Отмененные</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Исполнитель</InputLabel>
            <Select
              value={assignedFilter}
              label="Исполнитель"
              onChange={(e) => setAssignedFilter(e.target.value)}
            >
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="unassigned">Не назначено</MenuItem>
              <MenuItem value="me">Мои</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>№</TableCell>
                <TableCell>ФИО</TableCell>
                <TableCell>Телефон</TableCell>
                <TableCell>Адрес</TableCell>
                <TableCell>Услуги</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Исполнитель</TableCell>
                <TableCell>Создана</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items?.map((request: any, index: number) => (
                <TableRow key={request.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      #{page * pageSize + index + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {request.lastName} {request.firstName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {request.phone}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {request.address}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {request.desiredServices.map((service: string, idx: number) => (
                      <Chip
                        key={idx}
                        label={service}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </TableCell>
                  <TableCell>
                    <StatusChip status={request.status} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {request.assignedUser?.username || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <DateDisplay date={request.createdAt} format="relative" showTooltip />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      title="Просмотр"
                      onClick={() => {/* TODO: открыть карточку заявки */}}
                    >
                      <Visibility />
                    </IconButton>
                    <IconButton
                      size="small"
                      title="Изменить статус"
                      onClick={() => handleStatusChange(request)}
                    >
                      <Edit />
                    </IconButton>
                    {request.status === 'completed' && (
                      <IconButton
                        size="small"
                        title="Создать лицевой счет"
                        color="primary"
                        onClick={() => handleCreateAccount(request.id)}
                      >
                        <PersonAdd />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!data?.items || data.items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary">
                      {search ? 'Заявки не найдены' : 'Нет заявок'}
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

        {/* Диалог изменения статуса */}
        <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Изменить статус заявки</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Статус</InputLabel>
                <Select
                  value={newStatus}
                  label="Статус"
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <MenuItem value="new">Новая</MenuItem>
                  <MenuItem value="in_progress">В работе</MenuItem>
                  <MenuItem value="completed">Выполнена</MenuItem>
                  <MenuItem value="cancelled">Отменена</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Комментарий"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Добавьте комментарий к изменению статуса..."
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStatusDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleStatusUpdate} variant="contained">
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ProtectedRoute>
  );
}