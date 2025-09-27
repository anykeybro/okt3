import { Request, Response, NextFunction } from 'express';
import { AppError, isOperationalError } from '../errors/app-error';
import { config } from '../../config/config';

/**
 * Middleware для обработки ошибок
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Логируем ошибку
  console.error('Ошибка приложения:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  // Если ошибка уже обработана
  if (res.headersSent) {
    return next(error);
  }

  // Обработка кастомных ошибок приложения
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.statusCode,
        details: error.details,
      },
    });
  }

  // Обработка ошибок валидации Prisma
  if (error.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Ошибка валидации данных',
        code: 400,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    });
  }

  // Обработка ошибок уникальности Prisma
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    
    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Запись с такими данными уже существует',
          code: 409,
          details: {
            fields: prismaError.meta?.target,
          },
        },
      });
    }

    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Запись не найдена',
          code: 404,
        },
      });
    }
  }

  // Обработка ошибок JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Недействительный токен',
        code: 401,
      },
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Токен истек',
        code: 401,
      },
    });
  }

  // Обработка ошибок валидации express-validator
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Ошибка валидации',
        code: 400,
        details: (error as any).details,
      },
    });
  }

  // Обработка ошибок MongoDB
  if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    const mongoError = error as any;
    
    if (mongoError.code === 11000) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Дублирование уникального поля',
          code: 409,
          details: mongoError.keyPattern,
        },
      });
    }
  }

  // Обработка ошибок синтаксиса JSON
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Некорректный JSON',
        code: 400,
      },
    });
  }

  // Обработка ошибок превышения размера запроса
  if (error.message && error.message.includes('request entity too large')) {
    return res.status(413).json({
      success: false,
      error: {
        message: 'Размер запроса слишком большой',
        code: 413,
      },
    });
  }

  // Обработка неизвестных ошибок
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Внутренняя ошибка сервера'
    : error.message;

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: statusCode,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
  });
};

/**
 * Middleware для обработки 404 ошибок
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Маршрут ${req.method} ${req.path} не найден`,
      code: 404,
    },
  });
};

/**
 * Обработчик необработанных исключений
 */
export const handleUncaughtException = () => {
  process.on('uncaughtException', (error: Error) => {
    console.error('Необработанное исключение:', error);
    
    // Логируем критическую ошибку
    console.error('Критическая ошибка, завершение процесса...');
    
    // Graceful shutdown
    process.exit(1);
  });
};

/**
 * Обработчик необработанных отклонений промисов
 */
export const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Необработанное отклонение промиса:', reason);
    console.error('Промис:', promise);
    
    // Если это операционная ошибка, не завершаем процесс
    if (reason instanceof Error && isOperationalError(reason)) {
      console.warn('Операционная ошибка, продолжаем работу');
      return;
    }
    
    // Для неоперационных ошибок завершаем процесс
    console.error('Неоперационная ошибка, завершение процесса...');
    process.exit(1);
  });
};

/**
 * Graceful shutdown обработчик
 */
export const handleGracefulShutdown = () => {
  const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`Получен сигнал ${signal}, начинаем graceful shutdown...`);
      
      try {
        // Здесь можно добавить логику для корректного завершения:
        // - Закрытие соединений с БД
        // - Завершение активных запросов
        // - Очистка ресурсов
        
        console.log('Graceful shutdown завершен');
        process.exit(0);
      } catch (error) {
        console.error('Ошибка при graceful shutdown:', error);
        process.exit(1);
      }
    });
  });
};