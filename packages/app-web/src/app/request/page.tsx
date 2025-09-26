'use client';

import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import { ArrowBack, Send } from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/shared/api';
import { RequestForm, ServiceType } from '@/shared/types';
import { config } from '@/shared/config/config';

export default function RequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<RequestForm>({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    desiredServices: []
  });

  const services = [
    { id: ServiceType.INTERNET, name: 'Интернет', description: 'Высокоскоростной доступ в интернет' },
    { id: ServiceType.IPTV, name: 'IPTV', description: 'Цифровое телевидение' },
    { id: ServiceType.CLOUD_STORAGE, name: 'Облачное хранилище', description: 'Безопасное хранение данных' }
  ];

  const handleInputChange = (field: keyof RequestForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleServiceChange = (serviceId: string) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      desiredServices: event.target.checked
        ? [...prev.desiredServices, serviceId]
        : prev.desiredServices.filter(id => id !== serviceId)
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.firstName.trim()) {
      setError('Введите имя');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Введите фамилию');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Введите номер телефона');
      return false;
    }
    if (!config.validation.phoneRegex.test(formData.phone)) {
      setError('Введите корректный номер телефона');
      return false;
    }
    if (!formData.address.trim()) {
      setError('Введите адрес');
      return false;
    }
    if (formData.desiredServices.length === 0) {
      setError('Выберите хотя бы одну услугу');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/requests', formData);
      
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setError(response.error || 'Произошла ошибка при отправке заявки');
      }
    } catch (err) {
      setError('Произошла ошибка при отправке заявки. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" color="success.main" gutterBottom>
            Заявка успешно отправлена!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Мы свяжемся с вами в ближайшее время для уточнения деталей подключения.
          </Typography>
          <Button
            variant="contained"
            component={Link}
            href="/"
            startIcon={<ArrowBack />}
          >
            Вернуться на главную
          </Button>
        </Paper>
      </Container>
    );
  }

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
          Подача заявки на подключение
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Заполните форму ниже, и наш специалист свяжется с вами для уточнения деталей
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Личные данные */}
              <Grid item xs={12}>
                <Typography variant="h5" gutterBottom>
                  Личные данные
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Имя"
                  value={formData.firstName}
                  onChange={handleInputChange('firstName')}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Фамилия"
                  value={formData.lastName}
                  onChange={handleInputChange('lastName')}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Номер телефона"
                  value={formData.phone}
                  onChange={handleInputChange('phone')}
                  placeholder="+7 (999) 123-45-67"
                  required
                />
              </Grid>

              {/* Адрес */}
              <Grid item xs={12}>
                <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
                  Адрес подключения
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Полный адрес"
                  value={formData.address}
                  onChange={handleInputChange('address')}
                  placeholder="г. Москва, ул. Примерная, д. 1, кв. 1"
                  multiline
                  rows={2}
                  required
                />
              </Grid>

              {/* Услуги */}
              <Grid item xs={12}>
                <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
                  Желаемые услуги
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Выберите услуги, которые вас интересуют
                </Typography>
              </Grid>

              {services.map((service) => (
                <Grid item xs={12} key={service.id}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.desiredServices.includes(service.id)}
                        onChange={handleServiceChange(service.id)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {service.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {service.description}
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
              ))}

              {/* Ошибка */}
              {error && (
                <Grid item xs={12}>
                  <Alert severity="error">{error}</Alert>
                </Grid>
              )}

              {/* Кнопка отправки */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <Send />}
                    sx={{ minWidth: 200 }}
                  >
                    {loading ? 'Отправка...' : 'Отправить заявку'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>

      {/* Дополнительная информация */}
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Обратите внимание:</strong> После отправки заявки наш специалист свяжется с вами 
            в течение рабочего дня для уточнения технических деталей и согласования времени подключения.
          </Typography>
        </Alert>
      </Box>
    </Container>
  );
}