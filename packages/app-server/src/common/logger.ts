// Система логирования с Winston
import winston from 'winston';
import path from 'path';
import { config } from '../config/config';

// Определяем уровни логирования
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Цвета для консольного вывода
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Формат для консольного вывода
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Формат для файлового вывода
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Создаем транспорты
const transports = [
  // Консольный вывод
  new winston.transports.Console({
    format: consoleFormat,
  }),
  
  // Файл для всех логов
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: fileFormat,
  }),
  
  // Файл только для ошибок
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: fileFormat,
  }),
];

// Создаем основной логгер
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  transports,
  exitOnError: false,
});

// Интерфейс для структурированного логирования
export interface LogContext {
  userId?: string;
  accountId?: string;
  deviceId?: string;
  requestId?: string;
  module?: string;
  action?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  [key: string]: any;
}

// Класс для структурированного логирования
export class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  // Создание дочернего логгера с дополнительным контекстом
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  // Методы логирования
  error(message: string, error?: Error, additionalContext?: LogContext): void {
    const logData = {
      message,
      ...this.context,
      ...additionalContext,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      }),
    };
    logger.error(logData);
  }

  warn(message: string, additionalContext?: LogContext): void {
    logger.warn({
      message,
      ...this.context,
      ...additionalContext,
    });
  }

  info(message: string, additionalContext?: LogContext): void {
    logger.info({
      message,
      ...this.context,
      ...additionalContext,
    });
  }

  http(message: string, additionalContext?: LogContext): void {
    logger.http({
      message,
      ...this.context,
      ...additionalContext,
    });
  }

  debug(message: string, additionalContext?: LogContext): void {
    logger.debug({
      message,
      ...this.context,
      ...additionalContext,
    });
  }

  // Логирование API запросов
  logRequest(req: any, res: any, duration: number): void {
    this.http('API Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
    });
  }

  // Логирование бизнес-событий
  logBusinessEvent(event: string, data: any): void {
    this.info(`Business Event: ${event}`, {
      event,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // Логирование системных метрик
  logMetrics(metrics: Record<string, number>): void {
    this.info('System Metrics', {
      metrics,
      timestamp: new Date().toISOString(),
    });
  }

  // Логирование аудита действий администраторов
  logAudit(action: string, userId: string, resource: string, resourceId?: string, changes?: any): void {
    this.info('Audit Log', {
      action,
      userId,
      resource,
      resourceId,
      changes,
      timestamp: new Date().toISOString(),
    });
  }
}

// Экспортируем основной логгер
export const mainLogger = new Logger();

// Экспортируем Winston логгер для прямого использования
export { logger as winstonLogger };

export default mainLogger;