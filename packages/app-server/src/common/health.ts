// Система health check для мониторинга состояния сервисов
import { Request, Response } from 'express';
import prisma from './database';
import { mainLogger } from './logger';
import { metricsCollector } from './metrics';
import { config } from '../config/config';

// Интерфейсы для health check
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: ServiceHealth[];
  metrics?: any;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}

// Класс для проверки состояния сервисов
export class HealthChecker {
  
  // Основной health check
  async getHealthStatus(includeMetrics = false): Promise<HealthStatus> {
    const startTime = Date.now();
    const services: ServiceHealth[] = [];

    // Проверяем все сервисы
    services.push(await this.checkDatabase());
    services.push(await this.checkKafka());
    services.push(await this.checkExternalServices());
    services.push(await this.checkFileSystem());
    services.push(await this.checkMemory());

    // Определяем общий статус
    const overallStatus = this.determineOverallStatus(services);

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services,
    };

    // Добавляем метрики если запрошены
    if (includeMetrics) {
      try {
        healthStatus.metrics = {
          system: await metricsCollector.getSystemMetrics(),
          performance: metricsCollector.getPerformanceMetrics(),
        };
      } catch (error) {
        mainLogger.error('Ошибка получения метрик для health check', error as Error);
      }
    }

    const totalTime = Date.now() - startTime;
    mainLogger.debug('Health check completed', { duration: totalTime, status: overallStatus });

    return healthStatus;
  }

  // Проверка базы данных
  private async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      await prisma.$runCommandRaw({ ping: 1 });
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'database',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  // Проверка Kafka
  private async checkKafka(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Здесь будет проверка подключения к Kafka
      // Пока возвращаем заглушку
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'kafka',
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      return {
        name: 'kafka',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown Kafka error',
      };
    }
  }

  // Проверка внешних сервисов
  private async checkExternalServices(): Promise<ServiceHealth> {
    const startTime = Date.now();
    const services = [];

    try {
      // Проверяем Telegram API
      if (config.notifications.telegram.botToken) {
        try {
          const response = await fetch(`https://api.telegram.org/bot${config.notifications.telegram.botToken}/getMe`);
          services.push({
            name: 'telegram',
            status: response.ok ? 'healthy' : 'degraded',
          });
        } catch (error) {
          services.push({
            name: 'telegram',
            status: 'unhealthy',
            error: 'Connection failed',
          });
        }
      }

      // Проверяем SMS шлюз
      if (config.notifications.sms.gatewayIp) {
        try {
          // Здесь будет проверка SMS шлюза
          services.push({
            name: 'sms_gateway',
            status: 'healthy',
          });
        } catch (error) {
          services.push({
            name: 'sms_gateway',
            status: 'unhealthy',
            error: 'Connection failed',
          });
        }
      }

      const responseTime = Date.now() - startTime;
      const unhealthyServices = services.filter(s => s.status === 'unhealthy');
      
      return {
        name: 'external_services',
        status: unhealthyServices.length === 0 ? 'healthy' : 
                unhealthyServices.length < services.length ? 'degraded' : 'unhealthy',
        responseTime,
        details: services,
      };
    } catch (error) {
      return {
        name: 'external_services',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown external services error',
      };
    }
  }

  // Проверка файловой системы
  private async checkFileSystem(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Проверяем доступность директории логов
      const logsDir = path.join(process.cwd(), 'logs');
      await fs.access(logsDir).catch(async () => {
        await fs.mkdir(logsDir, { recursive: true });
      });

      // Проверяем возможность записи
      const testFile = path.join(logsDir, 'health-check.tmp');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);

      const responseTime = Date.now() - startTime;
      
      return {
        name: 'filesystem',
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      return {
        name: 'filesystem',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown filesystem error',
      };
    }
  }

  // Проверка памяти
  private async checkMemory(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (memoryUsagePercent > 90) {
        status = 'unhealthy';
      } else if (memoryUsagePercent > 75) {
        status = 'degraded';
      }

      const responseTime = Date.now() - startTime;
      
      return {
        name: 'memory',
        status,
        responseTime,
        details: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          usagePercent: memoryUsagePercent,
        },
      };
    } catch (error) {
      return {
        name: 'memory',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown memory error',
      };
    }
  }

  // Определение общего статуса
  private determineOverallStatus(services: ServiceHealth[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyServices = services.filter(s => s.status === 'unhealthy');
    const degradedServices = services.filter(s => s.status === 'degraded');

    if (unhealthyServices.length > 0) {
      return 'unhealthy';
    }
    
    if (degradedServices.length > 0) {
      return 'degraded';
    }
    
    return 'healthy';
  }
}

// Создаем экземпляр health checker
export const healthChecker = new HealthChecker();

// Express middleware для health check эндпоинтов
export const healthCheckHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const includeMetrics = req.query.metrics === 'true';
    const healthStatus = await healthChecker.getHealthStatus(includeMetrics);
    
    const statusCode = healthStatus.status === 'healthy' ? 200 :
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    mainLogger.error('Health check failed', error as Error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Простой liveness probe
export const livenessHandler = (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
};

// Простой readiness probe
export const readinessHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // Проверяем только критически важные сервисы
    await prisma.$runCommandRaw({ ping: 1 });
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default healthChecker;