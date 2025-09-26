'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Pagination,
  TablePagination
} from '@mui/material';
import { Payment, PaymentSource, PaymentStatus } from '@/shared/types';
import { apiClient } from '@/shared/api';
import { config } from '@/shared/config/config';

interface PaymentHistoryProps {
  accountId: string;
}

export function PaymentHistory({ accountId }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const rowsPerPage = config.ui.itemsPerPage;

  useEffect(() => {
    loadPayments();
  }, [accountId, page]);

  const loadPayments = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(
        `/accounts/${accountId}/payments?page=${page + 1}&limit=${rowsPerPage}`
      );

      if (response.success && response.data) {
        const data = response.data as { payments: Payment[]; total: number };
        setPayments(data.payments || []);
        setTotalCount(data.total || 0);
      } else {
        setError(response.error || 'Ошибка загрузки истории платежей');
      }
    } catch (err) {
      setError('Произошла ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const getSourceText = (source: PaymentSource) => {
    switch (source) {
      case PaymentSource.MANUAL:
        return 'Касса';
      case PaymentSource.ROBOKASSA:
        return 'Онлайн';
      default:
        return source;
    }
  };

  const getSourceColor = (source: PaymentSource) => {
    switch (source) {
      case PaymentSource.MANUAL:
        return 'primary';
      case PaymentSource.ROBOKASSA:
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.COMPLETED:
        return 'Выполнен';
      case PaymentStatus.PENDING:
        return 'В обработке';
      case PaymentStatus.FAILED:
        return 'Ошибка';
      default:
        return status;
    }
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.COMPLETED:
        return 'success';
      case PaymentStatus.PENDING:
        return 'warning';
      case PaymentStatus.FAILED:
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          История платежей
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {payments.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              История платежей пуста
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Дата</TableCell>
                    <TableCell align="right">Сумма</TableCell>
                    <TableCell>Источник</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Комментарий</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(payment.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body1" 
                          fontWeight="medium"
                          color={payment.amount > 0 ? 'success.main' : 'error.main'}
                        >
                          {payment.amount > 0 ? '+' : ''}{payment.amount} ₽
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getSourceText(payment.source)}
                          color={getSourceColor(payment.source)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusText(payment.status)}
                          color={getStatusColor(payment.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {payment.comment || '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {totalCount > rowsPerPage && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={Math.ceil(totalCount / rowsPerPage)}
                  page={page + 1}
                  onChange={(event, newPage) => handlePageChange(event, newPage - 1)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}