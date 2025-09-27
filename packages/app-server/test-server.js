const express = require('express');

const app = express();

// Простой middleware для логирования
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Простой health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'test-server'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'test-server-api'
  });
});

const port = 3001;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Test server запущен на порту ${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Получен SIGINT, завершаем работу...');
  server.close(() => {
    console.log('Сервер остановлен');
    process.exit(0);
  });
});