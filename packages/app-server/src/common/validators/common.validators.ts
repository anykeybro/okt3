import { body, param, query } from 'express-validator';

/**
 * Валидаторы для общих полей
 */

// ID валидаторы
export const validateId = param('id')
  .isMongoId()
  .withMessage('Некорректный формат ID');

export const validateOptionalId = param('id')
  .optional()
  .isMongoId()
  .withMessage('Некорректный формат ID');

// Пагинация
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Номер страницы должен быть положительным числом')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Лимит должен быть от 1 до 100')
    .toInt(),
  query('sortBy')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Поле сортировки должно быть строкой от 1 до 50 символов'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Порядок сортировки должен быть asc или desc'),
];

// Поиск
export const validateSearch = query('search')
  .optional()
  .isString()
  .isLength({ min: 1, max: 100 })
  .withMessage('Поисковый запрос должен быть от 1 до 100 символов')
  .trim();

// Телефон
export const validatePhone = (fieldName: string = 'phone') =>
  body(fieldName)
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Некорректный формат номера телефона')
    .normalizeEmail();

export const validateOptionalPhone = (fieldName: string = 'phone') =>
  body(fieldName)
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Некорректный формат номера телефона');

// Email
export const validateEmail = (fieldName: string = 'email') =>
  body(fieldName)
    .isEmail()
    .withMessage('Некорректный формат email')
    .normalizeEmail();

export const validateOptionalEmail = (fieldName: string = 'email') =>
  body(fieldName)
    .optional()
    .isEmail()
    .withMessage('Некорректный формат email')
    .normalizeEmail();

// Имя
export const validateName = (fieldName: string) =>
  body(fieldName)
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage(`${fieldName} должно быть строкой от 1 до 100 символов`)
    .trim();

export const validateOptionalName = (fieldName: string) =>
  body(fieldName)
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage(`${fieldName} должно быть строкой от 1 до 100 символов`)
    .trim();

// Пароль
export const validatePassword = body('password')
  .isLength({ min: 8, max: 128 })
  .withMessage('Пароль должен быть от 8 до 128 символов')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Пароль должен содержать минимум одну заглавную букву, одну строчную букву, одну цифру и один специальный символ');

export const validateOptionalPassword = body('password')
  .optional()
  .isLength({ min: 8, max: 128 })
  .withMessage('Пароль должен быть от 8 до 128 символов')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Пароль должен содержать минимум одну заглавную букву, одну строчную букву, одну цифру и один специальный символ');

// Сумма денег
export const validateAmount = (fieldName: string = 'amount') =>
  body(fieldName)
    .isFloat({ min: 0.01, max: 999999.99 })
    .withMessage('Сумма должна быть положительным числом до 999999.99')
    .toFloat();

export const validateOptionalAmount = (fieldName: string = 'amount') =>
  body(fieldName)
    .optional()
    .isFloat({ min: 0.01, max: 999999.99 })
    .withMessage('Сумма должна быть положительным числом до 999999.99')
    .toFloat();

// IP адрес
export const validateIpAddress = (fieldName: string = 'ipAddress') =>
  body(fieldName)
    .isIP()
    .withMessage('Некорректный формат IP адреса');

// MAC адрес
export const validateMacAddress = (fieldName: string = 'macAddress') =>
  body(fieldName)
    .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
    .withMessage('Некорректный формат MAC адреса');

export const validateOptionalMacAddress = (fieldName: string = 'macAddress') =>
  body(fieldName)
    .optional()
    .matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/)
    .withMessage('Некорректный формат MAC адреса');

// Статус
export const validateStatus = (fieldName: string, allowedValues: string[]) =>
  body(fieldName)
    .isIn(allowedValues)
    .withMessage(`${fieldName} должен быть одним из: ${allowedValues.join(', ')}`);

export const validateOptionalStatus = (fieldName: string, allowedValues: string[]) =>
  body(fieldName)
    .optional()
    .isIn(allowedValues)
    .withMessage(`${fieldName} должен быть одним из: ${allowedValues.join(', ')}`);

// Дата
export const validateDate = (fieldName: string) =>
  body(fieldName)
    .isISO8601()
    .withMessage('Некорректный формат даты (ожидается ISO 8601)')
    .toDate();

export const validateOptionalDate = (fieldName: string) =>
  body(fieldName)
    .optional()
    .isISO8601()
    .withMessage('Некорректный формат даты (ожидается ISO 8601)')
    .toDate();

// Диапазон дат
export const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Некорректный формат начальной даты')
    .toDate(),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Некорректный формат конечной даты')
    .toDate(),
];

// Координаты
export const validateCoordinates = [
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Широта должна быть от -90 до 90')
    .toFloat(),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Долгота должна быть от -180 до 180')
    .toFloat(),
];

// Описание/комментарий
export const validateDescription = (fieldName: string = 'description') =>
  body(fieldName)
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Описание не должно превышать 1000 символов')
    .trim();

// Булево значение
export const validateBoolean = (fieldName: string) =>
  body(fieldName)
    .isBoolean()
    .withMessage(`${fieldName} должно быть булевым значением`)
    .toBoolean();

export const validateOptionalBoolean = (fieldName: string) =>
  body(fieldName)
    .optional()
    .isBoolean()
    .withMessage(`${fieldName} должно быть булевым значением`)
    .toBoolean();

// Массив строк
export const validateStringArray = (fieldName: string, maxLength: number = 100) =>
  body(fieldName)
    .isArray()
    .withMessage(`${fieldName} должно быть массивом`)
    .custom((value: any[]) => {
      if (!Array.isArray(value)) return false;
      return value.every(item => 
        typeof item === 'string' && 
        item.length > 0 && 
        item.length <= maxLength
      );
    })
    .withMessage(`Все элементы ${fieldName} должны быть непустыми строками до ${maxLength} символов`);

export const validateOptionalStringArray = (fieldName: string, maxLength: number = 100) =>
  body(fieldName)
    .optional()
    .isArray()
    .withMessage(`${fieldName} должно быть массивом`)
    .custom((value: any[]) => {
      if (!Array.isArray(value)) return false;
      return value.every(item => 
        typeof item === 'string' && 
        item.length > 0 && 
        item.length <= maxLength
      );
    })
    .withMessage(`Все элементы ${fieldName} должны быть непустыми строками до ${maxLength} символов`);