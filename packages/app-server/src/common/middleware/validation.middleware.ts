import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';
import { AppError } from '../errors/app-error';

/**
 * Middleware для обработки результатов валидации
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));

    throw new AppError('Ошибка валидации данных', 400, errorMessages);
  }

  next();
};

/**
 * Создает middleware для валидации с автоматической обработкой ошибок
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Выполняем все валидации
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Обрабатываем результаты
    handleValidationErrors(req, res, next);
  };
};

/**
 * Middleware для санитизации входных данных
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Санитизация body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Санитизация query параметров
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  // Санитизация params
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Рекурсивная санитизация объекта
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Санитизация строки
 */
function sanitizeString(str: string): string {
  if (typeof str !== 'string') {
    return str;
  }

  // Удаляем HTML теги и потенциально опасный контент
  let sanitized = DOMPurify.sanitize(str, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true 
  });

  // Удаляем SQL injection паттерны
  sanitized = sanitized.replace(/('|(\\')|(;)|(\\)|(\/\*)|(--)|(\*\/))/gi, '');

  // Удаляем потенциально опасные символы для NoSQL injection
  sanitized = sanitized.replace(/[\$\{\}]/g, '');

  return sanitized.trim();
}

/**
 * Middleware для ограничения размера запроса
 */
export const limitRequestSize = (maxSizeBytes: number = 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    
    if (contentLength > maxSizeBytes) {
      throw new AppError('Размер запроса превышает допустимый лимит', 413);
    }

    next();
  };
};

/**
 * Middleware для проверки Content-Type
 */
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }

    const contentType = req.get('content-type');
    
    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      throw new AppError('Неподдерживаемый Content-Type', 415);
    }

    next();
  };
};