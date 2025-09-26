// Сервис для получения аналитических данных dashboard
import { PrismaClient } from '@prisma/client';
import { 
  DashboardStats, 
  PaymentStats, 
  DashboardClientStats, 
  RequestStats, 
  TariffStats, 
  DashboardDeviceStats, 
  RecentActivity, 
  DashboardFilters,
  ChartData,
  TopClientsData,
  LowBalanceClients
} from './types';
import { CacheService } from './cache.service';
import { config } from '../../config/config';

export class DashboardService {
  private prisma: PrismaClient;
  private cacheService: CacheService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.cacheService = new CacheService();
  }

  // Получение основных метрик dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const cacheKey = 'dashboard:stats';
    const cached = await this.cacheService.get<DashboardStats>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Параллельное выполнение запросов для производительности
    const [
      clientsStats,
      paymentsStats,
      requestsStats,
      devicesStats,
      notificationsStats,
      totalRevenue,
      averageBalance
    ] = await Promise.all([
      // Статистика по клиентам
      this.prisma.account.groupBy({
        by: ['status'],
        _count: true,
      }),
      
      // Статистика по платежам
      Promise.all([
        this.prisma.payment.count({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: todayStart }
          }
        }),
        this.prisma.payment.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: todayStart }
          },
          _sum: { amount: true }
        }),
        this.prisma.payment.count({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: monthStart }
          }
        }),
        this.prisma.payment.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: monthStart }
          },
          _sum: { amount: true }
        })
      ]),
      
      // Статистика по заявкам
      Promise.all([
        this.prisma.request.count({ where: { status: 'NEW' } }),
        this.prisma.request.count({ where: { status: 'IN_PROGRESS' } }),
        this.prisma.request.count({
          where: {
            status: 'COMPLETED',
            updatedAt: { gte: todayStart }
          }
        }),
        this.prisma.request.count()
      ]),
      
      // Статистика по устройствам
      this.prisma.device.groupBy({
        by: ['status'],
        _count: true,
      }),
      
      // Статистика по уведомлениям
      Promise.all([
        this.prisma.notification.count({ where: { status: 'PENDING' } }),
        this.prisma.notification.count({
          where: {
            status: 'SENT',
            sentAt: { gte: todayStart }
          }
        }),
        this.prisma.notification.count({
          where: {
            status: 'FAILED',
            createdAt: { gte: todayStart }
          }
        })
      ]),
      
      // Общая выручка
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true }
      }),
      
      // Средний баланс
      this.prisma.account.aggregate({
        _avg: { balance: true }
      })
    ]);

    // Обработка статистики клиентов
    const clientsMap = clientsStats.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // Обработка статистики устройств
    const devicesMap = devicesStats.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const stats: DashboardStats = {
      // Клиенты
      activeClients: clientsMap.ACTIVE || 0,
      blockedClients: clientsMap.BLOCKED || 0,
      suspendedClients: clientsMap.SUSPENDED || 0,
      totalClients: Object.values(clientsMap).reduce((sum, count) => sum + count, 0),
      
      // Платежи
      todayPayments: paymentsStats[0],
      todayPaymentsAmount: paymentsStats[1]._sum.amount || 0,
      monthlyPayments: paymentsStats[2],
      monthlyPaymentsAmount: paymentsStats[3]._sum.amount || 0,
      totalRevenue: totalRevenue._sum.amount || 0,
      averageBalance: averageBalance._avg.balance || 0,
      
      // Заявки
      newRequests: requestsStats[0],
      inProgressRequests: requestsStats[1],
      completedRequestsToday: requestsStats[2],
      totalRequests: requestsStats[3],
      
      // Устройства
      onlineDevices: devicesMap.ONLINE || 0,
      offlineDevices: devicesMap.OFFLINE || 0,
      errorDevices: devicesMap.ERROR || 0,
      totalDevices: Object.values(devicesMap).reduce((sum, count) => sum + count, 0),
      
      // Уведомления
      pendingNotifications: notificationsStats[0],
      sentNotificationsToday: notificationsStats[1],
      failedNotificationsToday: notificationsStats[2]
    };

    // Кешируем на 5 минут
    await this.cacheService.set(cacheKey, stats, 300);
    
    return stats;
  }

  // Получение статистики платежей по дням
  async getPaymentStats(filters: DashboardFilters): Promise<PaymentStats[]> {
    const { dateFrom, dateTo } = this.getDateRange(filters);
    const cacheKey = `dashboard:payments:${dateFrom.toISOString()}:${dateTo.toISOString()}`;
    
    const cached = await this.cacheService.get<PaymentStats[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: dateFrom,
          lte: dateTo
        }
      },
      select: {
        amount: true,
        createdAt: true
      }
    });

    // Группировка по дням
    const statsMap = new Map<string, { amount: number; count: number }>();
    
    payments.forEach(payment => {
      const date = payment.createdAt.toISOString().split('T')[0];
      const existing = statsMap.get(date) || { amount: 0, count: 0 };
      existing.amount += payment.amount;
      existing.count += 1;
      statsMap.set(date, existing);
    });

    const stats = Array.from(statsMap.entries()).map(([date, data]) => ({
      date,
      amount: data.amount,
      count: data.count
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Кешируем на 10 минут
    await this.cacheService.set(cacheKey, stats, 600);
    
    return stats;
  }

  // Получение статистики клиентов по дням
  async getClientStats(filters: DashboardFilters): Promise<DashboardClientStats[]> {
    const { dateFrom, dateTo } = this.getDateRange(filters);
    const cacheKey = `dashboard:clients:${dateFrom.toISOString()}:${dateTo.toISOString()}`;
    
    const cached = await this.cacheService.get<DashboardClientStats[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Получаем данные по дням
    const accounts = await this.prisma.account.findMany({
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateTo
        }
      },
      select: {
        status: true,
        createdAt: true
      }
    });

    // Группировка по дням и статусам
    const statsMap = new Map<string, { active: number; blocked: number; new: number }>();
    
    accounts.forEach(account => {
      const date = account.createdAt.toISOString().split('T')[0];
      const existing = statsMap.get(date) || { active: 0, blocked: 0, new: 0 };
      
      existing.new += 1;
      if (account.status === 'ACTIVE') existing.active += 1;
      if (account.status === 'BLOCKED') existing.blocked += 1;
      
      statsMap.set(date, existing);
    });

    const stats = Array.from(statsMap.entries()).map(([date, data]) => ({
      date,
      ...data
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Кешируем на 10 минут
    await this.cacheService.set(cacheKey, stats, 600);
    
    return stats;
  }

  // Получение статистики заявок
  async getRequestStats(filters: DashboardFilters): Promise<RequestStats[]> {
    const { dateFrom, dateTo } = this.getDateRange(filters);
    const cacheKey = `dashboard:requests:${dateFrom.toISOString()}:${dateTo.toISOString()}`;
    
    const cached = await this.cacheService.get<RequestStats[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const requests = await this.prisma.request.findMany({
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateTo
        }
      },
      select: {
        status: true,
        createdAt: true
      }
    });

    // Группировка по дням и статусам
    const statsMap = new Map<string, { new: number; inProgress: number; completed: number; cancelled: number }>();
    
    requests.forEach(request => {
      const date = request.createdAt.toISOString().split('T')[0];
      const existing = statsMap.get(date) || { new: 0, inProgress: 0, completed: 0, cancelled: 0 };
      
      switch (request.status) {
        case 'NEW':
          existing.new += 1;
          break;
        case 'IN_PROGRESS':
          existing.inProgress += 1;
          break;
        case 'COMPLETED':
          existing.completed += 1;
          break;
        case 'CANCELLED':
          existing.cancelled += 1;
          break;
      }
      
      statsMap.set(date, existing);
    });

    const stats = Array.from(statsMap.entries()).map(([date, data]) => ({
      date,
      ...data
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Кешируем на 10 минут
    await this.cacheService.set(cacheKey, stats, 600);
    
    return stats;
  }

  // Получение статистики по тарифам
  async getTariffStats(): Promise<TariffStats[]> {
    const cacheKey = 'dashboard:tariffs';
    const cached = await this.cacheService.get<TariffStats[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const tariffStats = await this.prisma.tariff.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        accounts: {
          select: {
            balance: true,
            payments: {
              where: { status: 'COMPLETED' },
              select: { amount: true }
            }
          }
        }
      }
    });

    const stats = tariffStats.map(tariff => {
      const clientsCount = tariff.accounts.length;
      const totalRevenue = tariff.accounts.reduce((sum, account) => {
        return sum + account.payments.reduce((paySum, payment) => paySum + payment.amount, 0);
      }, 0);
      const averageBalance = clientsCount > 0 
        ? tariff.accounts.reduce((sum, account) => sum + account.balance, 0) / clientsCount 
        : 0;

      return {
        tariffId: tariff.id,
        tariffName: tariff.name,
        clientsCount,
        revenue: totalRevenue,
        averageBalance
      };
    });

    // Кешируем на 15 минут
    await this.cacheService.set(cacheKey, stats, 900);
    
    return stats;
  }

  // Получение статистики по устройствам
  async getDeviceStats(): Promise<DashboardDeviceStats[]> {
    const cacheKey = 'dashboard:devices';
    const cached = await this.cacheService.get<DashboardDeviceStats[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const devices = await this.prisma.device.findMany({
      select: {
        id: true,
        description: true,
        ipAddress: true,
        status: true,
        lastCheck: true,
        accounts: {
          select: { id: true }
        }
      }
    });

    const stats = devices.map(device => ({
      deviceId: device.id,
      deviceDescription: device.description || 'Без описания',
      ipAddress: device.ipAddress,
      status: device.status,
      clientsCount: device.accounts.length,
      lastCheck: device.lastCheck
    }));

    // Кешируем на 5 минут
    await this.cacheService.set(cacheKey, stats, 300);
    
    return stats;
  }

  // Получение последней активности
  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    const cacheKey = `dashboard:activity:${limit}`;
    const cached = await this.cacheService.get<RecentActivity[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Получаем последние платежи
    const recentPayments = await this.prisma.payment.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: { status: 'COMPLETED' },
      include: {
        account: {
          include: {
            client: true
          }
        }
      }
    });

    // Получаем последние заявки
    const recentRequests = await this.prisma.request.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        client: true
      }
    });

    // Объединяем и сортируем по времени
    const activities: RecentActivity[] = [];

    recentPayments.forEach(payment => {
      activities.push({
        id: payment.id,
        type: 'payment',
        description: `Платеж от ${payment.account.client.firstName} ${payment.account.client.lastName}`,
        amount: payment.amount,
        clientName: `${payment.account.client.firstName} ${payment.account.client.lastName}`,
        timestamp: payment.createdAt
      });
    });

    recentRequests.forEach(request => {
      activities.push({
        id: request.id,
        type: 'request',
        description: `Новая заявка от ${request.firstName} ${request.lastName}`,
        clientName: `${request.firstName} ${request.lastName}`,
        timestamp: request.createdAt
      });
    });

    // Сортируем по времени и берем нужное количество
    const sortedActivities = activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);

    // Кешируем на 2 минуты
    await this.cacheService.set(cacheKey, sortedActivities, 120);
    
    return sortedActivities;
  }

  // Получение топ клиентов по платежам
  async getTopClients(limit: number = 10): Promise<TopClientsData[]> {
    const cacheKey = `dashboard:top-clients:${limit}`;
    const cached = await this.cacheService.get<TopClientsData[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const topClients = await this.prisma.account.findMany({
      include: {
        client: true,
        payments: {
          where: { status: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // Вычисляем общую сумму платежей для каждого клиента
    const clientsWithPayments = await Promise.all(
      topClients.map(async (account) => {
        const totalPayments = await this.prisma.payment.aggregate({
          where: {
            accountId: account.id,
            status: 'COMPLETED'
          },
          _sum: { amount: true }
        });

        return {
          clientId: account.client.id,
          clientName: `${account.client.firstName} ${account.client.lastName}`,
          accountNumber: account.accountNumber,
          balance: account.balance,
          totalPayments: totalPayments._sum.amount || 0,
          lastPayment: account.payments[0]?.createdAt || null
        };
      })
    );

    // Сортируем по общей сумме платежей
    const sortedClients = clientsWithPayments
      .sort((a, b) => b.totalPayments - a.totalPayments)
      .slice(0, limit);

    // Кешируем на 15 минут
    await this.cacheService.set(cacheKey, sortedClients, 900);
    
    return sortedClients;
  }

  // Получение клиентов с низким балансом
  async getLowBalanceClients(limit: number = 10): Promise<LowBalanceClients[]> {
    const cacheKey = `dashboard:low-balance:${limit}`;
    const cached = await this.cacheService.get<LowBalanceClients[]>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const lowBalanceAccounts = await this.prisma.account.findMany({
      where: {
        status: 'ACTIVE',
        balance: { lt: config.dashboard.lowBalanceThreshold }
      },
      include: {
        client: true,
        tariff: true
      },
      orderBy: { balance: 'asc' },
      take: limit
    });

    const clients = lowBalanceAccounts.map(account => {
      const daysLeft = account.tariff.billingType === 'PREPAID_MONTHLY' 
        ? Math.floor(account.balance / (account.tariff.price / 30))
        : Math.floor(account.balance / (account.tariff.price / 24)); // Для почасовой тарификации

      return {
        clientId: account.client.id,
        clientName: `${account.client.firstName} ${account.client.lastName}`,
        accountNumber: account.accountNumber,
        balance: account.balance,
        tariffPrice: account.tariff.price,
        daysLeft: Math.max(0, daysLeft),
        phone: account.client.phones[0] || 'Не указан'
      };
    });

    // Кешируем на 5 минут
    await this.cacheService.set(cacheKey, clients, 300);
    
    return clients;
  }

  // Генерация данных для графиков
  async getChartData(type: 'payments' | 'clients' | 'requests', filters: DashboardFilters): Promise<ChartData> {
    switch (type) {
      case 'payments':
        const paymentStats = await this.getPaymentStats(filters);
        return {
          labels: paymentStats.map(stat => stat.date),
          datasets: [
            {
              label: 'Сумма платежей',
              data: paymentStats.map(stat => stat.amount),
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 2
            },
            {
              label: 'Количество платежей',
              data: paymentStats.map(stat => stat.count),
              backgroundColor: 'rgba(255, 99, 132, 0.2)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 2
            }
          ]
        };

      case 'clients':
        const clientStats = await this.getClientStats(filters);
        return {
          labels: clientStats.map(stat => stat.date),
          datasets: [
            {
              label: 'Активные',
              data: clientStats.map(stat => stat.active),
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 2
            },
            {
              label: 'Заблокированные',
              data: clientStats.map(stat => stat.blocked),
              backgroundColor: 'rgba(255, 206, 86, 0.2)',
              borderColor: 'rgba(255, 206, 86, 1)',
              borderWidth: 2
            }
          ]
        };

      case 'requests':
        const requestStats = await this.getRequestStats(filters);
        return {
          labels: requestStats.map(stat => stat.date),
          datasets: [
            {
              label: 'Новые',
              data: requestStats.map(stat => stat.new),
              backgroundColor: 'rgba(153, 102, 255, 0.2)',
              borderColor: 'rgba(153, 102, 255, 1)',
              borderWidth: 2
            },
            {
              label: 'Выполненные',
              data: requestStats.map(stat => stat.completed),
              backgroundColor: 'rgba(255, 159, 64, 0.2)',
              borderColor: 'rgba(255, 159, 64, 1)',
              borderWidth: 2
            }
          ]
        };

      default:
        throw new Error(`Неподдерживаемый тип графика: ${type}`);
    }
  }

  // Очистка кеша
  async clearCache(): Promise<void> {
    await this.cacheService.clear();
  }

  // Вспомогательный метод для определения диапазона дат
  private getDateRange(filters: DashboardFilters): { dateFrom: Date; dateTo: Date } {
    const now = new Date();
    let dateFrom: Date;
    let dateTo: Date = filters.dateTo || now;

    if (filters.dateFrom && filters.dateTo) {
      dateFrom = filters.dateFrom;
    } else {
      switch (filters.period) {
        case 'today':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          dateFrom = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 дней назад
      }
    }

    return { dateFrom, dateTo };
  }
}