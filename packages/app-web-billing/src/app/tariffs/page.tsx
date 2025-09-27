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
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
} from '@mui/icons-material';
import { ProtectedRoute, SearchField, StatusChip, CurrencyDisplay } from '../../shared/ui';
import { useTariffs, useServices, useTariffGroups } from '../../shared/hooks';

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

export default function TariffsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const { data: tariffsData, isLoading: tariffsLoading, error: tariffsError } = useTariffs({
    page: page + 1,
    pageSize,
    search: search || undefined,
    isActive: showInactive ? undefined : true,
  });

  const { data: servicesData, isLoading: servicesLoading, error: servicesError } = useServices({
    page: page + 1,
    pageSize,
    search: search || undefined,
    isActive: showInactive ? undefined : true,
  });

  const { data: groupsData, isLoading: groupsLoading, error: groupsError } = useTariffGroups({
    page: page + 1,
    pageSize,
    search: search || undefined,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setPage(0);
    setSearch('');
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

  const isLoading = tariffsLoading || servicesLoading || groupsLoading;
  const error = tariffsError || servicesError || groupsError;

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
        Ошибка загрузки данных
      </Alert>
    );
  }

  return (
    <ProtectedRoute requiredPermissions={['tariffs:read']}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Тарифы и услуги
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {/* TODO: открыть форму создания */}}
          >
            {tabValue === 0 && 'Добавить тариф'}
            {tabValue === 1 && 'Добавить услугу'}
            {tabValue === 2 && 'Добавить группу'}
          </Button>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Тарифы" />
            <Tab label="Услуги" />
            <Tab label="Группы тарифов" />
          </Tabs>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} mb={2}>
          <SearchField
            placeholder={
              tabValue === 0 ? 'Поиск тарифов...' :
              tabValue === 1 ? 'Поиск услуг...' :
              'Поиск групп...'
            }
            onSearch={handleSearch}
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
            }
            label="Показать неактивные"
            sx={{ ml: 2 }}
          />
        </Box>

        {/* Тарифы */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell>Цена</TableCell>
                  <TableCell>Скорость</TableCell>
                  <TableCell>Тип биллинга</TableCell>
                  <TableCell>Услуги</TableCell>
                  <TableCell>Группа</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tariffsData?.items?.map((tariff) => (
                  <TableRow key={tariff.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {tariff.name}
                      </Typography>
                      {tariff.description && (
                        <Typography variant="body2" color="text.secondary">
                          {tariff.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <CurrencyDisplay amount={tariff.price} variant="body2" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {tariff.speedDown}/{tariff.speedUp} Мбит/с
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={tariff.billingType === 'prepaid_monthly' ? 'Предоплата' : 'Почасовая'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {tariff.services.map(service => (
                        <Chip
                          key={service.id}
                          label={service.name}
                          size="small"
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </TableCell>
                    <TableCell>
                      {tariff.group?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={tariff.isActive ? 'active' : 'blocked'} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="Просмотр">
                        <Visibility />
                      </IconButton>
                      <IconButton size="small" title="Редактировать">
                        <Edit />
                      </IconButton>
                      <IconButton size="small" title="Удалить" color="error">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {(!tariffsData?.items || tariffsData.items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {search ? 'Тарифы не найдены' : 'Нет тарифов'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Услуги */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell>Тип</TableCell>
                  <TableCell>Описание</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {servicesData?.items?.map((service) => (
                  <TableRow key={service.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {service.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          service.type === 'internet' ? 'Интернет' :
                          service.type === 'iptv' ? 'IPTV' :
                          service.type === 'cloud_storage' ? 'Облако' :
                          service.type
                        }
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {service.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={service.isActive ? 'active' : 'blocked'} />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="Редактировать">
                        <Edit />
                      </IconButton>
                      <IconButton size="small" title="Удалить" color="error">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {(!servicesData?.items || servicesData.items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {search ? 'Услуги не найдены' : 'Нет услуг'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Группы тарифов */}
        <TabPanel value={tabValue} index={2}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell>Описание</TableCell>
                  <TableCell>Количество тарифов</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupsData?.items?.map((group) => (
                  <TableRow key={group.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {group.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {group.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {group.tariffs?.length || 0}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" title="Редактировать">
                        <Edit />
                      </IconButton>
                      <IconButton size="small" title="Удалить" color="error">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {(!groupsData?.items || groupsData.items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="text.secondary">
                        {search ? 'Группы не найдены' : 'Нет групп'}
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
            tabValue === 0 ? (tariffsData?.total || 0) :
            tabValue === 1 ? (servicesData?.total || 0) :
            (groupsData?.total || 0)
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
      </Box>
    </ProtectedRoute>
  );
}