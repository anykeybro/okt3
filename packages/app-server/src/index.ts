import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/config';
import { swaggerSpec } from './config/swagger';
import { 
  errorHandler, 
  requestLogger, 
  requestContext, 
  apiRateLimiter,
  validateContentType,
  validateRequestSize 
} from './common/middleware';
import { 
  securityHeaders,
  rateLimiter,
  speedLimiter,
  enforceHTTPS,
  additionalSecurityHeaders,
  securityLogger,
  ipBlacklist,
  csrfProtection
} from './common/middleware/security.middleware';
import { sanitizeInput, limitRequestSize } from './common/middleware/validation.middleware';
import { 
  errorHandler as newErrorHandler,
  notFoundHandler,
  handleUncaughtException,
  handleUnhandledRejection,
  handleGracefulShutdown
} from './common/middleware/error.middleware';
import { mainLogger } from './common/logger';
import prisma from './common/database';

const app = express();

// Настройка обработчиков процесса
handleUncaughtException();
handleUnhandledRejection();
handleGracefulShutdown();

// Middleware безопасности (в правильном порядке)
app.use(enforceHTTPS); // Принуждение HTTPS в продакшене
app.use(securityHeaders); // Заголовки безопасности
app.use(additionalSecurityHeaders); // Дополнительные заголовки
app.use(securityLogger); // Логирование подозрительной активности
app.use(ipBlacklist); // Проверка заблокированных IP
app.use(rateLimiter); // Ограничение частоты запросов
app.use(speedLimiter); // Замедление подозрительных запросов

// Базовые middleware
app.use(cors(config.server.cors));
app.use(limitRequestSize(1024 * 1024)); // 1MB лимит
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Санитизация входных данных
app.use(sanitizeInput);

// CSRF защита
app.use(csrfProtection);

// Добавляем контекст запроса и логирование
app.use(requestContext);
app.use(requestLogger);

// Валидация запросов
app.use(validateContentType);
app.use(validateRequestSize());

// Swagger документация
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'OK-Telecom Billing API',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}));

// JSON схема для API
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Базовые маршруты
app.get('/', (req, res) => {
  res.json({ 
    message: 'OK-Telecom Billing API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    documentation: '/api-docs'
  });
});

// Базовый health check (простой)
app.get('/health', async (req, res) => {
  try {
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

// API маршруты
import { authRoutes } from './modules/auth';
import { tariffRoutes } from './modules/tariffs';
import { clientsRoutes } from './modules/clients';
import { requestRoutes } from './modules/requests';
import { DeviceService, DeviceController, createDeviceRoutes, MikroTikKafkaConsumer } from './modules/devices';
import { createPaymentRoutes } from './modules/payments';
import { createBillingRoutes, BillingService } from './modules/billing';
import { createNotificationRoutes } from './modules/notifications';
import { dashboardRoutes } from './modules/dashboard';
import { telegramRoutes } from './modules/telegram';
import { createMonitoringRoutes } from './modules/monitoring';
import { auditRoutes } from './modules/audit/audit.routes';
import KafkaService from './kafka';

// Инициализация сервисов
const kafkaService = new KafkaService();
const deviceService = new DeviceService(prisma, kafkaService);
const deviceController = new DeviceController(deviceService);
const deviceRoutes = createDeviceRoutes(deviceController);
const paymentRoutes = createPaymentRoutes(prisma);
const billingRoutes = createBillingRoutes(prisma);
const notificationRoutes = createNotificationRoutes(prisma);
const monitoringRoutes = createMonitoringRoutes(prisma);

// Инициализация Kafka consumer для MikroTik
const mikrotikConsumer = new MikroTikKafkaConsumer(prisma, kafkaService);

// Получаем доступ к мониторингу команд
let commandMonitor: any = null;

// Инициализация биллингового сервиса
const billingService = new BillingService(prisma);

// Инициализация Telegram бота
const { TelegramBotService } = require('./modules/telegram');
const telegramBotService = new TelegramBotService();

// Запуск Kafka сервисов и биллинга
async function initializeServices() {
  try {
    // Инициализация Kafka
    const isKafkaAvailable = await kafkaService.testConnection();
    if (isKafkaAvailable) {
      await kafkaService.connectProducer();
      await mikrotikConsumer.start();
      
      // Получаем доступ к мониторингу команд
      commandMonitor = mikrotikConsumer.getCommandMonitor();
      
      mainLogger.info('Kafka сервисы инициализированы');
    } else {
      mainLogger.warn('Kafka недоступен, работаем без Kafka');
    }

    // Запуск планировщика биллинга
    billingService.startScheduler();
    mainLogger.info('Планировщик биллинга запущен');

    // Запуск периодической очистки сессий Telegram бота
    setInterval(() => {
      telegramBotService.cleanupOldSessions();
    }, 60 * 60 * 1000); // Каждый час
    mainLogger.info('Планировщик очистки сессий Telegram бота запущен');

  } catch (error) {
    mainLogger.error('Ошибка инициализации сервисов', error as Error);
  }
}

// Инициализируем сервисы асинхронно
initializeServices();

app.use('/api/auth', authRoutes);
app.use('/api/tariffs', tariffRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/audit', auditRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(newErrorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  mainLogger.info('Получен сигнал SIGTERM, завершаем работу...');
  billingService.stopScheduler();
  await mikrotikConsumer.stop();
  await kafkaService.disconnect();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  mainLogger.info('Получен сигнал SIGINT, завершаем работу...');
  billingService.stopScheduler();
  await mikrotikConsumer.stop();
  await kafkaService.disconnect();
  await prisma.$disconnect();
  process.exit(0);
});

// Запуск сервера
const server = app.listen(config.server.port, config.server.host, () => {
  mainLogger.info(`OK-Telecom Billing API Server запущен на ${config.server.host}:${config.server.port}`);
  mainLogger.info(`Health check: http://${config.server.host}:${config.server.port}/health`);
  mainLogger.info(`Monitoring: http://${config.server.host}:${config.server.port}/api/monitoring/health`);
  mainLogger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default server;