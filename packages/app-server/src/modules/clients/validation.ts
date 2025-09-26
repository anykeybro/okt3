// Валидация для модуля управления абонентами
import { AccountStatus } from '@prisma/client';
import { ValidationError } from '../../common/errors';
import { Coordinates } from '../../common/types';

// Валидация телефонного номера
export const validatePhoneNumber = (phone: string): boolean => {
  // Российский номер: +7XXXXXXXXXX или 8XXXXXXXXXX
  const phoneRegex = /^(\+7|8|7)?[0-9]{10}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return phoneRegex.test(cleanPhone);
};

// Нормализация телефонного номера
export const normalizePhoneNumber = (phone: string): string => {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  if (cleanPhone.startsWith('+7')) {
    return cleanPhone;
  } else if (cleanPhone.startsWith('8') && cleanPhone.length === 11) {
    return '+7' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('7') && cleanPhone.length === 11) {
    return '+' + cleanPhone;
  } else if (cleanPhone.length === 10) {
    return '+7' + cleanPhone;
  }
  
  return cleanPhone;
};

// Валидация email
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Валидация координат
export const validateCoordinates = (coordinates: Coordinates): boolean => {
  return (
    typeof coordinates.latitude === 'number' &&
    typeof coordinates.longitude === 'number' &&
    coordinates.latitude >= -90 &&
    coordinates.latitude <= 90 &&
    coordinates.longitude >= -180 &&
    coordinates.longitude <= 180
  );
};

// Валидация MAC-адреса
export const validateMacAddress = (macAddress: string): boolean => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(macAddress);
};

// Нормализация MAC-адреса
export const normalizeMacAddress = (macAddress: string): string => {
  return macAddress.toUpperCase().replace(/[-:]/g, ':');
};

// Валидация абонента
export const validateClient = (data: any) => {
  const errors: string[] = [];

  // Проверка имени
  if (!data.firstName || typeof data.firstName !== 'string') {
    errors.push('Имя обязательно и должно быть строкой');
  } else if (data.firstName.trim().length < 2) {
    errors.push('Имя должно содержать минимум 2 символа');
  } else if (data.firstName.trim().length > 50) {
    errors.push('Имя не должно превышать 50 символов');
  } else if (!/^[а-яёА-ЯЁa-zA-Z\s\-]+$/.test(data.firstName.trim())) {
    errors.push('Имя может содержать только буквы, пробелы и дефисы');
  }

  // Проверка фамилии
  if (!data.lastName || typeof data.lastName !== 'string') {
    errors.push('Фамилия обязательна и должна быть строкой');
  } else if (data.lastName.trim().length < 2) {
    errors.push('Фамилия должна содержать минимум 2 символа');
  } else if (data.lastName.trim().length > 50) {
    errors.push('Фамилия не должна превышать 50 символов');
  } else if (!/^[а-яёА-ЯЁa-zA-Z\s\-]+$/.test(data.lastName.trim())) {
    errors.push('Фамилия может содержать только буквы, пробелы и дефисы');
  }

  // Проверка отчества
  if (data.middleName !== undefined && data.middleName !== null) {
    if (typeof data.middleName !== 'string') {
      errors.push('Отчество должно быть строкой');
    } else if (data.middleName.trim().length > 0) {
      if (data.middleName.trim().length < 2) {
        errors.push('Отчество должно содержать минимум 2 символа');
      } else if (data.middleName.trim().length > 50) {
        errors.push('Отчество не должно превышать 50 символов');
      } else if (!/^[а-яёА-ЯЁa-zA-Z\s\-]+$/.test(data.middleName.trim())) {
        errors.push('Отчество может содержать только буквы, пробелы и дефисы');
      }
    }
  }

  // Проверка телефонов
  if (!Array.isArray(data.phones)) {
    errors.push('Телефоны должны быть массивом');
  } else if (data.phones.length === 0) {
    errors.push('Необходимо указать хотя бы один номер телефона');
  } else if (data.phones.length > 5) {
    errors.push('Можно указать не более 5 номеров телефона');
  } else {
    const invalidPhones = data.phones.filter((phone: any) => {
      return typeof phone !== 'string' || !validatePhoneNumber(phone);
    });
    if (invalidPhones.length > 0) {
      errors.push('Все номера телефонов должны быть в корректном формате');
    }

    // Проверка на дубликаты
    const normalizedPhones = data.phones.map((phone: string) => normalizePhoneNumber(phone));
    const uniquePhones = [...new Set(normalizedPhones)];
    if (uniquePhones.length !== normalizedPhones.length) {
      errors.push('Номера телефонов не должны повторяться');
    }
  }

  // Проверка email
  if (data.email !== undefined && data.email !== null) {
    if (typeof data.email !== 'string') {
      errors.push('Email должен быть строкой');
    } else if (data.email.trim().length > 0 && !validateEmail(data.email.trim())) {
      errors.push('Email должен быть в корректном формате');
    } else if (data.email.length > 100) {
      errors.push('Email не должен превышать 100 символов');
    }
  }

  // Проверка Telegram ID
  if (data.telegramId !== undefined && data.telegramId !== null) {
    if (typeof data.telegramId !== 'string') {
      errors.push('Telegram ID должен быть строкой');
    } else if (data.telegramId.trim().length > 0) {
      if (!/^@?[a-zA-Z0-9_]{5,32}$/.test(data.telegramId.trim())) {
        errors.push('Telegram ID должен содержать от 5 до 32 символов (буквы, цифры, подчеркивания)');
      }
    }
  }

  // Проверка адреса
  if (data.address !== undefined && data.address !== null) {
    if (typeof data.address !== 'string') {
      errors.push('Адрес должен быть строкой');
    } else if (data.address.length > 500) {
      errors.push('Адрес не должен превышать 500 символов');
    }
  }

  // Проверка координат
  if (data.coordinates !== undefined && data.coordinates !== null) {
    if (typeof data.coordinates !== 'object') {
      errors.push('Координаты должны быть объектом');
    } else if (!validateCoordinates(data.coordinates)) {
      errors.push('Координаты должны содержать корректные значения широты и долготы');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Ошибка валидации абонента', errors);
  }
};

// Валидация лицевого счета
export const validateAccount = (data: any) => {
  const errors: string[] = [];

  // Проверка ID клиента
  if (!data.clientId || typeof data.clientId !== 'string') {
    errors.push('ID клиента обязателен и должен быть строкой');
  } else {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(data.clientId)) {
      errors.push('ID клиента должен быть валидным ObjectId');
    }
  }

  // Проверка ID тарифа
  if (!data.tariffId || typeof data.tariffId !== 'string') {
    errors.push('ID тарифа обязателен и должен быть строкой');
  } else {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(data.tariffId)) {
      errors.push('ID тарифа должен быть валидным ObjectId');
    }
  }

  // Проверка MAC-адреса
  if (data.macAddress !== undefined && data.macAddress !== null) {
    if (typeof data.macAddress !== 'string') {
      errors.push('MAC-адрес должен быть строкой');
    } else if (data.macAddress.trim().length > 0 && !validateMacAddress(data.macAddress.trim())) {
      errors.push('MAC-адрес должен быть в корректном формате (XX:XX:XX:XX:XX:XX)');
    }
  }

  // Проверка pool name
  if (data.poolName !== undefined && data.poolName !== null) {
    if (typeof data.poolName !== 'string') {
      errors.push('Pool name должен быть строкой');
    } else if (data.poolName.length > 50) {
      errors.push('Pool name не должен превышать 50 символов');
    } else if (data.poolName.trim().length > 0 && !/^[a-zA-Z0-9_\-]+$/.test(data.poolName.trim())) {
      errors.push('Pool name может содержать только буквы, цифры, подчеркивания и дефисы');
    }
  }

  // Проверка порога блокировки
  if (data.blockThreshold !== undefined && data.blockThreshold !== null) {
    if (typeof data.blockThreshold !== 'number') {
      errors.push('Порог блокировки должен быть числом');
    } else if (data.blockThreshold < 0) {
      errors.push('Порог блокировки не может быть отрицательным');
    } else if (data.blockThreshold > 10000) {
      errors.push('Порог блокировки не должен превышать 10000 рублей');
    }
  }

  // Проверка ID устройства
  if (data.deviceId !== undefined && data.deviceId !== null) {
    if (typeof data.deviceId !== 'string') {
      errors.push('ID устройства должен быть строкой');
    } else {
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(data.deviceId)) {
        errors.push('ID устройства должен быть валидным ObjectId');
      }
    }
  }

  // Проверка статуса
  if (data.status !== undefined && data.status !== null) {
    if (!Object.values(AccountStatus).includes(data.status)) {
      errors.push(`Статус должен быть одним из: ${Object.values(AccountStatus).join(', ')}`);
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Ошибка валидации лицевого счета', errors);
  }
};

// Валидация параметров пагинации
export const validatePagination = (page?: any, limit?: any) => {
  const errors: string[] = [];

  if (page !== undefined) {
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('Номер страницы должен быть положительным числом');
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('Лимит должен быть числом от 1 до 100');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Ошибка валидации параметров пагинации', errors);
  }
};

// Валидация ObjectId
export const validateObjectId = (id: string, fieldName: string = 'ID') => {
  if (!id || typeof id !== 'string') {
    throw new ValidationError(`${fieldName} должен быть строкой`);
  }
  
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(id)) {
    throw new ValidationError(`${fieldName} должен быть валидным ObjectId`);
  }
};

// Валидация фильтров поиска
export const validateClientFilters = (filters: any) => {
  const errors: string[] = [];

  if (filters.search !== undefined && typeof filters.search !== 'string') {
    errors.push('Поисковый запрос должен быть строкой');
  }

  if (filters.status !== undefined && !Object.values(AccountStatus).includes(filters.status)) {
    errors.push(`Статус должен быть одним из: ${Object.values(AccountStatus).join(', ')}`);
  }

  if (filters.tariffId !== undefined) {
    try {
      validateObjectId(filters.tariffId, 'ID тарифа');
    } catch (error) {
      errors.push('ID тарифа должен быть валидным ObjectId');
    }
  }

  if (filters.deviceId !== undefined) {
    try {
      validateObjectId(filters.deviceId, 'ID устройства');
    } catch (error) {
      errors.push('ID устройства должен быть валидным ObjectId');
    }
  }

  if (filters.balanceMin !== undefined) {
    const balance = parseFloat(filters.balanceMin);
    if (isNaN(balance)) {
      errors.push('Минимальный баланс должен быть числом');
    }
  }

  if (filters.balanceMax !== undefined) {
    const balance = parseFloat(filters.balanceMax);
    if (isNaN(balance)) {
      errors.push('Максимальный баланс должен быть числом');
    }
  }

  if (filters.createdFrom !== undefined) {
    const date = new Date(filters.createdFrom);
    if (isNaN(date.getTime())) {
      errors.push('Дата создания "от" должна быть валидной датой');
    }
  }

  if (filters.createdTo !== undefined) {
    const date = new Date(filters.createdTo);
    if (isNaN(date.getTime())) {
      errors.push('Дата создания "до" должна быть валидной датой');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Ошибка валидации фильтров', errors);
  }
};

// Бизнес-правила для абонентов
export const validateClientBusinessRules = (data: any, existingClient?: any) => {
  const errors: string[] = [];

  // Правило: основной телефон должен быть уникальным в системе
  // (это будет проверяться в сервисе при обращении к БД)

  // Правило: если указан Telegram ID, он должен быть уникальным
  // (это будет проверяться в сервисе при обращении к БД)

  // Правило: если указан email, он должен быть уникальным
  // (это будет проверяться в сервисе при обращении к БД)

  // Правило: координаты должны быть в пределах России (примерно)
  if (data.coordinates) {
    const { latitude, longitude } = data.coordinates;
    if (latitude < 41 || latitude > 82 || longitude < 19 || longitude > 180) {
      errors.push('Координаты должны находиться в пределах территории России');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Нарушение бизнес-правил абонента', errors);
  }
};

// Бизнес-правила для лицевых счетов
export const validateAccountBusinessRules = (data: any) => {
  const errors: string[] = [];

  // Правило: MAC-адрес должен быть уникальным в системе
  // (это будет проверяться в сервисе при обращении к БД)

  // Правило: у одного клиента не может быть более 10 лицевых счетов
  // (это будет проверяться в сервисе при обращении к БД)

  // Правило: порог блокировки должен быть разумным для типа тарифа
  // (это будет проверяться в сервисе с учетом данных тарифа)

  if (errors.length > 0) {
    throw new ValidationError('Нарушение бизнес-правил лицевого счета', errors);
  }
};