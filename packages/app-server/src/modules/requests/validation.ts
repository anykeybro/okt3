// Валидация для модуля системы заявок (CRM)
import { RequestStatus } from '@prisma/client';
import { ValidationError } from '../../common/errors';

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

// Валидация заявки
export const validateRequest = (data: any) => {
  const errors: string[] = [];

  // Проверка адреса
  if (!data.address || typeof data.address !== 'string') {
    errors.push('Адрес обязателен и должен быть строкой');
  } else if (data.address.trim().length < 10) {
    errors.push('Адрес должен содержать минимум 10 символов');
  } else if (data.address.trim().length > 500) {
    errors.push('Адрес не должен превышать 500 символов');
  }

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

  // Проверка телефона
  if (!data.phone || typeof data.phone !== 'string') {
    errors.push('Телефон обязателен и должен быть строкой');
  } else if (!validatePhoneNumber(data.phone)) {
    errors.push('Телефон должен быть в корректном формате');
  }

  // Проверка желаемых услуг
  if (!Array.isArray(data.desiredServices)) {
    errors.push('Желаемые услуги должны быть массивом');
  } else if (data.desiredServices.length === 0) {
    errors.push('Необходимо указать хотя бы одну желаемую услугу');
  } else if (data.desiredServices.length > 10) {
    errors.push('Можно указать не более 10 желаемых услуг');
  } else {
    const invalidServices = data.desiredServices.filter((service: any) => {
      return typeof service !== 'string' || service.trim().length === 0;
    });
    if (invalidServices.length > 0) {
      errors.push('Все желаемые услуги должны быть непустыми строками');
    }

    const tooLongServices = data.desiredServices.filter((service: string) => {
      return service.trim().length > 100;
    });
    if (tooLongServices.length > 0) {
      errors.push('Название услуги не должно превышать 100 символов');
    }
  }

  // Проверка заметок
  if (data.notes !== undefined && data.notes !== null) {
    if (typeof data.notes !== 'string') {
      errors.push('Заметки должны быть строкой');
    } else if (data.notes.length > 1000) {
      errors.push('Заметки не должны превышать 1000 символов');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Ошибка валидации заявки', errors);
  }
};

// Валидация обновления заявки
export const validateRequestUpdate = (data: any) => {
  const errors: string[] = [];

  // Проверка адреса
  if (data.address !== undefined) {
    if (typeof data.address !== 'string') {
      errors.push('Адрес должен быть строкой');
    } else if (data.address.trim().length < 10) {
      errors.push('Адрес должен содержать минимум 10 символов');
    } else if (data.address.trim().length > 500) {
      errors.push('Адрес не должен превышать 500 символов');
    }
  }

  // Проверка имени
  if (data.firstName !== undefined) {
    if (typeof data.firstName !== 'string') {
      errors.push('Имя должно быть строкой');
    } else if (data.firstName.trim().length < 2) {
      errors.push('Имя должно содержать минимум 2 символа');
    } else if (data.firstName.trim().length > 50) {
      errors.push('Имя не должно превышать 50 символов');
    } else if (!/^[а-яёА-ЯЁa-zA-Z\s\-]+$/.test(data.firstName.trim())) {
      errors.push('Имя может содержать только буквы, пробелы и дефисы');
    }
  }

  // Проверка фамилии
  if (data.lastName !== undefined) {
    if (typeof data.lastName !== 'string') {
      errors.push('Фамилия должна быть строкой');
    } else if (data.lastName.trim().length < 2) {
      errors.push('Фамилия должна содержать минимум 2 символа');
    } else if (data.lastName.trim().length > 50) {
      errors.push('Фамилия не должна превышать 50 символов');
    } else if (!/^[а-яёА-ЯЁa-zA-Z\s\-]+$/.test(data.lastName.trim())) {
      errors.push('Фамилия может содержать только буквы, пробелы и дефисы');
    }
  }

  // Проверка телефона
  if (data.phone !== undefined) {
    if (typeof data.phone !== 'string') {
      errors.push('Телефон должен быть строкой');
    } else if (!validatePhoneNumber(data.phone)) {
      errors.push('Телефон должен быть в корректном формате');
    }
  }

  // Проверка желаемых услуг
  if (data.desiredServices !== undefined) {
    if (!Array.isArray(data.desiredServices)) {
      errors.push('Желаемые услуги должны быть массивом');
    } else if (data.desiredServices.length === 0) {
      errors.push('Необходимо указать хотя бы одну желаемую услугу');
    } else if (data.desiredServices.length > 10) {
      errors.push('Можно указать не более 10 желаемых услуг');
    } else {
      const invalidServices = data.desiredServices.filter((service: any) => {
        return typeof service !== 'string' || service.trim().length === 0;
      });
      if (invalidServices.length > 0) {
        errors.push('Все желаемые услуги должны быть непустыми строками');
      }

      const tooLongServices = data.desiredServices.filter((service: string) => {
        return service.trim().length > 100;
      });
      if (tooLongServices.length > 0) {
        errors.push('Название услуги не должно превышать 100 символов');
      }
    }
  }

  // Проверка статуса
  if (data.status !== undefined) {
    if (!Object.values(RequestStatus).includes(data.status)) {
      errors.push(`Статус должен быть одним из: ${Object.values(RequestStatus).join(', ')}`);
    }
  }

  // Проверка ID назначенного сотрудника
  if (data.assignedToId !== undefined && data.assignedToId !== null) {
    if (typeof data.assignedToId !== 'string') {
      errors.push('ID назначенного сотрудника должен быть строкой');
    } else {
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(data.assignedToId)) {
        errors.push('ID назначенного сотрудника должен быть валидным ObjectId');
      }
    }
  }

  // Проверка заметок
  if (data.notes !== undefined && data.notes !== null) {
    if (typeof data.notes !== 'string') {
      errors.push('Заметки должны быть строкой');
    } else if (data.notes.length > 1000) {
      errors.push('Заметки не должны превышать 1000 символов');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Ошибка валидации обновления заявки', errors);
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

// Валидация фильтров поиска заявок
export const validateRequestFilters = (filters: any) => {
  const errors: string[] = [];

  if (filters.search !== undefined && typeof filters.search !== 'string') {
    errors.push('Поисковый запрос должен быть строкой');
  }

  if (filters.status !== undefined && !Object.values(RequestStatus).includes(filters.status)) {
    errors.push(`Статус должен быть одним из: ${Object.values(RequestStatus).join(', ')}`);
  }

  if (filters.assignedToId !== undefined && filters.assignedToId !== null) {
    try {
      validateObjectId(filters.assignedToId, 'ID назначенного сотрудника');
    } catch (error) {
      errors.push('ID назначенного сотрудника должен быть валидным ObjectId');
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

  if (filters.hasClient !== undefined && typeof filters.hasClient !== 'boolean') {
    errors.push('Фильтр "hasClient" должен быть булевым значением');
  }

  if (errors.length > 0) {
    throw new ValidationError('Ошибка валидации фильтров', errors);
  }
};

// Валидация данных для создания клиента из заявки
export const validateCreateClientFromRequest = (data: any) => {
  const errors: string[] = [];

  // Проверка ID заявки
  if (!data.requestId || typeof data.requestId !== 'string') {
    errors.push('ID заявки обязателен и должен быть строкой');
  } else {
    try {
      validateObjectId(data.requestId, 'ID заявки');
    } catch (error) {
      errors.push('ID заявки должен быть валидным ObjectId');
    }
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

  // Проверка email
  if (data.email !== undefined && data.email !== null) {
    if (typeof data.email !== 'string') {
      errors.push('Email должен быть строкой');
    } else if (data.email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email.trim())) {
        errors.push('Email должен быть в корректном формате');
      } else if (data.email.length > 100) {
        errors.push('Email не должен превышать 100 символов');
      }
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

  // Проверка координат
  if (data.coordinates !== undefined && data.coordinates !== null) {
    if (typeof data.coordinates !== 'object') {
      errors.push('Координаты должны быть объектом');
    } else {
      const { latitude, longitude } = data.coordinates;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        errors.push('Координаты должны содержать числовые значения широты и долготы');
      } else if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        errors.push('Координаты должны содержать корректные значения широты и долготы');
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Ошибка валидации данных для создания клиента', errors);
  }
};

// Бизнес-правила для заявок
export const validateRequestBusinessRules = (data: any, existingRequest?: any) => {
  const errors: string[] = [];

  // Правило: нельзя изменить статус с COMPLETED или CANCELLED на другой
  if (existingRequest && data.status !== undefined) {
    if (existingRequest.status === RequestStatus.COMPLETED && data.status !== RequestStatus.COMPLETED) {
      errors.push('Нельзя изменить статус выполненной заявки');
    }
    if (existingRequest.status === RequestStatus.CANCELLED && data.status !== RequestStatus.CANCELLED) {
      errors.push('Нельзя изменить статус отмененной заявки');
    }
  }

  // Правило: нельзя назначить заявку на неактивного сотрудника
  // (это будет проверяться в сервисе при обращении к БД)

  // Правило: телефон должен быть уникальным среди активных заявок
  // (это будет проверяться в сервисе при обращении к БД)

  if (errors.length > 0) {
    throw new ValidationError('Нарушение бизнес-правил заявки', errors);
  }
};

// Валидация перехода статуса
export const validateStatusTransition = (currentStatus: RequestStatus, newStatus: RequestStatus) => {
  const allowedTransitions: Record<RequestStatus, RequestStatus[]> = {
    [RequestStatus.NEW]: [RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED],
    [RequestStatus.IN_PROGRESS]: [RequestStatus.COMPLETED, RequestStatus.CANCELLED, RequestStatus.NEW],
    [RequestStatus.COMPLETED]: [], // Завершенные заявки нельзя изменять
    [RequestStatus.CANCELLED]: [], // Отмененные заявки нельзя изменять
  };

  if (!allowedTransitions[currentStatus].includes(newStatus)) {
    throw new ValidationError(
      `Недопустимый переход статуса с "${currentStatus}" на "${newStatus}"`
    );
  }
};