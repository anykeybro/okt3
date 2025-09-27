/**
 * Детальное логирование HTTP запросов
 */
import { Request, Response, NextFunction } from 'express';
import { mainLogger, Logger } from '../logger';
import { config } from '../../config/config';

// Интерфейс для данных HTTP запроса
interface HttpRequestData {
  method: string;
  url: string;
  originalUrl: string;
  path: string;
  query: any;
  params: any;
  headers?: any;
  body?: any;
  ip: string;
  userAgent?: string;
  userId?: string;
  requestId: string;
  timestamp: string;
}

// Интерфейс для данных HTTP ответа
interface HttpResponseData {
  statusCode: number;
  statusMessage: string;
  headers?: any;
  body?: any;
  duration: number;
  size?: number;
}

// Функция для очистки чувствительных данных
const sanitizeSensitiveData = (obj: any, sensitiveFields: string[]): any => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const key in sanitized) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[СКРЫТО]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeSensitiveData(sanitized[key], sensitiveFields);
    }
  }
  
  return sanitized;
};

// Функция для обрезки больших объектов
const truncateData = (data: any, maxSize: number): any => {
  const str = JSON.stringify(data);
  if (str.length <= maxSize) {
    return data;
  }
  
  return {
    ...data,
    _truncated: true,
    _originalSize: str.length,
    _maxSize: maxSize,
  };
};

// Функция для проверки, нужно ли исключить путь из логирования
const shouldExcludePath = (path: string, excludePaths: string[]): boolean => {
  return excludePaths.some(excludePath => 
    path.startsWith(excludePath.trim())
  );
};

// Middleware для детального логирования HTTP запросов
export const detailedHttpLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const logger = req.logger || mainLogger;
  const httpConfig = config.logging.http;

  // Проверяем, нужно ли логировать этот запрос
  if (!httpConfig.logRequests || shouldExcludePath(req.path, httpConfig.excludePaths)) {
    return next();
  }

  // Собираем данные запроса
  const requestData: HttpRequestData = {
    method: req.method,
    url: req.url,
    originalUrl: req.originalUrl,
    path: req.path,
    query: req.query,
    params: req.params,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  };

  // Добавляем заголовки если включено
  if (httpConfig.logHeaders) {
    requestData.headers = sanitizeSensitiveData(req.headers, httpConfig.sensitiveFields);
  }

  // Добавляем тело запроса если включено
  if (httpConfig.logRequestBody && req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = sanitizeSensitiveData(req.body, httpConfig.sensitiveFields);
    requestData.body = truncateData(sanitizedBody, httpConfig.maxBodySize);
  }

  // Логируем входящий запрос
  logger.http('HTTP Request Started', {
    type: 'request',
    request: requestData,
  });

  // Перехватываем оригинальные методы для логирования ответа
  const originalSend = res.send;
  const originalJson = res.json;
  let responseBody: any = null;

  // Перехватываем res.send
  res.send = function(body: any) {
    if (httpConfig.logResponseBody) {
      responseBody = body;
    }
    return originalSend.call(this, body);
  };

  // Перехватываем res.json
  res.json = function(body: any) {
    if (httpConfig.logResponseBody) {
      responseBody = body;
    }
    return originalJson.call(this, body);
  };

  // Логируем завершение запроса
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Собираем данные ответа
    const responseData: HttpResponseData = {
      statusCode: res.statusCode,
      statusMessage: res.statusMessage || '',
      duration,
    };

    // Добавляем заголовки ответа если включено
    if (httpConfig.logHeaders) {
      responseData.headers = res.getHeaders();
    }

    // Добавляем тело ответа если включено
    if (httpConfig.logResponseBody && responseBody) {
      try {
        const parsedBody = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
        const sanitizedBody = sanitizeSensitiveData(parsedBody, httpConfig.sensitiveFields);
        responseData.body = truncateData(sanitizedBody, httpConfig.maxBodySize);
      } catch (error) {
        // Если не удается распарсить, сохраняем как есть (обрезанным)
        responseData.body = responseBody.toString().substring(0, httpConfig.maxBodySize);
      }
    }

    // Определяем уровень логирования в зависимости от статуса
    const logLevel = res.statusCode >= 400 ? 'warn' : 'http';
    const message = res.statusCode >= 400 ? 'HTTP Request Failed' : 'HTTP Request Completed';

    // Логируем завершение запроса
    logger[logLevel](message, {
      type: 'response',
      request: {
        method: req.method,
        url: req.originalUrl,
        requestId: req.requestId,
      },
      response: responseData,
    });

    // Дополнительное предупреждение для медленных запросов
    if (duration > 1000) {
      logger.warn('Slow HTTP Request', {
        type: 'performance',
        method: req.method,
        url: req.originalUrl,
        duration,
        requestId: req.requestId,
        statusCode: res.statusCode,
      });
    }

    // Дополнительное предупреждение для больших ответов
    const contentLength = res.get('Content-Length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) { // > 1MB
      logger.warn('Large HTTP Response', {
        type: 'performance',
        method: req.method,
        url: req.originalUrl,
        size: contentLength,
        requestId: req.requestId,
        statusCode: res.statusCode,
      });
    }
  });

  next();
};

// Middleware для логирования только основной информации о запросах (облегченная версия)
export const basicHttpLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const logger = req.logger || mainLogger;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.http('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
      requestId: req.requestId,
    });
  });

  next();
};

// Экспортируем middleware в зависимости от конфигурации
export const httpLogger = config.logging.http.logRequestBody || config.logging.http.logResponseBody || config.logging.http.logHeaders
  ? detailedHttpLogger
  : basicHttpLogger;

export default httpLogger;