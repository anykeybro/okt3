// Общие утилиты
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

// Утилиты для работы с паролями
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, config.security.bcryptRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Утилиты для работы с JWT
export const generateToken = (payload: string | object): string => {
  return jwt.sign(payload, config.jwt.secret, { 
    expiresIn: config.jwt.expiresIn 
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: string | object): string => {
  return jwt.sign(payload, config.jwt.secret, { 
    expiresIn: config.jwt.refreshExpiresIn 
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, config.jwt.secret);
};

// Утилиты для валидации
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  // Российский номер телефона
  const phoneRegex = /^(\+7|7|8)?[\s\-]?\(?[489][0-9]{2}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const normalizePhone = (phone: string): string => {
  // Приводим номер к формату +7XXXXXXXXXX
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('8') && cleaned.length === 11) {
    return '+7' + cleaned.slice(1);
  }
  
  if (cleaned.startsWith('7') && cleaned.length === 11) {
    return '+' + cleaned;
  }
  
  if (cleaned.length === 10) {
    return '+7' + cleaned;
  }
  
  return phone;
};

// Утилиты для работы с датами
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
  }).format(amount);
};

// Утилиты для генерации ID
export const generateAccountNumber = (): string => {
  // Генерируем 8-значный номер лицевого счета
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

// Утилиты для работы с шаблонами
export const renderTemplate = (template: string, data: Record<string, any>): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
};

// Утилиты для пагинации
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  skip: number;
}

export const calculatePagination = (
  params: PaginationParams,
  total: number
): PaginationResult => {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const totalPages = Math.ceil(total / limit);
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    total,
    totalPages,
    skip,
  };
};

// Утилиты для логирования
export const sanitizeForLog = (obj: any): any => {
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'key'];
  
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sanitized = { ...obj };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

// Утилиты для работы с IP адресами
export const isValidIP = (ip: string): boolean => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
};

// Утилиты для работы с MAC адресами
export const isValidMAC = (mac: string): boolean => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

export const normalizeMAC = (mac: string): string => {
  return mac.replace(/[:-]/g, '').toLowerCase();
};