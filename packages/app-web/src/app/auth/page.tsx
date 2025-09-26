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
  Alert,
  CircularProgress,
  Paper,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { ArrowBack, Phone, Sms } from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/hooks/useAuth';
import { config } from '@/shared/config/config';

export default function AuthPage() {
  const router = useRouter();
  const { login, verifyCode } = useAuth();
  
  const [step, setStep] = useState(0); // 0 - ввод телефона, 1 - ввод кода
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const steps = ['Номер телефона', 'Код подтверждения'];

  const validatePhone = (phoneNumber: string): boolean => {
    return config.validation.phoneRegex.test(phoneNumber);
  };

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handlePhoneSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!phone.trim()) {
      setError('Введите номер телефона');
      return;
    }

    if (!validatePhone(phone)) {
      setError('Введите корректный номер телефона');
      return;
    }

    setLoading(true);

    try {
      const result = await login(phone);
      
      if (result.success) {
        setStep(1);
        startCountdown();
      } else {
        setError(result.error || 'Произошла ошибка при отправке кода');
      }
    } catch (err) {
      setError('Произошла ошибка. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError('Введите код подтверждения');
      return;
    }

    if (code.length !== 4) {
      setError('Код должен содержать 4 цифры');
      return;
    }

    setLoading(true);

    try {
      const result = await verifyCode(phone, code);
      
      if (result.success) {
        router.push('/cabinet');
      } else {
        setError(result.error || 'Неверный код подтверждения');
      }
    } catch (err) {
      setError('Произошла ошибка. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    setError(null);
    setLoading(true);

    try {
      const result = await login(phone);
      
      if (result.success) {
        startCountdown();
        setCode('');
      } else {
        setError(result.error || 'Произошла ошибка при отправке кода');
      }
    } catch (err) {
      setError('Произошла ошибка. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      setStep(0);
      setCode('');
      setError(null);
    } else {
      router.push('/');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      {/* Шапка */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          {step === 0 ? 'Назад на главную' : 'Назад'}
        </Button>
        <Typography variant="h3" component="h1" textAlign="center" gutterBottom>
          Вход в личный кабинет
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center">
          Для входа в личный кабинет введите номер телефона, указанный при подключении
        </Typography>
      </Box>

      {/* Прогресс */}
      <Box sx={{ mb: 4 }}>
        <Stepper activeStep={step} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          {step === 0 ? (
            // Шаг 1: Ввод номера телефона
            <form onSubmit={handlePhoneSubmit}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Phone sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Введите номер телефона
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Мы отправим SMS с кодом подтверждения
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="Номер телефона"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 123-45-67"
                sx={{ mb: 3 }}
                autoFocus
              />

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : undefined}
              >
                {loading ? 'Отправка...' : 'Получить код'}
              </Button>
            </form>
          ) : (
            // Шаг 2: Ввод кода подтверждения
            <form onSubmit={handleCodeSubmit}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Sms sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Введите код из SMS
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Код отправлен на номер {phone}
                </Typography>
              </Box>

              <TextField
                fullWidth
                label="Код подтверждения"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
                sx={{ mb: 3 }}
                autoFocus
                inputProps={{
                  maxLength: 4,
                  style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }
                }}
              />

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || code.length !== 4}
                startIcon={loading ? <CircularProgress size={20} /> : undefined}
                sx={{ mb: 2 }}
              >
                {loading ? 'Проверка...' : 'Войти'}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Button
                  onClick={handleResendCode}
                  disabled={countdown > 0 || loading}
                  variant="text"
                >
                  {countdown > 0 
                    ? `Повторная отправка через ${countdown} сек`
                    : 'Отправить код повторно'
                  }
                </Button>
              </Box>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Дополнительная информация */}
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Не можете войти?</strong> Обратитесь в службу поддержки по телефону 
            +7 (800) 123-45-67 или напишите на info@ok-telecom.ru
          </Typography>
        </Alert>
      </Box>
    </Container>
  );
}