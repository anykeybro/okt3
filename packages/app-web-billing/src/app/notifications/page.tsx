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
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Send,
  Refresh,
  Visibility,
} from '@mui/icons-material';
import { ProtectedRoute, SearchField, StatusChip, DateDisplay } from '../../shared/ui';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Заглушки для хуков (будут созданы позже)
const useNotifications = (params: any) => ({
  data: {
    items: [
      {
        id: '1',
        client: {
          firstName: 'Иван',
          lastName: 'Петров',
        },
        type: 'low_balance',
        channel: 'telegram',
        message: 'Ваш баланс составляет 50 рублей. Рекомендуем пополнить счет.',
        status: 'sent',
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        client: {
          firstName: 'Мария',
          lastName: 'Сидорова',
        },
        type: 'payment',
        channel: 'sms',
        message: 'Ваш платеж на сумму 1500 рублей успешно зачислен.',
        status: 'failed',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
    total: 2,
  },
  isLoading: false,
  error: null,
});

const useNotificationTemplates = (params: any) => ({
  data: {
    items: [
      {
        id: '1',
        type: 'welcome',
        channel: 'telegram',
        template: 'Добро пожаловать, {{clientName}}! Ваш лицевой счет {{accountNumber}} активирован.',
        isActive: true,
      },
      {
        id: '2',
        type: 'low_balance',
        channel: 'sms',
        template: 'Ваш баланс: {{balance}} руб. Пополните счет для продолжения услуг.',
        isActive: true,
      },
    ],
    total: 2,
  },
  isLoading: false,
  error: null,
});

export default function NotificationsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateText, setTemplateText] = useState('');

  const { data: notificationsData, isLoading: notificationsLoading, error: notificationsError } = useNotifications({
    page: page + 1,
    pageSize,
    search: search || undefined,
    type: typeFilter || undefined,
    channel: channelFilter || undefined,
    status: statusFilter || undefined,
  });

  const { data: templatesData, isLoading: templatesLoading, error: templatesError } = useNotificationTemplates({
    page: page + 1,
    pageSize,
    search: search || undefined,
    type: typeFilter || undefined,
    channel: channelFilter || undefined,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0);
    setSearch('');
    setTypeFilter('');
    setChannelFilter('');
    setStatusFilter('');
  };

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

  const handleEditTemplate = (template: any) => {
    setSelectedTemplate(template);
    setTemplateText(template.template);
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    // TODO: реализовать сохранение шаблона
    console.log('Save template:', selectedTemplate.id, templateText);
    setTemplateDialogOpen(false);
  };

  const handleResendNotification = (notificationId: string) => {
    // TODO: реализовать повторную отправку
    console.log('Resend notification:', notificationId);
  };

  const isLoading = notificationsLoading || templatesLoading;
  const error = notificationsError || templatesError;

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
        Ошибка загрузки данных уведомлений
      </Alert>
    );
  }

  return (
    <ProtectedRoute requiredPermissions={['notifications:read']}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Уведомления
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {/* TODO: открыть форму создания */}}
          >
            {tabValue === 0 ? 'Отправить уведомление' : 'Создать шаблон'}
          </Button>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="История уведомлений" />
            <Tab label="Шаблоны" />
          </Tabs>
        </Box>

        <Box display="flex" gap={2} mt={2} mb={2}>
          <SearchField
            placeholder={
              tabValue === 0 ? 'Поиск по клиенту, сообщению...' : 'Поиск шаблонов...'
            }
            onSearch={handleSearch}
            fullWidth
          />
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Тип</InputLabel>
            <Select
              value={typeFilter}
              label="Тип"
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="welcome">Приветствие</MenuItem>
              <MenuItem value="payment">Платеж</MenuItem>
              <MenuItem value="low_balance">Низкий баланс</MenuItem>
              <MenuItem value="blocked">Блокировка</MenuItem>
              <MenuItem value="unblocked">Разблокировка</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Канал</InputLabel>
            <Select
              value={channelFilter}
              label="Канал"
              onChange={(e) => setChannelFilter(e.target.value)}
            >
              <MenuItem value="">Все</MenuItem>
              <MenuItem value="telegram">Telegram</MenuItem>
              <MenuItem value="sms">SMS</MenuItem>
            </Select>
          </FormControl>
          {tabValue === 0 && (
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Статус</InputLabel>
              <Select
                value={statusFilter}
                label="Статус"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">Все</MenuItem>
                <MenuItem value="pending">Ожидает</MenuItem>
                <MenuItem value="sent">Отправлено</MenuItem>
                <MenuItem value="failed">Ошибка</MenuItem>
              </Select>
            </FormControl>
          )}
        </Box>

        {/* История уведомлений */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Дата</TableCell>
                  <TableCell>Клиент</TableCell>
                  <TableCell>Тип</TableCell>
                  <TableCell>Канал</TableCell>
                  <TableCell>Сообщение</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notificationsData?.items?.map((notification: any) => (
                  <TableRow key={notification.id} hover>
                    <TableCell>
                      <DateDisplay date={notification.createdAt} format="datetime" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {notification.client.lastName} {notification.client.firstName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          notification.type === 'welcome' ? 'Приветствие' :
                          notification.type === 'payment' ? 'Платеж' :
                          notification.type === 'low_balance' ? 'Низкий баланс' :
                          notification.type === 'blocked' ? 'Блокировка' :
                          notification.type === 'unblocked' ? 'Разблокировка' :
                          notification.type
                        }
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={notification.channel === 'telegram' ? 'Telegram' : 'SMS'}
                        size="small"
                        color={notification.channel === 'telegram' ? 'primary' : 'secondary'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 300 }}>
                        {notification.message}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={notification.status} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="Просмотр">
                        <Visibility />
                      </IconButton>
                      {notification.status === 'failed' && (
                        <IconButton
                          size="small"
                          title="Повторить отправку"
                          color="primary"
                          onClick={() => handleResendNotification(notification.id)}
                        >
                          <Refresh />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(!notificationsData?.items || notificationsData.items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {search ? 'Уведомления не найдены' : 'Нет уведомлений'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Шаблоны */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Тип</TableCell>
                  <TableCell>Канал</TableCell>
                  <TableCell>Шаблон</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templatesData?.items?.map((template: any) => (
                  <TableRow key={template.id} hover>
                    <TableCell>
                      <Chip
                        label={
                          template.type === 'welcome' ? 'Приветствие' :
                          template.type === 'payment' ? 'Платеж' :
                          template.type === 'low_balance' ? 'Низкий баланс' :
                          template.type === 'blocked' ? 'Блокировка' :
                          template.type === 'unblocked' ? 'Разблокировка' :
                          template.type
                        }
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={template.channel === 'telegram' ? 'Telegram' : 'SMS'}
                        size="small"
                        color={template.channel === 'telegram' ? 'primary' : 'secondary'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: 400 }}>
                        {template.template}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={template.isActive ? 'active' : 'blocked'} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        title="Редактировать"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton size="small" title="Удалить" color="error">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {(!templatesData?.items || templatesData.items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {search ? 'Шаблоны не найдены' : 'Нет шаблонов'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TablePagination
          rowsPerPageOptions={[10, 20, 50, 100]}
          component="div"
          count={
            tabValue === 0 ? (notificationsData?.total || 0) : (templatesData?.total || 0)
          }
          rowsPerPage={pageSize}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Строк на странице:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} из ${count !== -1 ? count : `более чем ${to}`}`
          }
        />

        {/* Диалог редактирования шаблона */}
        <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Редактировать шаблон</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Доступные переменные: {'{'}{'{'} clientName {'}'}{'}'}, {'{'}{'{'} accountNumber {'}'}{'}'}, {'{'}{'{'} balance {'}'}{'}'}, {'{'}{'{'} amount {'}'}{'}'}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={6}
                label="Текст шаблона"
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTemplateDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveTemplate} variant="contained">
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ProtectedRoute>
  );
}