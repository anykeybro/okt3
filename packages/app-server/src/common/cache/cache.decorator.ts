import { cacheService } from './cache.service';

/**
 * Декоратор для кеширования результатов методов
 */
export function Cacheable(options: {
  keyPrefix?: string;
  ttlSeconds?: number;
  keyGenerator?: (...args: any[]) => string;
}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Генерация ключа кеша
      let cacheKey: string;
      
      if (options.keyGenerator) {
        cacheKey = options.keyGenerator(...args);
      } else {
        const prefix = options.keyPrefix || `${target.constructor.name}:${propertyName}`;
        const argsKey = args.length > 0 ? `:${JSON.stringify(args)}` : '';
        cacheKey = `${prefix}${argsKey}`;
      }

      // Попытка получить из кеша
      const cached = await cacheService.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Выполнение оригинального метода
      const result = await method.apply(this, args);

      // Сохранение в кеш
      await cacheService.set(cacheKey, result, options.ttlSeconds);

      return result;
    };

    return descriptor;
  };
}

/**
 * Декоратор для инвалидации кеша
 */
export function CacheEvict(options: {
  keyPattern?: string;
  keyGenerator?: (...args: any[]) => string;
}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Выполнение оригинального метода
      const result = await method.apply(this, args);

      // Инвалидация кеша
      if (options.keyGenerator) {
        const cacheKey = options.keyGenerator(...args);
        await cacheService.del(cacheKey);
      } else if (options.keyPattern) {
        await cacheService.delPattern(options.keyPattern);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Генераторы ключей для различных сущностей
 */
export const CacheKeys = {
  // Дашборд
  dashboardStats: () => 'dashboard:stats',
  dashboardPayments: (period: string) => `dashboard:payments:${period}`,
  dashboardRequests: () => 'dashboard:requests',

  // Тарифы
  activeTariffs: () => 'tariffs:active',
  tariffGroups: () => 'tariff-groups:all',
  tariffById: (id: string) => `tariff:${id}`,

  // Клиенты
  clientById: (id: string) => `client:${id}`,
  clientByPhone: (phone: string) => `client:phone:${phone}`,
  accountById: (id: string) => `account:${id}`,
  accountsByClient: (clientId: string) => `accounts:client:${clientId}`,

  // Устройства
  activeDevices: () => 'devices:active',
  deviceById: (id: string) => `device:${id}`,

  // Уведомления
  notificationTemplates: () => 'notification-templates:all',
  templateByType: (type: string, channel: string) => `template:${type}:${channel}`,

  // Статистика
  clientsCount: () => 'stats:clients:count',
  activeAccountsCount: () => 'stats:accounts:active',
  paymentsSum: (date: string) => `stats:payments:sum:${date}`,
};