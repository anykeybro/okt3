// Подключение к базе данных
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['info', 'warn', 'error'] // Отключаем 'query' для уменьшения спама
    : ['warn', 'error'], // В продакшене только важные сообщения
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;