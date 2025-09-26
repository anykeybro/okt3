// Кастомные классы ошибок
export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} с ID ${id} не найден`);
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