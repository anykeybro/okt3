'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import {
  Save,
  Edit,
  Delete,
  Add,
} from '@mui/icons-material';
import { ProtectedRoute } from '../../shared/ui';

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

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState({
    // Общие настройки
    companyName: 'OK-Telecom',
    companyAddress: 'г. Москва, ул. Примерная, д. 1',
    companyPhone: '+7 (495) 123-45-67',
    companyEmail: 'info@ok-telecom.ru',
    
    // Биллинг
    autoBlockEnabled: true,
    notificationDays: 3,
    hourlyCheckInterval: 60,
    
    // SMS настройки
    smsGatewayEnabled: true,
    smsGatewayIp: '192.168.1.100',
    smsGatewayUsername: 'admin',
    
    // Telegram настройки
    telegramBotEnabled: true,
    telegramBotToken: '',
    telegramWebhookUrl: '',
    
    // Robokassa настройки
    robokassaEnabled: true,
    robokassaMerchantId: '',
    robokassaPassword1: '',
    robokassaPassword2: '',
    
    // Yandex Maps
    yandexMapsApiKey: '',
  });

  const [users] = useState([
    { id: '1', username: 'admin', role: 'Суперадмин', isActive: true },
    { id: '2', username: 'cashier1', role: 'Кассир', isActive: true },
    { id: '3', username: 'tech1', role: 'Монтажник', isActive: false },
  ]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveSettings = () => {
    // TODO: реализовать сохранение настроек
    console.log('Save settings:', settings);
  };

  return (
    <ProtectedRoute requiredPermissions={['settings:read']}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Настройки системы
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Общие" />
            <Tab label="Биллинг" />
            <Tab label="Интеграции" />
            <Tab label="Пользователи" />
          </Tabs>
        </Box>

        {/* Общие настройки */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Информация о компании" />
                <CardContent>
                  <TextField
                    fullWidth
                    label="Название компании"
                    value={settings.companyName}
                    onChange={(e) => handleSettingChange('companyName', e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Адрес"
                    value={settings.companyAddress}
                    onChange={(e) => handleSettingChange('companyAddress', e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Телефон"
                    value={settings.companyPhone}
                    onChange={(e) => handleSettingChange('companyPhone', e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={settings.companyEmail}
                    onChange={(e) => handleSettingChange('companyEmail', e.target.value)}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Yandex Maps API" />
                <CardContent>
                  <TextField
                    fullWidth
                    label="API ключ"
                    type="password"
                    value={settings.yandexMapsApiKey}
                    onChange={(e) => handleSettingChange('yandexMapsApiKey', e.target.value)}
                    helperText="Для работы с геолокацией клиентов"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Настройки биллинга */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Автоматическая блокировка" />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.autoBlockEnabled}
                        onChange={(e) => handleSettingChange('autoBlockEnabled', e.target.checked)}
                      />
                    }
                    label="Включить автоблокировку при нулевом балансе"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Интервал проверки (минуты)"
                    type="number"
                    value={settings.hourlyCheckInterval}
                    onChange={(e) => handleSettingChange('hourlyCheckInterval', parseInt(e.target.value))}
                    helperText="Как часто проверять балансы клиентов"
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Уведомления" />
                <CardContent>
                  <TextField
                    fullWidth
                    label="Уведомлять за N дней до окончания средств"
                    type="number"
                    value={settings.notificationDays}
                    onChange={(e) => handleSettingChange('notificationDays', parseInt(e.target.value))}
                    helperText="По умолчанию для новых тарифов"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Интеграции */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="SMS шлюз (Huawei E3372)" />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.smsGatewayEnabled}
                        onChange={(e) => handleSettingChange('smsGatewayEnabled', e.target.checked)}
                      />
                    }
                    label="Включить SMS уведомления"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="IP адрес модема"
                    value={settings.smsGatewayIp}
                    onChange={(e) => handleSettingChange('smsGatewayIp', e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Имя пользователя"
                    value={settings.smsGatewayUsername}
                    onChange={(e) => handleSettingChange('smsGatewayUsername', e.target.value)}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Telegram Bot" />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.telegramBotEnabled}
                        onChange={(e) => handleSettingChange('telegramBotEnabled', e.target.checked)}
                      />
                    }
                    label="Включить Telegram бота"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Bot Token"
                    type="password"
                    value={settings.telegramBotToken}
                    onChange={(e) => handleSettingChange('telegramBotToken', e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Webhook URL"
                    value={settings.telegramWebhookUrl}
                    onChange={(e) => handleSettingChange('telegramWebhookUrl', e.target.value)}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Robokassa" />
                <CardContent>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.robokassaEnabled}
                        onChange={(e) => handleSettingChange('robokassaEnabled', e.target.checked)}
                      />
                    }
                    label="Включить онлайн платежи"
                    sx={{ mb: 2 }}
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Merchant ID"
                        value={settings.robokassaMerchantId}
                        onChange={(e) => handleSettingChange('robokassaMerchantId', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Password #1"
                        type="password"
                        value={settings.robokassaPassword1}
                        onChange={(e) => handleSettingChange('robokassaPassword1', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Password #2"
                        type="password"
                        value={settings.robokassaPassword2}
                        onChange={(e) => handleSettingChange('robokassaPassword2', e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Пользователи */}
        <TabPanel value={tabValue} index={3}>
          <Card>
            <CardHeader 
              title="Администраторы системы"
              action={
                <Button startIcon={<Add />} variant="contained">
                  Добавить пользователя
                </Button>
              }
            />
            <CardContent>
              <List>
                {users.map((user, index) => (
                  <React.Fragment key={user.id}>
                    <ListItem>
                      <ListItemText
                        primary={user.username}
                        secondary={`Роль: ${user.role} • Статус: ${user.isActive ? 'Активен' : 'Заблокирован'}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" aria-label="edit">
                          <Edit />
                        </IconButton>
                        <IconButton edge="end" aria-label="delete" color="error">
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < users.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </TabPanel>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSaveSettings}
            size="large"
          >
            Сохранить настройки
          </Button>
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          После изменения настроек интеграций может потребоваться перезапуск сервисов.
        </Alert>
      </Box>
    </ProtectedRoute>
  );
}