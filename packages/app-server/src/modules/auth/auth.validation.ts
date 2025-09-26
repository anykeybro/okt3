// Схемы валидации для модуля аутентификации
import Joi from 'joi';
import { Resources, Actions } from './auth.types';

// Схема для входа в систему
export const loginSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Имя пользователя должно содержать только буквы и цифры',
      'string.min': 'Имя пользователя должно содержать минимум 3 символа',
      'string.max': 'Имя пользователя должно содержать максимум 30 символов',
      'any.required': 'Имя пользователя обязательно для заполнения'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Пароль должен содержать минимум 6 символов',
      'any.required': 'Пароль обязателен для заполнения'
    })
});

// Схема для обновления токена
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token обязателен для заполнения'
    })
});

// Схема для инициализации системы
export const initializeSystemSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Имя пользователя должно содержать только буквы и цифры',
      'string.min': 'Имя пользователя должно содержать минимум 3 символа',
      'string.max': 'Имя пользователя должно содержать максимум 30 символов',
      'any.required': 'Имя пользователя обязательно для заполнения'
    }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'Пароль должен содержать минимум 8 символов',
      'string.pattern.base': 'Пароль должен содержать минимум одну заглавную букву, одну строчную букву и одну цифру',
      'any.required': 'Пароль обязателен для заполнения'
    })
});

// Схема для создания пользователя
export const createUserSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Имя пользователя должно содержать только буквы и цифры',
      'string.min': 'Имя пользователя должно содержать минимум 3 символа',
      'string.max': 'Имя пользователя должно содержать максимум 30 символов',
      'any.required': 'Имя пользователя обязательно для заполнения'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Пароль должен содержать минимум 6 символов',
      'any.required': 'Пароль обязателен для заполнения'
    }),
  roleId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      'string.hex': 'ID роли должен быть валидным ObjectId',
      'string.length': 'ID роли должен содержать 24 символа',
      'any.required': 'ID роли обязателен для заполнения'
    })
});

// Схема для обновления пользователя
export const updateUserSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .messages({
      'string.alphanum': 'Имя пользователя должно содержать только буквы и цифры',
      'string.min': 'Имя пользователя должно содержать минимум 3 символа',
      'string.max': 'Имя пользователя должно содержать максимум 30 символов'
    }),
  password: Joi.string()
    .min(6)
    .messages({
      'string.min': 'Пароль должен содержать минимум 6 символов'
    }),
  roleId: Joi.string()
    .hex()
    .length(24)
    .messages({
      'string.hex': 'ID роли должен быть валидным ObjectId',
      'string.length': 'ID роли должен содержать 24 символа'
    }),
  isActive: Joi.boolean()
    .messages({
      'boolean.base': 'Статус активности должен быть булевым значением'
    })
}).min(1).messages({
  'object.min': 'Необходимо указать хотя бы одно поле для обновления'
});

// Схема для создания роли
export const createRoleSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Название роли должно содержать минимум 2 символа',
      'string.max': 'Название роли должно содержать максимум 50 символов',
      'any.required': 'Название роли обязательно для заполнения'
    }),
  description: Joi.string()
    .max(200)
    .allow('')
    .messages({
      'string.max': 'Описание роли должно содержать максимум 200 символов'
    }),
  permissions: Joi.array()
    .items(
      Joi.object({
        resource: Joi.string()
          .valid(...Object.values(Resources))
          .required()
          .messages({
            'any.only': `Ресурс должен быть одним из: ${Object.values(Resources).join(', ')}`,
            'any.required': 'Ресурс обязателен для заполнения'
          }),
        actions: Joi.array()
          .items(
            Joi.string()
              .valid(...Object.values(Actions))
              .messages({
                'any.only': `Действие должно быть одним из: ${Object.values(Actions).join(', ')}`
              })
          )
          .min(1)
          .required()
          .messages({
            'array.min': 'Необходимо указать хотя бы одно действие',
            'any.required': 'Действия обязательны для заполнения'
          })
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'Необходимо указать хотя бы одно право доступа',
      'any.required': 'Права доступа обязательны для заполнения'
    })
});

// Схема для обновления роли
export const updateRoleSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Название роли должно содержать минимум 2 символа',
      'string.max': 'Название роли должно содержать максимум 50 символов'
    }),
  description: Joi.string()
    .max(200)
    .allow('')
    .messages({
      'string.max': 'Описание роли должно содержать максимум 200 символов'
    }),
  permissions: Joi.array()
    .items(
      Joi.object({
        resource: Joi.string()
          .valid(...Object.values(Resources))
          .required()
          .messages({
            'any.only': `Ресурс должен быть одним из: ${Object.values(Resources).join(', ')}`,
            'any.required': 'Ресурс обязателен для заполнения'
          }),
        actions: Joi.array()
          .items(
            Joi.string()
              .valid(...Object.values(Actions))
              .messages({
                'any.only': `Действие должно быть одним из: ${Object.values(Actions).join(', ')}`
              })
          )
          .min(1)
          .required()
          .messages({
            'array.min': 'Необходимо указать хотя бы одно действие',
            'any.required': 'Действия обязательны для заполнения'
          })
      })
    )
    .min(1)
    .messages({
      'array.min': 'Необходимо указать хотя бы одно право доступа'
    })
}).min(1).messages({
  'object.min': 'Необходимо указать хотя бы одно поле для обновления'
});

// Схема для валидации ObjectId в параметрах
export const objectIdSchema = Joi.object({
  id: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      'string.hex': 'ID должен быть валидным ObjectId',
      'string.length': 'ID должен содержать 24 символа',
      'any.required': 'ID обязателен для заполнения'
    })
});