'use client';

import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Button, 
  Grid, 
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  Wifi, 
  Tv, 
  Cloud, 
  Speed, 
  Support, 
  Security,
  Phone,
  Email,
  LocationOn
} from '@mui/icons-material';
import Link from 'next/link';
import { config } from '@/shared/config/config';

export default function HomePage() {
  const services = [
    {
      icon: <Wifi />,
      title: 'Высокоскоростной интернет',
      description: 'До 1000 Мбит/с для дома и офиса'
    },
    {
      icon: <Tv />,
      title: 'IPTV',
      description: 'Более 200 каналов в HD качестве'
    },
    {
      icon: <Cloud />,
      title: 'Облачное хранилище',
      description: 'Безопасное хранение ваших данных'
    }
  ];

  const advantages = [
    { icon: <Speed />, text: 'Стабильная скорость без ограничений' },
    { icon: <Support />, text: 'Техподдержка 24/7' },
    { icon: <Security />, text: 'Защищенное соединение' }
  ];

  return (
    <>
      {/* Шапка */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 2 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              {config.app.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button 
                color="inherit" 
                component={Link} 
                href="/request"
                variant="outlined"
                sx={{ borderColor: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
              >
                Подать заявку
              </Button>
              <Button 
                color="inherit" 
                component={Link} 
                href="/auth"
                variant="contained"
                sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
              >
                Личный кабинет
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Главный баннер */}
      <Box sx={{ bgcolor: 'primary.dark', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom>
                Надежный интернет для вашего дома
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
                {config.app.description}. Подключайтесь к современным технологиям уже сегодня!
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button 
                  size="large" 
                  variant="contained" 
                  component={Link} 
                  href="/request"
                  sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
                >
                  Подключиться
                </Button>
                <Button 
                  size="large" 
                  variant="outlined" 
                  component={Link} 
                  href="/payment"
                  sx={{ borderColor: 'white', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                  Оплатить
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 3, 
                  bgcolor: 'rgba(255,255,255,0.1)', 
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                <Typography variant="h5" gutterBottom sx={{ color: 'white' }}>
                  Тарифы от 500 ₽/мес
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  • Скорость до 1000 Мбит/с<br/>
                  • Безлимитный трафик<br/>
                  • Бесплатное подключение<br/>
                  • Техподдержка 24/7
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Услуги */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Наши услуги
        </Typography>
        <Typography variant="h6" textAlign="center" sx={{ mb: 6, color: 'text.secondary' }}>
          Полный спектр телекоммуникационных услуг для дома и бизнеса
        </Typography>
        
        <Grid container spacing={4}>
          {services.map((service, index) => (
            <Grid item xs={12} md={4} key={index}>
              <Card sx={{ height: '100%', textAlign: 'center', p: 2 }}>
                <CardContent>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>
                    {service.icon}
                  </Box>
                  <Typography variant="h5" component="h3" gutterBottom>
                    {service.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {service.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Преимущества */}
      <Box sx={{ bgcolor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
            Почему выбирают нас
          </Typography>
          <Grid container spacing={4} sx={{ mt: 2 }}>
            {advantages.map((advantage, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ color: 'primary.main' }}>
                    {advantage.icon}
                  </Box>
                  <Typography variant="h6">
                    {advantage.text}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Контакты */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom>
          Контакты
        </Typography>
        <Grid container spacing={4} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Phone color="primary" />
              <Box>
                <Typography variant="h6">Телефон</Typography>
                <Typography color="text.secondary">+7 (800) 123-45-67</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Email color="primary" />
              <Box>
                <Typography variant="h6">Email</Typography>
                <Typography color="text.secondary">info@ok-telecom.ru</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <LocationOn color="primary" />
              <Box>
                <Typography variant="h6">Адрес</Typography>
                <Typography color="text.secondary">г. Москва, ул. Примерная, д. 1</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Футер */}
      <Box sx={{ bgcolor: 'grey.900', color: 'white', py: 4 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" gutterBottom>
                {config.app.name}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Современные телекоммуникационные услуги для дома и бизнеса
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Быстрые ссылки
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button color="inherit" component={Link} href="/request" sx={{ justifyContent: 'flex-start' }}>
                  Подать заявку
                </Button>
                <Button color="inherit" component={Link} href="/auth" sx={{ justifyContent: 'flex-start' }}>
                  Личный кабинет
                </Button>
                <Button color="inherit" component={Link} href="/payment" sx={{ justifyContent: 'flex-start' }}>
                  Оплата услуг
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', mt: 4, pt: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ opacity: 0.6 }}>
              © 2024 {config.app.name}. Все права защищены.
            </Typography>
          </Box>
        </Container>
      </Box>
    </>
  );
}