'use client';

import { Container, Typography, Box, Card, CardContent, List, ListItem, ListItemText, Link } from '@mui/material';

export default function HomePage() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h1" component="h1" gutterBottom>
          Биллинг система
        </Typography>
        <Card>
          <CardContent>
            <Typography variant="h2" component="h2" gutterBottom>
              Добро пожаловать
            </Typography>
            <Typography variant="body1">
              Система управления биллингом готова к работе.
            </Typography>
          </CardContent>
        </Card>

        <Box sx={{ mt: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h3" component="h3" gutterBottom>
                Полезные ссылки
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary={
                      <Link href="/" target="_blank" rel="noopener noreferrer">
                        Главная страница сайта
                      </Link>
                    }
                    secondary="Корень веб-приложения"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={
                      <Link href="/grafana" target="_blank" rel="noopener noreferrer">
                        Grafana
                      </Link>
                    }
                    secondary="Система мониторинга и визуализации метрик"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={
                      <Link href="/zabbix" target="_blank" rel="noopener noreferrer">
                        Zabbix
                      </Link>
                    }
                    secondary="Система мониторинга инфраструктуры"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
}