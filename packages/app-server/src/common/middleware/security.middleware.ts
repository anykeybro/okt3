import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { config } from '../../config/config';
import { cacheService } from '../cache/cache.service';

/**
 * Настройка Helmet для безопасных заголовков
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
    },
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 год
    includeSubDomains: true,
    preload: true,
  },
  
  // X-Frame-Options
  frameguard: {
    action: 'deny',
  },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  
  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: false,
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
});

/**
 * Rate limiting middleware
 */
export const rateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindow,
  max: config.security.rateLimitMax,
  message: {
    error: 'Слишком много запросов с этого IP, попробуйте позже',
    retryAfter: Math.ceil(config.security.rateLimitWindow / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  
  // Кастомная функция для подсчета запросов с использованием Redis
  store: {
    incr: async (key: string) => {
      const count = await cacheService.incr(
        `rate_limit:${key}`,
        Math.ceil(config.security.rateLimitWindow / 1000)
      );
      return { totalHits: count, resetTime: new Date(Date.now() + config.security.rateLimitWindow) };
    },
    decrement: async (key: string) => {
      // Не реализуем, так как используем TTL
    },
    resetKey: async (key: string) => {
      await cacheService.del(`rate_limit:${key}`);
    },
  },
  
  // Пропускать успешные запросы
  skipSuccessfulRequests: false,
  
  // Пропускать неудачные запросы
  skipFailedRequests: false,
  
  // Кастомная функция для определения ключа
  keyGenerator: (req: Request) => {
    return req.ip || 'unknown';
  },
});

/**
 * Специальный rate limiter для аутентификации
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // 5 попыток входа за 15 минут
  message: {
    error: 'Слишком много попыток входа, попробуйте через 15 минут',
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Не считать успешные входы
});

/**
 * Slow down middleware для замедления подозрительных запросов
 */
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 минут
  delayAfter: 50, // Начинать замедление после 50 запросов
  delayMs: 500, // Увеличивать задержку на 500мс за каждый запрос
  maxDelayMs: 20000, // Максимальная задержка 20 секунд
});

/**
 * Middleware для проверки HTTPS в продакшене
 */
export const enforceHTTPS = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.get('host')}${req.url}`);
    }
  }
  next();
};

/**
 * Middleware для добавления дополнительных заголовков безопасности
 */
export const additionalSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Запретить кеширование чувствительных данных
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  // Дополнительные заголовки безопасности
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Заголовок для предотвращения MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  next();
};

/**
 * Middleware для логирования подозрительной активности
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /vbscript:/i,  // VBScript injection
    /onload=/i,  // Event handler injection
    /onerror=/i,  // Event handler injection
  ];

  const userAgent = req.get('User-Agent') || '';
  const url = req.url;
  const body = JSON.stringify(req.body);
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(url) || pattern.test(body) || pattern.test(userAgent)
  );

  if (isSuspicious) {
    console.warn('Подозрительный запрос обнаружен:', {
      ip: req.ip,
      userAgent,
      url,
      method: req.method,
      body: req.body,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

/**
 * Middleware для блокировки известных вредоносных IP
 */
export const ipBlacklist = async (req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip;
  
  // Проверяем, заблокирован ли IP
  const isBlocked = await cacheService.exists(`blocked_ip:${clientIp}`);
  
  if (isBlocked) {
    return res.status(403).json({
      error: 'Доступ запрещен',
      message: 'Ваш IP адрес заблокирован',
    });
  }

  next();
};

/**
 * Функция для блокировки IP адреса
 */
export const blockIp = async (ip: string, durationSeconds: number = 3600) => {
  await cacheService.set(`blocked_ip:${ip}`, true, durationSeconds);
  console.warn(`IP ${ip} заблокирован на ${durationSeconds} секунд`);
};

/**
 * Middleware для защиты от CSRF атак
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Проверяем Origin и Referer для POST, PUT, DELETE запросов
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.get('Origin');
    const referer = req.get('Referer');
    const host = req.get('Host');
    
    // Список разрешенных доменов
    const allowedOrigins = config.server.cors.origin;
    
    if (origin) {
      const isAllowed = Array.isArray(allowedOrigins) 
        ? allowedOrigins.includes(origin)
        : allowedOrigins === origin;
        
      if (!isAllowed) {
        return res.status(403).json({
          error: 'CSRF защита',
          message: 'Недопустимый Origin',
        });
      }
    } else if (referer) {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        return res.status(403).json({
          error: 'CSRF защита',
          message: 'Недопустимый Referer',
        });
      }
    } else {
      // Если нет ни Origin, ни Referer - подозрительно
      return res.status(403).json({
        error: 'CSRF защита',
        message: 'Отсутствуют необходимые заголовки',
      });
    }
  }

  next();
};