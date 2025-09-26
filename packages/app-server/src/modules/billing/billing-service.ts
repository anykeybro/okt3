// Сервис для работы с биллингом
import { PrismaClient } from '@prisma/client';
import { BillingEngine } from './billing-engine';
import { BillingScheduler } from './billing-scheduler';
import { BillingStats, BillingResult } from './types';

export class BillingService {
  private prisma: PrismaClient;
  private billingEngine: BillingEngine;
  private scheduler: BillingScheduler;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.billingEngine = new BillingEngine(prisma);
    this.scheduler = new BillingScheduler(prisma);
  }

  /**
   * Запуск планировщика биллинга
   */
  startScheduler(): void {
    this.scheduler.start();
  }

  /**
   * Остановка планировщика биллинга
   */
  stopScheduler(): void {
    this.scheduler.stop();
  }

  /**
   * Ручной запуск биллинга
   */
  async runManualBilling(): Promise<BillingStats> {
    return await this.billingEngine.processBilling();
  }

  /**
   * Обработка пополнения баланса (проверка на разблокировку)
   */
  async handleBalanceTopUp(accountId: string): Promise<BillingResult | null> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      throw new Error('Аккаунт не найден');
    }

    // Если аккаунт заблокирован, пытаемся разблокировать
    if (account.status === 'BLOCKED') {
      return await this.billingEngine.unblockAccount(accountId);
    }

    return null;
  }

  /**
   * Получение информации о следующем списании для аккаунта
   */
  async getNextChargeInfo(accountId: string): Promise<{
    nextChargeDate: Date | null;
    nextChargeAmount: number;
    daysUntilCharge: number | null;
  }> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        tariff: true,
        payments: {
          where: {
            amount: { lt: 0 } // Только списания
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (!account) {
      throw new Error('Аккаунт не найден');
    }

    let nextChargeDate: Date | null = null;
    let daysUntilCharge: number | null = null;
    const nextChargeAmount = account.tariff.price;

    if (account.tariff.billingType === 'PREPAID_MONTHLY') {
      const lastCharge = account.payments[0]?.createdAt;
      
      if (lastCharge) {
        nextChargeDate = new Date(lastCharge);
        nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
      } else {
        // Если списаний не было, следующее списание - сейчас
        nextChargeDate = new Date();
      }

      const now = new Date();
      daysUntilCharge = Math.ceil((nextChargeDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysUntilCharge < 0) {
        daysUntilCharge = 0; // Просрочено
      }
    }
    // Для почасовой тарификации следующее списание всегда через час

    return {
      nextChargeDate,
      nextChargeAmount,
      daysUntilCharge
    };
  }

  /**
   * Получение статистики биллинга
   */
  async getBillingStatistics(days: number = 30): Promise<{
    totalCharges: number;
    totalAmount: number;
    blockedAccounts: number;
    averageBalance: number;
    recentActivity: any[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Получаем статистику списаний
    const charges = await this.prisma.payment.findMany({
      where: {
        amount: { lt: 0 }, // Только списания
        createdAt: { gte: startDate }
      }
    });

    // Получаем количество заблокированных аккаунтов
    const blockedCount = await this.prisma.account.count({
      where: {
        status: 'BLOCKED'
      }
    });

    // Получаем средний баланс
    const accounts = await this.prisma.account.findMany({
      select: {
        balance: true
      }
    });

    const averageBalance = accounts.length > 0 
      ? accounts.reduce((sum, acc) => sum + acc.balance, 0) / accounts.length 
      : 0;

    // Получаем последнюю активность
    const recentActivity = await this.scheduler.getLastStats();

    return {
      totalCharges: charges.length,
      totalAmount: Math.abs(charges.reduce((sum, charge) => sum + charge.amount, 0)),
      blockedAccounts: blockedCount,
      averageBalance: Math.round(averageBalance * 100) / 100,
      recentActivity: recentActivity ? [recentActivity] : []
    };
  }

  /**
   * Получение статуса планировщика
   */
  getSchedulerStatus(): { isRunning: boolean; nextRun?: Date } {
    return this.scheduler.getStatus();
  }

  /**
   * Получение истории ошибок биллинга
   */
  async getBillingErrors(limit: number = 10): Promise<any[]> {
    return await this.scheduler.getErrorHistory(limit);
  }

  /**
   * Проверка аккаунтов на необходимость уведомлений
   */
  async checkLowBalanceAccounts(): Promise<{
    accountId: string;
    accountNumber: string;
    balance: number;
    clientName: string;
    threshold: number;
  }[]> {
    const accounts = await this.prisma.account.findMany({
      where: {
        status: 'ACTIVE'
      },
      include: {
        client: true,
        tariff: true
      }
    });

    const lowBalanceAccounts = accounts.filter(account => {
      // Проверяем если баланс меньше стоимости тарифа или порога блокировки
      const threshold = Math.max(account.tariff.price, account.blockThreshold);
      return account.balance <= threshold;
    });

    return lowBalanceAccounts.map(account => ({
      accountId: account.id,
      accountNumber: account.accountNumber,
      balance: account.balance,
      clientName: `${account.client.firstName} ${account.client.lastName}`,
      threshold: Math.max(account.tariff.price, account.blockThreshold)
    }));
  }

  /**
   * Тестовый запуск биллинга (без реальных изменений)
   */
  async testBilling(): Promise<BillingStats> {
    const testEngine = new BillingEngine(this.prisma, { dryRun: true });
    return await testEngine.processBilling();
  }
}