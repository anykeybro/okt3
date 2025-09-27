/**
 * Кастомный класс ошибок приложения
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    
    // Сохраняем правильный stack trace
    Error.captureStackTrace(this, this.constructor);
    
    // Устанавливаем имя ошибки
    this.name = this.constructor.name;
  }
}

/**
 * Ошибка валидации
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
  }
}

/**
 * Ошибка аутентификации
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Требуется аутентификация') {
    super(message, 401);
  }
}

/**
 * Ошибка авторизации
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Недостаточно прав доступа') {
    super(message, 403);
  }
}

/**
 * Ошибка "не найдено"
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} с ID ${id} не найден`
      : `${resource} не найден`;
    super(message, 404);
  }
}

/**
 * Ошибка конфликта
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, details);
  }
}

/**
 * Ошибка внешнего сервиса
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, originalError?: Error) {
    super(`Ошибка внешнего сервиса ${service}: ${message}`, 502, {
      service,
      originalError: originalError?.message,
    });
  }
}

/**
 * Ошибка недостатка средств
 */
export class InsufficientFundsError extends AppError {
  constructor(accountId: string, balance: number, required: number) {
    super(
      `Недостаточно средств на счете ${accountId}. Баланс: ${balance}, требуется: ${required}`,
      400,
      { accountId, balance, required }
    );
  }
}

/**
 * Ошибка превышения лимита
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Превышен лимит запросов') {
    super(message, 429);
  }
}

/**
 * Проверка, является ли ошибка операционной
 */
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};