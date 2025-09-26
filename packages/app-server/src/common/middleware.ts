// Общие middleware
import { Request, Response, NextFunction } from 'express';
import { ValidationError, NotFoundError, ExternalServiceError, InsufficientFundsError, UnauthorizedError, ForbiddenError } from './errors';

// Middleware для обработки ошибок
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: 'Ошибка валидации',
      message: error.message,
      field: error.field,
    });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({
      error: 'Не найдено',
      message: error.message,
    });
  }

  if (error instanceof UnauthorizedError) {
    return res.status(401).json({
      error: 'Неавторизованный доступ',
      message: error.message,
    });
  }

  if (error instanceof ForbiddenError) {
    return res.status(403).json({
      error: 'Недостаточно прав',
      message: error.message,
    });
  }

  if (error instanceof ExternalServiceError) {
    return res.status(502).json({
      error: 'Ошибка внешнего сервиса',
      message: error.message,
    });
  }

  if (error instanceof InsufficientFundsError) {
    return res.status(400).json({
      error: 'Недостаточно средств',
      message: error.message,
    });
  }

  // Общая ошибка сервера
  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Что-то пошло не так',
  });
};

// Middleware для логирования запросов
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};