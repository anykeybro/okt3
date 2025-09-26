// Middleware для аутентификации и авторизации
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { JwtPayload, Resources, Actions } from './auth.types';
import prisma from '../../common/database';

// Расширяем интерфейс Request для добавления пользователя
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const authService = new AuthService(prisma);

/**
 * Middleware для проверки JWT токена
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Токен доступа не предоставлен'
      });
    }

    const decoded = authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Недействительный токен доступа'
    });
  }
};

/**
 * Middleware для проверки прав доступа
 */
export const authorize = (resource: Resources, action: Actions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Пользователь не аутентифицирован'
      });
    }

    const userPermissions = req.user.permissions;
    
    // Проверяем права доступа
    const hasPermission = userPermissions.some(permission => {
      return permission.resource === resource && 
             (permission.actions.includes(action) || permission.actions.includes(Actions.MANAGE));
    });

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Недостаточно прав для выполнения этого действия',
        required: { resource, action }
      });
    }

    next();
  };
};

/**
 * Middleware для проверки инициализации системы
 * Если в системе нет администраторов, перенаправляет на страницу инициализации
 */
export const checkSystemInitialization = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Пропускаем проверку для эндпоинтов инициализации
    if (req.path === '/api/auth/initialize' || req.path === '/api/auth/check-initialization') {
      return next();
    }

    const hasAdministrators = await authService.hasAdministrators();
    
    if (!hasAdministrators) {
      return res.status(412).json({
        error: 'Система не инициализирована',
        message: 'Необходимо создать первого администратора',
        redirectTo: '/initialize'
      });
    }

    next();
  } catch (error) {
    console.error('Ошибка проверки инициализации системы:', error);
    return res.status(500).json({
      error: 'Внутренняя ошибка сервера'
    });
  }
};

/**
 * Middleware для проверки роли суперадмина
 */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Пользователь не аутентифицирован'
    });
  }

  // Проверяем, есть ли у пользователя права управления пользователями
  const hasUserManagement = req.user.permissions.some(permission => {
    return permission.resource === Resources.USERS && 
           permission.actions.includes(Actions.MANAGE);
  });

  if (!hasUserManagement) {
    return res.status(403).json({
      error: 'Требуются права суперадминистратора'
    });
  }

  next();
};

/**
 * Middleware для логирования действий пользователей
 */
export const auditLog = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Сохраняем оригинальный метод send
    const originalSend = res.send;

    // Переопределяем метод send для логирования после отправки ответа
    res.send = function(data) {
      // Логируем действие пользователя
      if (req.user && res.statusCode < 400) {
        console.log(`[AUDIT] Пользователь ${req.user.username} выполнил действие: ${action}`, {
          userId: req.user.userId,
          username: req.user.username,
          action,
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
      }

      // Вызываем оригинальный метод
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Middleware для ограничения частоты запросов (Rate Limiting)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      // Новый клиент или окно сброшено
      requestCounts.set(clientId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        error: 'Слишком много запросов',
        message: `Превышен лимит ${maxRequests} запросов за ${windowMs / 1000} секунд`,
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
    
    clientData.count++;
    next();
  };
};

/**
 * Middleware для валидации данных запроса
 */
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Ошибка валидации данных',
        details: error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    next();
  };
};

/**
 * Middleware для валидации параметров запроса
 */
export const validateParams = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params);
    
    if (error) {
      return res.status(400).json({
        error: 'Ошибка валидации параметров',
        details: error.details.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    next();
  };
};