// Общие middleware
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { ValidationError, NotFoundError, ExternalServiceError, InsufficientFundsError, UnauthorizedError, ForbiddenError } from './errors';
import { mainLogger, Logger } from './logger';
import { metricsCollector } from './metrics';
import { config } from '../config/config';

// Расширяем Request для добавления logger и requestId
declare global {
  namespace Express {
    interface Request {
      logger: Logger;
      requestId: string;
      startTime: number;
    }
  }
}

// Генерация уникального ID запроса
const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Middleware для добавления requestId и logger
export const requestContext = (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = generateRequestId();
  req.startTime = Date.now();
  
  // Создаем логгер с контекстом запроса
  req.logger = mainLogger.child({
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Добавляем requestId в заголовки ответа
  res.setHeader('X-Request-ID', req.requestId);
  
  next();
};

// Middleware для централизованной обработки ошибок
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const logger = req.logger || mainLogger;
  
  // Регистрируем ошибку в метриках
  metricsCollector.recordError();

  // Логируем ошибку с контекстом
  logger.error('Request error', error, {
    statusCode: res.statusCode,
    duration: Date.now() - (req.startTime || 0),
  });

  if (error instanceof ValidationError) {
    res.status(400).json({
      error: 'Ошибка валидации',
      message: error.message,
      errors: error.errors,
      requestId: req.requestId,
    });
    return;
  }

  if (error instanceof NotFoundError) {
    res.status(404).json({
      error: 'Не найдено',
      message: error.message,
      requestId: req.requestId,
    });
    return;
  }

  if (error instanceof UnauthorizedError) {
    res.status(401).json({
      error: 'Неавторизованный доступ',
      message: error.message,
      requestId: req.requestId,
    });
    return;
  }

  if (error instanceof ForbiddenError) {
    res.status(403).json({
      error: 'Недостаточно прав',
      message: error.message,
      requestId: req.requestId,
    });
    return;
  }

  if (error instanceof ExternalServiceError) {
    res.status(502).json({
      error: 'Ошибка внешнего сервиса',
      message: error.message,
      requestId: req.requestId,
    });
    return;
  }

  if (error instanceof InsufficientFundsError) {
    res.status(400).json({
      error: 'Недостаточно средств',
      message: error.message,
      requestId: req.requestId,
    });
    return;
  }

  // Общая ошибка сервера
  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Что-то пошло не так',
    requestId: req.requestId,
  });
};

// Middleware для логирования запросов и метрик
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logger = req.logger || mainLogger;
    
    // Регистрируем запрос в метриках
    metricsCollector.recordRequest(duration);
    
    // Логируем запрос (базовое логирование для совместимости)
    logger.logRequest(req, res, duration);
  });
  
  next();
};

// Rate limiting middleware
export const createRateLimiter = (windowMs?: number, max?: number) => {
  return rateLimit({
    windowMs: windowMs || config.security.rateLimitWindow,
    max: max || config.security.rateLimitMax,
    message: {
      error: 'Слишком много запросов',
      message: 'Превышен лимит запросов. Попробуйте позже.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      const logger = req.logger || mainLogger;
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      
      res.status(429).json({
        error: 'Слишком много запросов',
        message: 'Превышен лимит запросов. Попробуйте позже.',
        requestId: req.requestId,
      });
    },
  });
};

// Общий rate limiter для API
export const apiRateLimiter = createRateLimiter();

// Строгий rate limiter для аутентификации
export const authRateLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 попыток за 15 минут

// Rate limiter для платежей
export const paymentRateLimiter = createRateLimiter(60 * 1000, 10); // 10 запросов в минуту

// Middleware для аудита действий администраторов
export const auditLogger = (action: string, resource: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Логируем только успешные операции
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const logger = req.logger || mainLogger;
        const userId = (req as any).user?.id;
        
        if (userId) {
          logger.logAudit(action, userId, resource, req.params.id, {
            method: req.method,
            url: req.originalUrl,
            body: req.body,
            statusCode: res.statusCode,
          });
        }
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Middleware для валидации Content-Type
export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
      const logger = req.logger || mainLogger;
      logger.warn('Invalid content type', { contentType });
      
      res.status(400).json({
        error: 'Неверный Content-Type',
        message: 'Ожидается application/json',
        requestId: req.requestId,
      });
      return;
    }
  }
  
  next();
};

// Middleware для проверки размера запроса
export const validateRequestSize = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0', 10);
    
    if (contentLength > maxSize) {
      const logger = req.logger || mainLogger;
      logger.warn('Request too large', { contentLength, maxSize });
      
      res.status(413).json({
        error: 'Запрос слишком большой',
        message: `Максимальный размер запроса: ${maxSize} байт`,
        requestId: req.requestId,
      });
      return;
    }
    
    next();
  };
};

// Экспортируем HTTP логгер
export { httpLogger } from './middleware/http-logger.middleware';