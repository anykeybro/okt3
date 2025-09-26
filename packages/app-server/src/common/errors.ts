// Кастомные классы ошибок
export class ValidationError extends Error {
  public errors: string[];
  
  constructor(message: string, errors?: string[] | string) {
    super(message);
    this.name = 'ValidationError';
    
    if (Array.isArray(errors)) {
      this.errors = errors;
    } else if (typeof errors === 'string') {
      this.errors = [errors];
    } else {
      this.errors = [];
    }
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ExternalServiceError extends Error {
  constructor(service: string, message: string) {
    super(`Ошибка внешнего сервиса ${service}: ${message}`);
    this.name = 'ExternalServiceError';
  }
}

export class InsufficientFundsError extends Error {
  constructor(accountId: string, balance: number, required: number) {
    super(`Недостаточно средств на счете ${accountId}. Баланс: ${balance}, требуется: ${required}`);
    this.name = 'InsufficientFundsError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Неавторизованный доступ') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Недостаточно прав доступа') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}