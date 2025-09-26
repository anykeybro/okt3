import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/config';
import { errorHandler, requestLogger } from './common/middleware';
import prisma from './common/database';

const app = express();

// Middleware
app.use(helmet());
app.use(cors(config.server.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Базовые маршруты
app.get('/', (req, res) => {
  res.json({ 
    message: 'OK-Telecom Billing API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    // Проверяем подключение к базе данных
    await prisma.$runCommandRaw({ ping: 1 });
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API маршруты (будут добавлены в следующих задачах)
app.use('/api/auth', (req, res) => res.json({ message: 'Auth module - coming soon' }));
app.use('/api/clients', (req, res) => res.json({ message: 'Clients module - coming soon' }));
app.use('/api/tariffs', (req, res) => res.json({ message: 'Tariffs module - coming soon' }));
app.use('/api/devices', (req, res) => res.json({ message: 'Devices module - coming soon' }));
app.use('/api/requests', (req, res) => res.json({ message: 'Requests module - coming soon' }));
app.use('/api/payments', (req, res) => res.json({ message: 'Payments module - coming soon' }));
app.use('/api/billing', (req, res) => res.json({ message: 'Billing module - coming soon' }));
app.use('/api/notifications', (req, res) => res.json({ message: 'Notifications module - coming soon' }));
app.use('/api/dashboard', (req, res) => res.json({ message: 'Dashboard module - coming soon' }));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Маршрут не найден',
    path: req.originalUrl 
  });
});

// Error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Получен сигнал SIGTERM, завершаем работу...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Получен сигнал SIGINT, завершаем работу...');
  await prisma.$disconnect();
  process.exit(0);
});

// Запуск сервера
const server = app.listen(config.server.port, config.server.host, () => {
  console.log(`🚀 OK-Telecom Billing API Server запущен на ${config.server.host}:${config.server.port}`);
  console.log(`📊 Health check: http://${config.server.host}:${config.server.port}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default server;