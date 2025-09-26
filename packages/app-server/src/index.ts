import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import KafkaService from './kafka';

// Загрузка переменных окружения
dotenv.config();

const app = express();
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
const kafkaService = new KafkaService();
const PORT = process.env.PORT || 3001;

// Функция для проверки подключения к MongoDB
async function connectToDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Подключение к MongoDB реплике успешно установлено');
    console.log(`📊 База данных: ${process.env.MONGODB_DATABASE}`);
    console.log(`🔗 Реплика сет: ${process.env.MONGODB_REPLICA_SET_NAME}`);

    // Проверяем подключение к базе данных
    await prisma.$runCommandRaw({
      ping: 1
    });
    console.log('🔄 Подключение к MongoDB успешно!');
  } catch (error) {
    console.error('❌ Ошибка подключения к MongoDB:', error);
    process.exit(1);
  }
}

// Функция для подключения к Kafka
async function connectToKafka() {
  try {
    console.log('🔄 Ожидание готовности Kafka...');
    
    // Ждем 5 секунд для полной инициализации Kafka
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Тестируем подключение к Kafka с повторными попытками
    let isConnected = false;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (!isConnected && attempts < maxAttempts) {
      attempts++;
      console.log(`🔄 Попытка подключения к Kafka ${attempts}/${maxAttempts}...`);
      
      isConnected = await kafkaService.testConnection();
      
      if (!isConnected && attempts < maxAttempts) {
        console.log('⏳ Ожидание 3 секунды перед следующей попыткой...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    if (!isConnected) {
      throw new Error('Не удалось подключиться к Kafka после нескольких попыток');
    }

    // Подключаем Producer
    await kafkaService.connectProducer();

    // Подключаем Consumer
    await kafkaService.connectConsumer();

    // Подписываемся на тестовый топик
    await kafkaService.subscribeToTopic('app-events', (message) => {
      console.log('🎯 Обработка события из Kafka:', message);
    });

    console.log('🚀 Подключение к Kafka успешно завершено!');
    console.log(`🔗 Брокеры: ${process.env.KAFKA_BROKERS}`);
    console.log(`🆔 Client ID: ${process.env.KAFKA_CLIENT_ID}`);
    console.log(`👥 Group ID: ${process.env.KAFKA_GROUP_ID}`);

  } catch (error) {
    console.error('❌ Ошибка подключения к Kafka:', error);
    // Не завершаем процесс, так как Kafka может быть недоступен временно
    console.log('⚠️ Сервер продолжит работу без Kafka');
  }
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Базовый маршрут
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', message: 'Сервер работает' });
});

// Пример маршрута для работы с пользователями
app.get('/api/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка получения пользователей' });
  }
});

// Маршрут для отправки тестового сообщения в Kafka
app.post('/api/kafka/send', async (req, res) => {
  try {
    const { topic = 'app-events', message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Сообщение обязательно' });
    }

    await kafkaService.sendMessage(topic, {
      ...message,
      timestamp: new Date().toISOString(),
      source: 'app-server'
    });

    res.json({
      success: true,
      message: 'Сообщение отправлено в Kafka',
      topic
    });
  } catch (error) {
    console.error('Ошибка отправки в Kafka:', error);
    res.status(500).json({ error: 'Ошибка отправки сообщения в Kafka' });
  }
});

// Маршрут для получения информации о Kafka
app.get('/api/kafka/status', async (_req, res) => {
  try {
    const isConnected = await kafkaService.testConnection();
    res.json({
      connected: isConnected,
      brokers: process.env.KAFKA_BROKERS,
      clientId: process.env.KAFKA_CLIENT_ID,
      groupId: process.env.KAFKA_GROUP_ID
    });
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: 'Ошибка проверки статуса Kafka'
    });
  }
});

// Запуск сервера
async function startServer() {
  await connectToDatabase();
  await connectToKafka();

  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📤 Kafka send: http://localhost:${PORT}/api/kafka/send`);
    console.log(`📊 Kafka status: http://localhost:${PORT}/api/kafka/status`);
  });
}

startServer().catch((error) => {
  console.error('❌ Ошибка запуска сервера:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Получен сигнал завершения, закрываем соединения...');
  await kafkaService.disconnect();
  await prisma.$disconnect();
  console.log('✅ Все соединения закрыты');
  process.exit(0);
});