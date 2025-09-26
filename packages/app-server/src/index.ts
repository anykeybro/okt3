import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Загрузка переменных окружения
dotenv.config();

const app = express();
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
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

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Базовый маршрут
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Сервер работает' });
});

// Пример маршрута для работы с пользователями
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка получения пользователей' });
  }
});

// Запуск сервера
async function startServer() {
  await connectToDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer().catch((error) => {
  console.error('❌ Ошибка запуска сервера:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});