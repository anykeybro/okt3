import { Request, Response, NextFunction } from 'express';
import { auditService, AuditLogEntry } from '../../modules/audit/audit.service';

// Расширяем интерфейс Request для хранения данных аудита
declare global {
  namespace Express {
    interface Request {
      auditData?: {
        action?: string;
        resource?: string;
        resourceId?: string;
        oldValues?: Record<string, any>;
      };
    }
  }
}

/**
 * Middleware для автоматического аудита HTTP запросов
 */
export const auditMiddleware = (options: {
  action?: string;
  resource?: string;
  getResourceId?: (req: Request) => string;
  captureBody?: boolean;
  captureResponse?: boolean;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Сохраняем оригинальные методы
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseData: any;
    let oldValues: Record<string, any> | undefined;

    // Если нужно захватить старые значения (для UPDATE операций)
    if (options.captureBody && req.method === 'PUT') {
      try {
        // Здесь можно добавить логику для получения старых значений из БД
        // Это зависит от конкретного ресурса
        oldValues = req.auditData?.oldValues;
      } catch (error) {
        console.error('Ошибка получения старых значений для аудита:', error);
      }
    }

    // Перехватываем ответ
    if (options.captureResponse) {
      res.send = function(data: any) {
        responseData = data;
        return originalSend.call(this, data);
      };

      res.json = function(data: any) {
        responseData = data;
        return originalJson.call(this, data);
      };
    }

    // Обработчик завершения запроса
    res.on('finish', async () => {
      try {
        // Пропускаем аудит для GET запросов и неуспешных операций
        if (req.method === 'GET' || res.statusCode >= 400) {
          return;
        }

        // Получаем пользователя из токена
        const user = (req as any).user;
        if (!user) {
          return; // Нет аутентифицированного пользователя
        }

        const action = options.action || getActionFromMethod(req.method, req.route?.path);
        const resource = options.resource || getResourceFromPath(req.route?.path);
        const resourceId = options.getResourceId ? options.getResourceId(req) : req.params.id;

        const auditEntry: AuditLogEntry = {
          userId: user.id,
          action,
          resource,
          resourceId,
          oldValues,
          newValues: options.captureBody ? req.body : undefined,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: Date.now() - startTime,
            query: Object.keys(req.query).length > 0 ? req.query : undefined,
          },
        };

        await auditService.log(auditEntry);
      } catch (error) {
        console.error('Ошибка записи аудита:', error);
      }
    });

    next();
  };
};

/**
 * Декоратор для методов контроллера с автоматическим аудитом
 */
export function Audit(options: {
  action: string;
  resource: string;
  captureOldValues?: boolean;
}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (req: Request, res: Response, ...args: any[]) {
      const user = (req as any).user;
      
      if (!user) {
        return method.apply(this, [req, res, ...args]);
      }

      let oldValues: Record<string, any> | undefined;

      // Захват старых значений для операций обновления
      if (options.captureOldValues && req.params.id) {
        try {
          // Здесь нужно добавить логику получения старых значений
          // В зависимости от ресурса
          oldValues = await getOldValues(options.resource, req.params.id);
        } catch (error) {
          console.error('Ошибка получения старых значений:', error);
        }
      }

      try {
        const result = await method.apply(this, [req, res, ...args]);

        // Записываем аудит после успешного выполнения
        const auditEntry: AuditLogEntry = {
          userId: user.id,
          action: options.action,
          resource: options.resource,
          resourceId: req.params.id,
          oldValues,
          newValues: req.body,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          },
        };

        await auditService.log(auditEntry);

        return result;
      } catch (error) {
        // Записываем аудит ошибки
        const auditEntry: AuditLogEntry = {
          userId: user.id,
          action: `${options.action}_failed`,
          resource: options.resource,
          resourceId: req.params.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            method: req.method,
            path: req.path,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };

        await auditService.log(auditEntry);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Получить действие из HTTP метода и пути
 */
function getActionFromMethod(method: string, path?: string): string {
  const baseAction = method.toLowerCase();
  
  switch (method) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    case 'GET':
      return 'read';
    default:
      return baseAction;
  }
}

/**
 * Получить ресурс из пути
 */
function getResourceFromPath(path?: string): string {
  if (!path) return 'unknown';
  
  // Извлекаем первый сегмент пути после /api/
  const match = path.match(/^\/api\/([^\/]+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Получить старые значения для ресурса (заглушка)
 */
async function getOldValues(resource: string, id: string): Promise<Record<string, any> | undefined> {
  // Здесь должна быть логика получения старых значений из БД
  // В зависимости от типа ресурса
  
  // Пример для клиентов:
  // if (resource === 'clients') {
  //   const client = await prisma.client.findUnique({ where: { id } });
  //   return client ? { ...client } : undefined;
  // }
  
  return undefined;
}

/**
 * Middleware для аудита входа в систему
 */
export const auditLogin = async (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data: any) {
    // Проверяем успешность входа по статус коду
    if (res.statusCode === 200) {
      // Успешный вход
      const user = (req as any).user;
      if (user) {
        auditService.log({
          userId: user.id,
          action: 'login',
          resource: 'auth',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            loginTime: new Date().toISOString(),
          },
        }).catch(error => {
          console.error('Ошибка аудита входа:', error);
        });
      }
    } else {
      // Неуспешная попытка входа
      const username = req.body?.username;
      if (username) {
        auditService.log({
          userId: 'anonymous',
          action: 'login_failed',
          resource: 'auth',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          metadata: {
            username,
            reason: 'Invalid credentials',
            attemptTime: new Date().toISOString(),
          },
        }).catch(error => {
          console.error('Ошибка аудита неуспешного входа:', error);
        });
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};