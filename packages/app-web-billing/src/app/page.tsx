'use client';

import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  People,
  Block,
  TrendingUp,
  Assignment,
  DeviceHub,
  Payment,
} from '@mui/icons-material';
import { ProtectedRoute } from '../shared/ui';
import { useDashboardStats, useRecentActivity } from '../shared/hooks';
import { CurrencyDisplay, DateDisplay, StatusChip } from '../shared/ui';

const StatCard: React.FC<{
  title: string;
  value: number | string | React.ReactNode;
  icon: React.ReactNode;
  color?: string;
}> = ({ title, value, icon, color = 'primary.main' }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="text.secondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
        </Box>
        <Box sx={{ color, fontSize: 40 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: activity, isLoading: activityLoading, error: activityError } = useRecentActivity();

  if (statsLoading || activityLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (statsError || activityError) {
    return (
      <Alert severity="error">
        Ошибка загрузки данных дашборда
      </Alert>
    );
  }

  return (
    <ProtectedRoute>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Дашборд
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Активные абоненты"
              value={stats?.activeClients || 0}
              icon={<People />}
              color="success.main"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Заблокированные"
              value={stats?.blockedClients || 0}
              icon={<Block />}
              color="error.main"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Платежи за сегодня"
              value={<CurrencyDisplay amount={stats?.todayPayments || 0} variant="h4" />}
              icon={<TrendingUp />}
              color="info.main"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Новые заявки"
              value={stats?.newRequests || 0}
              icon={<Assignment />}
              color="warning.main"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Последние платежи
                </Typography>
                <List>
                  {activity?.payments?.slice(0, 5).map((payment) => (
                    <React.Fragment key={payment.id}>
                      <ListItem>
                        <ListItemIcon>
                          <Payment />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body1">
                                Л/С {payment.account?.accountNumber}
                              </Typography>
                              <CurrencyDisplay amount={payment.amount} variant="body1" />
                            </Box>
                          }
                          secondary={
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <DateDisplay date={payment.createdAt} format="relative" />
                              <StatusChip status={payment.status} />
                            </Box>
                          }
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                  {(!activity?.payments || activity.payments.length === 0) && (
                    <ListItem>
                      <ListItemText
                        primary="Нет платежей"
                        secondary="Платежи будут отображаться здесь"
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Последние заявки
                </Typography>
                <List>
                  {activity?.requests?.slice(0, 5).map((request) => (
                    <React.Fragment key={request.id}>
                      <ListItem>
                        <ListItemIcon>
                          <Assignment />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body1">
                              {request.firstName} {request.lastName}
                            </Typography>
                          }
                          secondary={
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {request.address}
                                </Typography>
                                <DateDisplay date={request.createdAt} format="relative" />
                              </Box>
                              <StatusChip status={request.status} />
                            </Box>
                          }
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
                  {(!activity?.requests || activity.requests.length === 0) && (
                    <ListItem>
                      <ListItemText
                        primary="Нет заявок"
                        secondary="Заявки будут отображаться здесь"
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Статистика устройств
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <DeviceHub sx={{ color: 'primary.main' }} />
                  <Typography variant="body1">
                    Онлайн: {stats?.onlineDevices || 0} из {stats?.totalDevices || 0} устройств
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </ProtectedRoute>
  );
}