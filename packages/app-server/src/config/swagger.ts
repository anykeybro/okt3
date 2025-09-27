import swaggerJSDoc from 'swagger-jsdoc';
import { config } from './config';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'OK-Telecom Биллинг API',
      version: '1.0.0',
      description: 'API для системы биллинга интернет-провайдера OK-Telecom',
      contact: {
        name: 'OK-Telecom Support',
        email: 'support@ok-telecom.ru'
      }
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: 'Development server'
      },
      {
        url: 'https://api.ok-telecom.ru',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Сообщение об ошибке'
            },
            code: {
              type: 'string',
              description: 'Код ошибки'
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Сообщение об ошибке валидации'
            },
            field: {
              type: 'string',
              description: 'Поле с ошибкой'
            }
          }
        },
        SystemUser: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Уникальный идентификатор'
            },
            username: {
              type: 'string',
              description: 'Имя пользователя'
            },
            role: {
              $ref: '#/components/schemas/Role'
            },
            isActive: {
              type: 'boolean',
              description: 'Активен ли пользователь'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Дата создания'
            }
          }
        },
        Role: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Уникальный идентификатор роли'
            },
            name: {
              type: 'string',
              description: 'Название роли'
            },
            permissions: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Permission'
              }
            },
            description: {
              type: 'string',
              description: 'Описание роли'
            }
          }
        },
        Permission: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Уникальный идентификатор разрешения'
            },
            resource: {
              type: 'string',
              description: 'Ресурс (users, clients, tariffs и т.д.)'
            },
            actions: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Доступные действия (create, read, update, delete)'
            }
          }
        },
        Client: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Уникальный идентификатор клиента'
            },
            firstName: {
              type: 'string',
              description: 'Имя'
            },
            lastName: {
              type: 'string',
              description: 'Фамилия'
            },
            middleName: {
              type: 'string',
              description: 'Отчество'
            },
            phones: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Номера телефонов'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email адрес'
            },
            telegramId: {
              type: 'string',
              description: 'Telegram ID'
            },
            address: {
              type: 'string',
              description: 'Адрес'
            },
            coordinates: {
              type: 'object',
              properties: {
                latitude: {
                  type: 'number',
                  description: 'Широта'
                },
                longitude: {
                  type: 'number',
                  description: 'Долгота'
                }
              }
            },
            accounts: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Account'
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Account: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Уникальный идентификатор лицевого счета'
            },
            accountNumber: {
              type: 'string',
              description: 'Номер лицевого счета'
            },
            clientId: {
              type: 'string',
              description: 'ID клиента'
            },
            tariffId: {
              type: 'string',
              description: 'ID тарифа'
            },
            balance: {
              type: 'number',
              description: 'Баланс счета'
            },
            status: {
              type: 'string',
              enum: ['active', 'blocked', 'suspended'],
              description: 'Статус счета'
            },
            macAddress: {
              type: 'string',
              description: 'MAC адрес'
            },
            poolName: {
              type: 'string',
              description: 'Имя пула IP адресов'
            },
            blockThreshold: {
              type: 'number',
              description: 'Порог для автоблокировки'
            },
            deviceId: {
              type: 'string',
              description: 'ID устройства'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Tariff: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Уникальный идентификатор тарифа'
            },
            name: {
              type: 'string',
              description: 'Название тарифа'
            },
            description: {
              type: 'string',
              description: 'Описание тарифа'
            },
            price: {
              type: 'number',
              description: 'Стоимость тарифа'
            },
            billingType: {
              type: 'string',
              enum: ['prepaid_monthly', 'hourly'],
              description: 'Тип биллинга'
            },
            speedDown: {
              type: 'number',
              description: 'Скорость загрузки (Мбит/с)'
            },
            speedUp: {
              type: 'number',
              description: 'Скорость отдачи (Мбит/с)'
            },
            services: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Service'
              }
            },
            groupId: {
              type: 'string',
              description: 'ID группы тарифов'
            },
            isVisibleInLK: {
              type: 'boolean',
              description: 'Видимость в личном кабинете'
            },
            notificationDays: {
              type: 'number',
              description: 'За сколько дней уведомлять'
            },
            isActive: {
              type: 'boolean',
              description: 'Активен ли тариф'
            }
          }
        },
        Service: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Уникальный идентификатор услуги'
            },
            name: {
              type: 'string',
              description: 'Название услуги'
            },
            description: {
              type: 'string',
              description: 'Описание услуги'
            },
            type: {
              type: 'string',
              enum: ['internet', 'iptv', 'cloud_storage'],
              description: 'Тип услуги'
            },
            isActive: {
              type: 'boolean',
              description: 'Активна ли услуга'
            }
          }
        },
        Device: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Уникальный идентификатор устройства'
            },
            ipAddress: {
              type: 'string',
              description: 'IP адрес устройства'
            },
            username: {
              type: 'string',
              description: 'Имя пользователя для подключения'
            },
            description: {
              type: 'string',
              description: 'Описание устройства'
            },
            status: {
              type: 'string',
              enum: ['online', 'offline', 'error'],
              description: 'Статус устройства'
            },
            lastCheck: {
              type: 'string',
              format: 'date-time',
              description: 'Время последней проверки'
            }
          }
        },
        Request: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Уникальный идентификатор заявки'
            },
            clientId: {
              type: 'string',
              description: 'ID автосозданного клиента'
            },
            address: {
              type: 'string',
              description: 'Адрес подключения'
            },
            firstName: {
              type: 'string',
              description: 'Имя заявителя'
            },
            lastName: {
              type: 'string',
              description: 'Фамилия заявителя'
            },
            phone: {
              type: 'string',
              description: 'Телефон заявителя'
            },
            desiredServices: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Желаемые услуги'
            },
            status: {
              type: 'string',
              enum: ['new', 'in_progress', 'completed', 'cancelled'],
              description: 'Статус заявки'
            },
            assignedTo: {
              type: 'string',
              description: 'ID назначенного администратора'
            },
            notes: {
              type: 'string',
              description: 'Заметки по заявке'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Уникальный идентификатор платежа'
            },
            accountId: {
              type: 'string',
              description: 'ID лицевого счета'
            },
            amount: {
              type: 'number',
              description: 'Сумма платежа'
            },
            source: {
              type: 'string',
              enum: ['manual', 'robokassa'],
              description: 'Источник платежа'
            },
            externalId: {
              type: 'string',
              description: 'Внешний ID (от Robokassa)'
            },
            comment: {
              type: 'string',
              description: 'Комментарий к платежу'
            },
            processedBy: {
              type: 'string',
              description: 'ID администратора (для ручных платежей)'
            },
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'failed'],
              description: 'Статус платежа'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            processedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        DashboardStats: {
          type: 'object',
          properties: {
            activeClients: {
              type: 'number',
              description: 'Количество активных абонентов'
            },
            blockedClients: {
              type: 'number',
              description: 'Количество заблокированных абонентов'
            },
            todayRevenue: {
              type: 'number',
              description: 'Доходы за сегодня'
            },
            monthRevenue: {
              type: 'number',
              description: 'Доходы за месяц'
            },
            newRequests: {
              type: 'number',
              description: 'Новые заявки'
            },
            pendingRequests: {
              type: 'number',
              description: 'Заявки в работе'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/modules/*/routes/*.ts',
    './src/modules/*/controllers/*.ts',
    './src/routes/*.ts'
  ]
};

export const swaggerSpec = swaggerJSDoc(options);