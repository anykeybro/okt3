'use client';

import { useEffect, useState, Suspense } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import { 
  CheckCircle, 
  Error, 
  ArrowBack,
  Receipt,
  Home
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/shared/api';

interface PaymentResult {
  success: boolean;
  amount?: number;
  accountNumber?: string;
  transactionId?: string;
  error?: string;
}

function PaymentResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PaymentResult | null>(null);

  useEffect(() => {
    const checkPaymentResult = async () => {
      const invoiceId = searchParams.get('InvId');
      const signature = searchParams.get('SignatureValue');
      
      if (!invoiceId) {
        setResult({
          success: false,
          error: 'Отсутствуют параметры платежа'
        });
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.post('/payments/verify', {
          invoiceId,
          signature,
          // Передаем все параметры от Robokassa
          params: Object.fromEntries(searchParams.entries())
        });

        if (response.success && response.data) {
          const data = response.data as {
            amount: number;
            accountNumber: string;
            transactionId: string;
          };
          setResult({
            success: true,
            amount: data.amount,
            accountNumber: data.accountNumber,
            transactionId: data.transactionId
          });
        } else {
          setResult({
            success: false,
            error: response.error || 'Ошибка проверки платежа'
          });
        }
      } catch (err) {
        setResult({
          success: false,
          error: 'Произошла ошибка при проверке платежа'
        });
      } finally {
        setLoading(false);
      }
    };

    checkPaymentResult();
  }, [searchParams]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6">
            Проверка результата платежа...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!result) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          Не удалось получить информацию о платеже
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card>
        <CardContent sx={{ textAlign: 'center', p: 4 }}>
          {result.success ? (
            <>
              {/* Успешная оплата */}
              <CheckCircle 
                sx={{ 
                  fontSize: 80, 
                  color: 'success.main', 
                  mb: 3 
                }} 
              />
              
              <Typography variant="h4" color="success.main" gutterBottom>
                Платеж успешно выполнен!
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 4 }}>
                Спасибо за оплату. Средства поступили на ваш лицевой счет.
              </Typography>

              {/* Детали платежа */}
              <Paper sx={{ p: 3, mb: 4, bgcolor: 'grey.50' }}>
                <Typography variant="h6" gutterBottom>
                  Детали платежа
                </Typography>
                
                {result.amount && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Сумма:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {result.amount} ₽
                    </Typography>
                  </Box>
                )}
                
                {result.accountNumber && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Лицевой счет:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {result.accountNumber}
                    </Typography>
                  </Box>
                )}
                
                {result.transactionId && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      ID транзакции:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {result.transactionId}
                    </Typography>
                  </Box>
                )}
              </Paper>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<Home />}
                  component={Link}
                  href="/cabinet"
                  size="large"
                >
                  Личный кабинет
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Receipt />}
                  component={Link}
                  href="/payment"
                  size="large"
                >
                  Новый платеж
                </Button>
              </Box>
            </>
          ) : (
            <>
              {/* Ошибка оплаты */}
              <Error 
                sx={{ 
                  fontSize: 80, 
                  color: 'error.main', 
                  mb: 3 
                }} 
              />
              
              <Typography variant="h4" color="error.main" gutterBottom>
                Ошибка платежа
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 4 }}>
                {result.error || 'Произошла ошибка при обработке платежа'}
              </Typography>

              <Alert severity="error" sx={{ mb: 4 }}>
                <Typography variant="body2">
                  Если средства были списаны с вашей карты, они будут возвращены в течение 3-5 рабочих дней.
                  При возникновении вопросов обратитесь в службу поддержки.
                </Typography>
              </Alert>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<Receipt />}
                  component={Link}
                  href="/payment"
                  size="large"
                >
                  Попробовать снова
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  component={Link}
                  href="/"
                  size="large"
                >
                  На главную
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Контакты поддержки */}
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Служба поддержки:</strong><br/>
            Телефон: +7 (800) 123-45-67<br/>
            Email: support@ok-telecom.ru<br/>
            Время работы: круглосуточно
          </Typography>
        </Alert>
      </Box>
    </Container>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6">
            Загрузка...
          </Typography>
        </Box>
      </Container>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}