// Валидация для dashboard модуля
import { ValidationError } from '../../common/errors';
import { DashboardFilters } from './types';

export function validateDashboardFilters(filters: any): DashboardFilters {
  const errors: string[] = [];
  const validatedFilters: DashboardFilters = {};

  // Валидация dateFrom
  if (filters.dateFrom !== undefined) {
    if (typeof filters.dateFrom === 'string') {
      const dateFrom = new Date(filters.dateFrom);
      if (isNaN(dateFrom.getTime())) {
        errors.push('dateFrom должно быть валидной датой');
      } else {
        validatedFilters.dateFrom = dateFrom;
      }
    } else if (filters.dateFrom instanceof Date) {
      validatedFilters.dateFrom = filters.dateFrom;
    } else {
      errors.push('dateFrom должно быть строкой или объектом Date');
    }
  }

  // Валидация dateTo
  if (filters.dateTo !== undefined) {
    if (typeof filters.dateTo === 'string') {
      const dateTo = new Date(filters.dateTo);
      if (isNaN(dateTo.getTime())) {
        errors.push('dateTo должно быть валидной датой');
      } else {
        validatedFilters.dateTo = dateTo;
      }
    } else if (filters.dateTo instanceof Date) {
      validatedFilters.dateTo = filters.dateTo;
    } else {
      errors.push('dateTo должно быть строкой или объектом Date');
    }
  }

  // Валидация period
  if (filters.period !== undefined) {
    const validPeriods = ['today', 'week', 'month', 'year', 'custom'];
    if (!validPeriods.includes(filters.period)) {
      errors.push(`period должно быть одним из: ${validPeriods.join(', ')}`);
    } else {
      validatedFilters.period = filters.period;
    }
  }

  // Проверка логики дат
  if (validatedFilters.dateFrom && validatedFilters.dateTo) {
    if (validatedFilters.dateFrom > validatedFilters.dateTo) {
      errors.push('dateFrom не может быть больше dateTo');
    }

    // Проверка максимального диапазона (например, не больше года)
    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 год в миллисекундах
    if (validatedFilters.dateTo.getTime() - validatedFilters.dateFrom.getTime() > maxRange) {
      errors.push('Диапазон дат не может превышать 1 год');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Ошибки валидации фильтров dashboard', errors);
  }

  return validatedFilters;
}

export function validateLimit(limit: any, min: number = 1, max: number = 50): number {
  if (limit === undefined || limit === null) {
    return 10; // Значение по умолчанию
  }

  const numLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;

  if (isNaN(numLimit)) {
    throw new ValidationError('limit должно быть числом');
  }

  if (numLimit < min || numLimit > max) {
    throw new ValidationError(`limit должно быть от ${min} до ${max}`);
  }

  return numLimit;
}

export function validateChartType(type: any): 'payments' | 'clients' | 'requests' {
  const validTypes = ['payments', 'clients', 'requests'];
  
  if (!type || typeof type !== 'string') {
    throw new ValidationError('type обязателен и должен быть строкой');
  }

  if (!validTypes.includes(type)) {
    throw new ValidationError(`type должен быть одним из: ${validTypes.join(', ')}`);
  }

  return type as 'payments' | 'clients' | 'requests';
}

export function validateDateRange(dateFrom?: Date, dateTo?: Date): { dateFrom: Date; dateTo: Date } {
  const now = new Date();
  
  // Если даты не указаны, используем последние 30 дней
  if (!dateFrom && !dateTo) {
    return {
      dateFrom: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      dateTo: now
    };
  }

  // Если указана только одна дата
  if (dateFrom && !dateTo) {
    return {
      dateFrom,
      dateTo: now
    };
  }

  if (!dateFrom && dateTo) {
    return {
      dateFrom: new Date(dateTo.getTime() - 30 * 24 * 60 * 60 * 1000),
      dateTo
    };
  }

  // Обе даты указаны
  if (dateFrom! > dateTo!) {
    throw new ValidationError('dateFrom не может быть больше dateTo');
  }

  return { dateFrom: dateFrom!, dateTo: dateTo! };
}

export function sanitizeQueryParams(query: any): Record<string, any> {
  const sanitized: Record<string, any> = {};

  // Список разрешенных параметров
  const allowedParams = [
    'dateFrom', 'dateTo', 'period', 'limit', 'type'
  ];

  for (const param of allowedParams) {
    if (query[param] !== undefined) {
      sanitized[param] = query[param];
    }
  }

  return sanitized;
}

export function validateStatsRequest(query: any): {
  filters: DashboardFilters;
  limit?: number;
} {
  const sanitized = sanitizeQueryParams(query);
  
  const filters = validateDashboardFilters({
    dateFrom: sanitized.dateFrom,
    dateTo: sanitized.dateTo,
    period: sanitized.period
  });

  let limit: number | undefined;
  if (sanitized.limit !== undefined) {
    limit = validateLimit(sanitized.limit);
  }

  return { filters, limit };
}