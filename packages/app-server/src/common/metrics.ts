// Система метрик для мониторинга
import { mainLogger } from './logger';
import { config } from '../config/config';

// Интерфейсы для метрик
export interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  database: {
    connected: boolean;
    responseTime?: number;
  };
  kafka: {
    connected: boolean;
    responseTime?: number;
  };
  activeConnections: number;
  requestsPerMinute: number;
  errorsPerMinute: number;
}

export interface BusinessMetrics {
  timestamp: string;
  activeClients: number;
  blockedClients: number;
  totalRevenue: number;
  dailyRevenue: number;
  monthlyRevenue: number;
  paymentsToday: number;
  newRequestsToday: number;
  completedRequestsToday: number;
  notificationsSent: number;
  notificationsFailed: number;
}

export interface PerformanceMetrics {
  timestamp: string;
  averageResponseTime: number;
  slowQueries: number;
  errorRate: number;
  throughput: number;
  activeUsers: number;
}

// Класс для сбора и отправки метрик
export class MetricsCollector {
  private requestCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];
  private lastMinuteRequests: { timestamp: number }[] = [];
  private lastMinuteErrors: { timestamp: number }[] = [];

  constructor() {
    // Запускаем периодический сбор метрик
    setInterval(() => {
      this.collectAndSendMetrics();
    }, config.monitoring.healthCheckInterval);

    // Очищаем старые данные каждую минуту
    setInterval(() => {
      this.cleanupOldData();
    }, 60000);
  }

  // Регистрация запроса
  recordRequest(responseTime: number): void {
    this.requestCount++;
    this.responseTimes.push(responseTime);
    this.lastMinuteRequests.push({ timestamp: Date.now() });

    // Ограничиваем размер массива
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-500);
    }
  }

  // Регистрация ошибки
  recordError(): void {
    this.errorCount++;
    this.lastMinuteErrors.push({ timestamp: Date.now() });
  }

  // Получение системных метрик
  async getSystemMetrics(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      },
      cpu: {
        usage: await this.getCpuUsage(),
      },
      database: await this.checkDatabaseHealth(),
      kafka: await this.checkKafkaHealth(),
      activeConnections: this.getActiveConnections(),
      requestsPerMinute: this.getRequestsPerMinute(),
      errorsPerMinute: this.getErrorsPerMinute(),
    };
  }

  // Получение бизнес-метрик
  async getBusinessMetrics(): Promise<BusinessMetrics> {
    // Здесь будет интеграция с базой данных для получения бизнес-метрик
    // Пока возвращаем заглушку
    return {
      timestamp: new Date().toISOString(),
      activeClients: 0,
      blockedClients: 0,
      totalRevenue: 0,
      dailyRevenue: 0,
      monthlyRevenue: 0,
      paymentsToday: 0,
      newRequestsToday: 0,
      completedRequestsToday: 0,
      notificationsSent: 0,
      notificationsFailed: 0,
    };
  }

  // Получение метрик производительности
  getPerformanceMetrics(): PerformanceMetrics {
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    const errorRate = this.requestCount > 0
      ? (this.errorCount / this.requestCount) * 100
      : 0;

    return {
      timestamp: new Date().toISOString(),
      averageResponseTime: avgResponseTime,
      slowQueries: this.responseTimes.filter(time => time > 1000).length,
      errorRate,
      throughput: this.getRequestsPerMinute(),
      activeUsers: this.getActiveConnections(),
    };
  }

  // Отправка метрик в Zabbix
  async sendToZabbix(metrics: any): Promise<void> {
    try {
      // Здесь будет интеграция с Zabbix API
      // Пока просто логируем метрики
      mainLogger.logMetrics(metrics);
    } catch (error) {
      mainLogger.error('Ошибка отправки метрик в Zabbix', error as Error);
    }
  }

  // Приватные методы
  private async getCpuUsage(): Promise<number> {
    // Простая реализация получения CPU usage
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 100));
    const endUsage = process.cpuUsage(startUsage);
    
    const totalUsage = endUsage.user + endUsage.system;
    return totalUsage / 1000000; // Конвертируем в проценты
  }

  private async checkDatabaseHealth(): Promise<{ connected: boolean; responseTime?: number }> {
    try {
      const start = Date.now();
      // Здесь будет проверка подключения к базе данных
      const responseTime = Date.now() - start;
      return { connected: true, responseTime };
    } catch (error) {
      return { connected: false };
    }
  }

  private async checkKafkaHealth(): Promise<{ connected: boolean; responseTime?: number }> {
    try {
      const start = Date.now();
      // Здесь будет проверка подключения к Kafka
      const responseTime = Date.now() - start;
      return { connected: true, responseTime };
    } catch (error) {
      return { connected: false };
    }
  }

  private getActiveConnections(): number {
    // Здесь будет подсчет активных соединений
    return 0;
  }

  private getRequestsPerMinute(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    return this.lastMinuteRequests.filter(req => req.timestamp > oneMinuteAgo).length;
  }

  private getErrorsPerMinute(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    return this.lastMinuteErrors.filter(err => err.timestamp > oneMinuteAgo).length;
  }

  private cleanupOldData(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    this.lastMinuteRequests = this.lastMinuteRequests.filter(req => req.timestamp > oneMinuteAgo);
    this.lastMinuteErrors = this.lastMinuteErrors.filter(err => err.timestamp > oneMinuteAgo);
  }

  private async collectAndSendMetrics(): Promise<void> {
    try {
      const systemMetrics = await this.getSystemMetrics();
      const businessMetrics = await this.getBusinessMetrics();
      const performanceMetrics = this.getPerformanceMetrics();

      const allMetrics = {
        system: systemMetrics,
        business: businessMetrics,
        performance: performanceMetrics,
      };

      await this.sendToZabbix(allMetrics);
    } catch (error) {
      mainLogger.error('Ошибка сбора метрик', error as Error);
    }
  }
}

// Создаем глобальный экземпляр коллектора метрик
export const metricsCollector = new MetricsCollector();

export default metricsCollector;