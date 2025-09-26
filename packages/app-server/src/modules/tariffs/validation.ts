// Валидация для модуля тарифов и услуг
import { ServiceType, BillingType } from '@prisma/client';
import { ValidationError } from '../../common/errors';

// Валидация услуги
export const validateService = (data: any) => {
  const errors: string[] = [];

  // Проверка названия
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Название услуги обязательно и должно быть строкой');
  } else if (data.name.trim().length < 2) {
    errors.push('Название услуги должно содержать минимум 2 символа');
  } else if (data.name.trim().length > 100) {
    errors.push('Название услуги не должно превышать 100 символов');
  }

  // Проверка описания
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      errors.push('Описание должно быть строкой');
    } else if (data.description.length > 500) {
      errors.push('Описание не должно превышать 500 символов');
    }
  }

  // Проверка типа услуги
  if (!data.type || !Object.values(ServiceType).includes(data.type)) {
    errors.push(`Тип услуги должен быть одним из: ${Object.values(ServiceType).join(', ')}`);
  }

  // Проверка активности
  if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
    errors.push('Поле isActive должно быть булевым значением');
  }

  if (errors.length > 0) {
    throw new ValidationError('Ошибка валидации услуги', errors);
  }
};

// Валидация тарифа
export const validateTariff = (data: any) => {
  const errors: string[] = [];

  // Проверка названия
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Название тарифа обязательно и должно быть строкой');
  } else if (data.name.trim().length < 2) {
    errors.push('Название тарифа должно содержать минимум 2 символа');
  } else if (data.name.trim().length > 100) {
    errors.push('Название тарифа не должно превышать 100 символов');
  }

  // Проверка описания
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      errors.push('Описание должно быть строкой');
    } else if (data.description.length > 500) {
      errors.push('Описание не должно превышать 500 символов');
    }
  }

  // Проверка цены
  if (data.price === undefined || data.price === null) {
    errors.push('Цена тарифа обязательна');
  } else if (typeof data.price !== 'number' || data.price < 0) {
    errors.push('Цена должна быть положительным числом');
  } else if (data.price > 999999) {
    errors.push('Цена не должна превышать 999999 рублей');
  }

  // Проверка типа биллинга
  if (!data.billingType || !Object.values(BillingType).includes(data.billingType)) {
    errors.push(`Тип биллинга должен быть одним из: ${Object.values(BillingType).join(', ')}`);
  }

  // Проверка скорости загрузки
  if (data.speedDown === undefined || data.speedDown === null) {
    errors.push('Скорость загрузки обязательна');
  } else if (typeof data.speedDown !== 'number' || data.speedDown <= 0) {
    errors.push('Скорость загрузки должна быть положительным числом');
  } else if (data.speedDown > 10000) {
    errors.push('Скорость загрузки не должна превышать 10000 Мбит/с');
  }

  // Проверка скорости отдачи
  if (data.speedUp === undefined || data.speedUp === null) {
    errors.push('Скорость отдачи обязательна');
  } else if (typeof data.speedUp !== 'number' || data.speedUp <= 0) {
    errors.push('Скорость отдачи должна быть положительным числом');
  } else if (data.speedUp > 10000) {
    errors.push('Скорость отдачи не должна превышать 10000 Мбит/с');
  }

  // Проверка услуг
  if (!Array.isArray(data.serviceIds)) {
    errors.push('Список услуг должен быть массивом');
  } else if (data.serviceIds.length === 0) {
    errors.push('Тариф должен включать хотя бы одну услугу');
  } else {
    // Проверяем, что все ID являются валидными ObjectId
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    const invalidIds = data.serviceIds.filter((id: any) => typeof id !== 'string' || !objectIdRegex.test(id));
    if (invalidIds.length > 0) {
      errors.push('Все ID услуг должны быть валидными ObjectId');
    }
  }

  // Проверка группы тарифов
  if (data.groupId !== undefined && data.groupId !== null) {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (typeof data.groupId !== 'string' || !objectIdRegex.test(data.groupId)) {
      errors.push('ID группы тарифов должен быть валидным ObjectId');
    }
  }

  // Проверка видимости в ЛК
  if (data.isVisibleInLK !== undefined && typeof data.isVisibleInLK !== 'boolean') {
    errors.push('Поле isVisibleInLK должно быть булевым значением');
  }

  // Проверка дней уведомления
  if (data.notificationDays !== undefined && data.notificationDays !== null) {
    if (typeof data.notificationDays !== 'number' || data.notificationDays < 0) {
      errors.push('Количество дней для уведомления должно быть неотрицательным числом');
    } else if (data.notificationDays > 30) {
      errors.push('Количество дней для уведомления не должно превышать 30');
    }
  }

  // Проверка активности
  if (data.isActive !== undefined && typeof data.isActive !== 'boolean') {
    errors.push('Поле isActive должно быть булевым значением');
  }

  if (errors.length > 0) {
    throw new ValidationError('Ошибка валидации тарифа', errors);
  }
};

// Валидация группы тарифов
export const validateTariffGroup = (data: any) => {
  const errors: string[] = [];

  // Проверка названия
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Название группы тарифов обязательно и должно быть строкой');
  } else if (data.name.trim().length < 2) {
    errors.push('Название группы тарифов должно содержать минимум 2 символа');
  } else if (data.name.trim().length > 100) {
    errors.push('Название группы тарифов не должно превышать 100 символов');
  }

  // Проверка описания
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      errors.push('Описание должно быть строкой');
    } else if (data.description.length > 500) {
      errors.push('Описание не должно превышать 500 символов');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Ошибка валидации группы тарифов', errors);
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
  
  // Проверяем, что это валидный ObjectId (24 символа hex)
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!objectIdRegex.test(id)) {
    throw new ValidationError(`${fieldName} должен быть валидным ObjectId`);
  }
};

// Бизнес-правила для тарифов
export const validateTariffBusinessRules = (data: any) => {
  const errors: string[] = [];

  // Правило: скорость отдачи не должна превышать скорость загрузки
  if (data.speedUp && data.speedDown && data.speedUp > data.speedDown) {
    errors.push('Скорость отдачи не может превышать скорость загрузки');
  }

  // Правило: для почасовой тарификации цена должна быть разумной
  if (data.billingType === BillingType.HOURLY && data.price > 100) {
    errors.push('Для почасовой тарификации цена не должна превышать 100 рублей за час');
  }

  // Правило: для месячной предоплаты цена должна быть разумной
  if (data.billingType === BillingType.PREPAID_MONTHLY && data.price < 100) {
    errors.push('Для месячной предоплаты цена должна быть не менее 100 рублей');
  }

  // Правило: дни уведомления должны быть разумными для типа биллинга
  if (data.billingType === BillingType.HOURLY && data.notificationDays > 1) {
    errors.push('Для почасовой тарификации дни уведомления не должны превышать 1 день');
  }

  // Правило: минимальная скорость должна быть разумной
  if (data.speedDown && data.speedDown < 1) {
    errors.push('Скорость загрузки должна быть не менее 1 Мбит/с');
  }

  if (data.speedUp && data.speedUp < 1) {
    errors.push('Скорость отдачи должна быть не менее 1 Мбит/с');
  }

  // Правило: соотношение скоростей должно быть разумным
  if (data.speedUp && data.speedDown && data.speedUp > 0 && data.speedDown > 0) {
    const ratio = data.speedUp / data.speedDown;
    if (ratio > 1.5) {
      errors.push('Скорость отдачи не должна превышать скорость загрузки более чем в 1.5 раза');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError('Нарушение бизнес-правил тарифа', errors);
  }
};