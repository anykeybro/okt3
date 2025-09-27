// Сервис мониторинга и интеграции с Zabbix
import { PrismaClient } from '@prisma/client';
import { mainLogger } from '../../common/logger';
import { metricsCollector, SystemMetrics, BusinessMetrics } from '../../common/metrics';
import { healthChecker } from '../../common/health';
import { config } from '../../config/config';

export interface ZabbixItem {
  key: string;
  value: number | string;
  timestamp?: number;
}

export interface MonitoringData {
  systemMetrics: SystemMetrics;
  businessMetrics: BusinessMetrics;
  healthStatus: any;
  customMetrics: Record<string, number>;
}

export class MonitoringService {
  constructor(private prisma: PrismaClient) {}

  // Получение всех метрик для мониторинга
  async getAllMetrics(): Promise<MonitoringData> {
    try {
      const [systemMetrics, businessMetrics, healthStatus] = await Promise.all([
        metricsCollector.getSystemMetrics(),
        this.getBusinessMetrics(),
        healthChecker.getHealthStatus(false),
      ]);

      const customMetrics = await this.getCustomMetrics();

      return {
        systemMetrics,
        businessMetrics,
        healthStatus,
        customMetrics,
      };
    } catch (error) {
      mainLogger.error('Ошибка получения метрик мониторинга', error as Error);
      throw error;
    }
  }

  // Получение бизнес-метрик из базы данных
  async getBusinessMetrics(): Promise<BusinessMetrics> {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Параллельно выполняем все запросы
      const [
        activeClientsCount,
        blockedClientsCount,
        totalRevenue,
        dailyRevenue,
        monthlyRevenue,
        paymentsToday,
        newRequestsToday,
        completedRequestsToday,
        notificationStats,
      ] = await Promise.all([
        // Активные клиенты
        this.prisma.account.count({
          where: { status: 'ACTIVE' },
        }),

        // Заблокированные клиенты
        this.prisma.account.count({
          where: { status: 'BLOCKED' },
        }),

        // Общая выручка
        this.prisma.payment.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { amount: true },
        }),

        // Выручка за сегодня
        this.prisma.payment.aggregate({
          where: {
            status: 'COMPLETED',
            processedAt: { gte: todayStart },
          },
          _sum: { amount: true },
        }),

        // Выручка за месяц
        this.prisma.payment.aggregate({
          where: {
            status: 'COMPLETED',
            processedAt: { gte: monthStart },
          },
          _sum: { amount: true },
        }),

        // Платежи за сегодня
        this.prisma.payment.count({
          where: {
            status: 'COMPLETED',
            processedAt: { gte: todayStart },
          },
        }),

        // Новые заявки за сегодня
        this.prisma.request.count({
          where: {
            createdAt: { gte: todayStart },
          },
        }),

        // Выполненные заявки за сегодня
        this.prisma.request.count({
          where: {
            status: 'COMPLETED',
            updatedAt: { gte: todayStart },
          },
        }),

        // Статистика уведомлений за сегодня
        this.prisma.notification.groupBy({
          by: ['status'],
          where: {
            createdAt: { gte: todayStart },
          },
          _count: true,
        }),
      ]);

      // Обрабатываем статистику уведомлений
      const notificationsSent = notificationStats
        .filter(stat => stat.status === 'SENT')
        .reduce((sum, stat) => sum + stat._count, 0);

      const notificationsFailed = notificationStats
        .filter(stat => stat.status === 'FAILED')
        .reduce((sum, stat) => sum + stat._count, 0);

      return {
        timestamp: new Date().toISOString(),
        activeClients: activeClientsCount,
        blockedClients: blockedClientsCount,
        totalRevenue: totalRevenue._sum?.amount || 0,
        dailyRevenue: dailyRevenue._sum?.amount || 0,
        monthlyRevenue: monthlyRevenue._sum?.amount || 0,
        paymentsToday,
        newRequestsToday,
        completedRequestsToday,
        notificationsSent,
        notificationsFailed,
      };
    } catch (error) {
      mainLogger.error('Ошибка получения бизнес-метрик', error as Error);
      throw error;
    }
  }

  // Получение кастомных метрик
  async getCustomMetrics(): Promise<Record<string, number>> {
    try {
      const metrics: Record<string, number> = {};

      // Средний баланс активных клиентов
      const avgBalance = await this.prisma.account.aggregate({
        where: { status: 'ACTIVE' },
        _avg: { balance: true },
      });
      metrics.averageBalance = avgBalance._avg?.balance || 0;

      // Количество клиентов с низким балансом
      const lowBalanceCount = await this.prisma.account.count({
        where: {
          status: 'ACTIVE',
          balance: { lt: config.dashboard.lowBalanceThreshold },
        },
      });
      metrics.lowBalanceClients = lowBalanceCount;

      // Количество устройств онлайн
      const onlineDevices = await this.prisma.device.count({
        where: { status: 'ONLINE' },
      });
      metrics.onlineDevices = onlineDevices;

      // Количество активных тарифов
      const activeTariffs = await this.prisma.tariff.count({
        where: { isActive: true },
      });
      metrics.activeTariffs = activeTariffs;

      // Средняя стоимость тарифа
      const avgTariffPrice = await this.prisma.tariff.aggregate({
        where: { isActive: true },
        _avg: { price: true },
      });
      metrics.averageTariffPrice = avgTariffPrice._avg?.price || 0;

      return metrics;
    } catch (error) {
      mainLogger.error('Ошибка получения кастомных метрик', error as Error);
      return {};
    }
  }

  // Отправка метрик в Zabbix
  async sendToZabbix(metrics: MonitoringData): Promise<void> {
    try {
      const zabbixItems: ZabbixItem[] = [];

      // Системные метрики
      zabbixItems.push(
        { key: 'system.uptime', value: metrics.systemMetrics.uptime },
        { key: 'system.memory.used', value: metrics.systemMetrics.memory.used },
        { key: 'system.memory.percentage', value: metrics.systemMetrics.memory.percentage },
        { key: 'system.cpu.usage', value: metrics.systemMetrics.cpu.usage },
        { key: 'system.requests_per_minute', value: metrics.systemMetrics.requestsPerMinute },
        { key: 'system.errors_per_minute', value: metrics.systemMetrics.errorsPerMinute }
      );

      // Бизнес-метрики
      zabbixItems.push(
        { key: 'business.active_clients', value: metrics.businessMetrics.activeClients },
        { key: 'business.blocked_clients', value: metrics.businessMetrics.blockedClients },
        { key: 'business.daily_revenue', value: metrics.businessMetrics.dailyRevenue },
        { key: 'business.monthly_revenue', value: metrics.businessMetrics.monthlyRevenue },
        { key: 'business.payments_today', value: metrics.businessMetrics.paymentsToday },
        { key: 'business.new_requests_today', value: metrics.businessMetrics.newRequestsToday },
        { key: 'business.notifications_sent', value: metrics.businessMetrics.notificationsSent },
        { key: 'business.notifications_failed', value: metrics.businessMetrics.notificationsFailed }
      );

      // Кастомные метрики
      Object.entries(metrics.customMetrics).forEach(([key, value]) => {
        zabbixItems.push({ key: `custom.${key}`, value });
      });

      // Статус сервисов
      const healthyServices = metrics.healthStatus.services.filter((s: any) => s.status === 'healthy').length;
      const totalServices = metrics.healthStatus.services.length;
      zabbixItems.push(
        { key: 'health.services_healthy', value: healthyServices },
        { key: 'health.services_total', value: totalServices },
        { key: 'health.overall_status', value: metrics.healthStatus.status === 'healthy' ? 1 : 0 }
      );

      // Отправляем в Zabbix (здесь будет реальная интеграция)
      await this.sendZabbixData(zabbixItems);

      mainLogger.info('Метрики отправлены в Zabbix', {
        itemsCount: zabbixItems.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      mainLogger.error('Ошибка отправки метрик в Zabbix', error as Error);
    }
  }

  // Отправка данных в Zabbix (заглушка для реальной интеграции)
  private async sendZabbixData(items: ZabbixItem[]): Promise<void> {
    try {
      // Здесь будет реальная интеграция с Zabbix Sender API
      // Пока просто логируем данные
      mainLogger.debug('Zabbix data prepared', { items });

      // Пример интеграции с Zabbix Sender:
      // const zabbixSender = new ZabbixSender({
      //   host: config.monitoring.zabbixUrl,
      //   port: 10051,
      // });
      // 
      // await zabbixSender.send(items);
    } catch (error) {
      mainLogger.error('Ошибка отправки данных в Zabbix', error as Error);
      throw error;
    }
  }

  // Получение алертов и предупреждений
  async getAlerts(): Promise<any[]> {
    try {
      const alerts = [];

      // Проверяем критические метрики
      const metrics = await this.getAllMetrics();

      // Высокое использование памяти
      if (metrics.systemMetrics.memory.percentage > 90) {
        alerts.push({
          type: 'critical',
          message: 'Высокое использование памяти',
          value: `${metrics.systemMetrics.memory.percentage.toFixed(1)}%`,
          threshold: '90%',
        });
      }

      // Много ошибок
      if (metrics.systemMetrics.errorsPerMinute > 10) {
        alerts.push({
          type: 'warning',
          message: 'Высокий уровень ошибок',
          value: metrics.systemMetrics.errorsPerMinute,
          threshold: '10 ошибок/мин',
        });
      }

      // Много заблокированных клиентов
      const blockedPercentage = (metrics.businessMetrics.blockedClients / 
        (metrics.businessMetrics.activeClients + metrics.businessMetrics.blockedClients)) * 100;
      
      if (blockedPercentage > 20) {
        alerts.push({
          type: 'warning',
          message: 'Высокий процент заблокированных клиентов',
          value: `${blockedPercentage.toFixed(1)}%`,
          threshold: '20%',
        });
      }

      // Низкая выручка
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Здесь можно добавить сравнение с предыдущими днями
      
      return alerts;
    } catch (error) {
      mainLogger.error('Ошибка получения алертов', error as Error);
      return [];
    }
  }

  // Запуск периодического мониторинга
  startPeriodicMonitoring(): void {
    const interval = config.monitoring.healthCheckInterval;
    
    setInterval(async () => {
      try {
        const metrics = await this.getAllMetrics();
        await this.sendToZabbix(metrics);
      } catch (error) {
        mainLogger.error('Ошибка периодического мониторинга', error as Error);
      }
    }, interval);

    mainLogger.info('Периодический мониторинг запущен', { interval });
  }
}

export default MonitoringService;