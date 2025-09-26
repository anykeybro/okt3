// Валидация данных для модуля устройств

import Joi from 'joi';
import { DeviceStatus } from '@prisma/client';

// Схема валидации для создания устройства
export const createDeviceSchema = Joi.object({
  ipAddress: Joi.string()
    .ip({ version: ['ipv4'] })
    .required()
    .messages({
      'string.ip': 'IP адрес должен быть корректным IPv4 адресом',
      'any.required': 'IP адрес обязателен'
    }),
  
  username: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'Имя пользователя не может быть пустым',
      'string.max': 'Имя пользователя не может быть длиннее 50 символов',
      'any.required': 'Имя пользователя обязательно'
    }),
  
  password: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Пароль не может быть пустым',
      'string.max': 'Пароль не может быть длиннее 100 символов',
      'any.required': 'Пароль обязателен'
    }),
  
  description: Joi.string()
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Описание не может быть длиннее 255 символов'
    })
});

// Схема валидации для обновления устройства
export const updateDeviceSchema = Joi.object({
  username: Joi.string()
    .min(1)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Имя пользователя не может быть пустым',
      'string.max': 'Имя пользователя не может быть длиннее 50 символов'
    }),
  
  password: Joi.string()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Пароль не может быть пустым',
      'string.max': 'Пароль не может быть длиннее 100 символов'
    }),
  
  description: Joi.string()
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Описание не может быть длиннее 255 символов'
    }),
  
  status: Joi.string()
    .valid(...Object.values(DeviceStatus))
    .optional()
    .messages({
      'any.only': `Статус должен быть одним из: ${Object.values(DeviceStatus).join(', ')}`
    })
}).min(1).messages({
  'object.min': 'Необходимо указать хотя бы одно поле для обновления'
});

// Схема валидации для фильтров устройств
export const deviceFiltersSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(DeviceStatus))
    .optional()
    .messages({
      'any.only': `Статус должен быть одним из: ${Object.values(DeviceStatus).join(', ')}`
    }),
  
  search: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Поисковый запрос не может быть длиннее 100 символов'
    }),
  
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1)
    .messages({
      'number.base': 'Номер страницы должен быть числом',
      'number.integer': 'Номер страницы должен быть целым числом',
      'number.min': 'Номер страницы должен быть больше 0'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .messages({
      'number.base': 'Лимит должен быть числом',
      'number.integer': 'Лимит должен быть целым числом',
      'number.min': 'Лимит должен быть больше 0',
      'number.max': 'Лимит не может быть больше 100'
    })
});

// Схема валидации для тестирования подключения
export const testConnectionSchema = Joi.object({
  ipAddress: Joi.string()
    .ip({ version: ['ipv4'] })
    .required()
    .messages({
      'string.ip': 'IP адрес должен быть корректным IPv4 адресом',
      'any.required': 'IP адрес обязателен'
    }),
  
  username: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.min': 'Имя пользователя не может быть пустым',
      'string.max': 'Имя пользователя не может быть длиннее 50 символов',
      'any.required': 'Имя пользователя обязательно'
    }),
  
  password: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Пароль не может быть пустым',
      'string.max': 'Пароль не может быть длиннее 100 символов',
      'any.required': 'Пароль обязателен'
    })
});

// Функции валидации
export const validateCreateDevice = (data: any) => {
  return createDeviceSchema.validate(data, { abortEarly: false });
};

export const validateUpdateDevice = (data: any) => {
  return updateDeviceSchema.validate(data, { abortEarly: false });
};

export const validateDeviceFilters = (data: any) => {
  return deviceFiltersSchema.validate(data, { abortEarly: false });
};

export const validateTestConnection = (data: any) => {
  return testConnectionSchema.validate(data, { abortEarly: false });
};