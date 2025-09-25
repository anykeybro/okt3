'use client';

import { Container, Typography, Box, Card, CardContent } from '@mui/material';

export default function HomePage() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h1" component="h1" gutterBottom>
          Основное приложение
        </Typography>
        <Card>
          <CardContent>
            <Typography variant="h2" component="h2" gutterBottom>
              Добро пожаловать
            </Typography>
            <Typography variant="body1">
              Основное веб-приложение готово к работе.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}