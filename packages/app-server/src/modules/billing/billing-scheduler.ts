// Планировщик задач для биллингового движка
import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { BillingEngine } from './billing-engine';
import { config } from '../../config/config';

export class BillingScheduler {
  private prisma: PrismaClient;
  private billingEngine: BillingEngine;
  private isRunning: boolean = false;
  private cronJob?: cron.ScheduledTask;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.billingEngine = new BillingEngine(prisma);
  }

  /**
   * Запуск планировщика
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Планировщик биллинга уже запущен');
      return;
    }

    // Запускаем cron задачу каждый час
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.runBillingCycle();
    }, {
      timezone: 'Europe/Moscow'
    });

    this.isRunning = true;

    console.log('🕐 Планировщик биллинга запущен (каждый час)');

    // Запускаем первый цикл через минуту после старта
    setTimeout(() => {
      this.runBillingCycle();
    }, 60000);
  }

  /**
   * Остановка планировщика
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.destroy();
    }
    this.isRunning = false;
    console.log('🛑 Планировщик биллинга остановлен');
  }

  /**
   * Запуск цикла биллинга
   */
  async runBillingCycle(): Promise<void> {
    try {
      console.log('🔄 Запуск планового цикла биллинга...');
      const startTime = Date.now();
      
      const stats = await this.billingEngine.processBilling();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Цикл биллинга завершен за ${duration}мс:`, stats);

      // Сохраняем статистику в базу данных
      await this.saveBillingStats(stats, duration);

    } catch (error) {
      console.error('❌ Ошибка в цикле биллинга:', error);
      
      // Сохраняем информацию об ошибке
      await this.saveErrorLog(error);
    }
  }

  /**
   * Ручной запуск биллинга
   */
  async runManualBilling(): Promise<void> {
    console.log('🔧 Ручной запуск биллинга...');
    await this.runBillingCycle();
  }

  /**
   * Сохранение статистики биллинга
   */
  private async saveBillingStats(stats: any, duration: number): Promise<void> {
    try {
      // Создаем коллекцию для статистики если её нет
      await this.prisma.$runCommandRaw({
        create: 'billing_stats',
        capped: true,
        size: 10485760, // 10MB
        max: 1000 // Максимум 1000 записей
      }).catch(() => {
        // Коллекция уже существует, игнорируем ошибку
      });

      // Сохраняем статистику
      await this.prisma.$runCommandRaw({
        insert: 'billing_stats',
        documents: [{
          timestamp: new Date(),
          duration,
          stats,
          type: 'scheduled'
        }]
      });

    } catch (error) {
      console.error('❌ Ошибка сохранения статистики биллинга:', error);
    }
  }

  /**
   * Сохранение лога ошибок
   */
  private async saveErrorLog(error: any): Promise<void> {
    try {
      await this.prisma.$runCommandRaw({
        insert: 'billing_errors',
        documents: [{
          timestamp: new Date(),
          error: {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          },
          type: 'billing_cycle_error'
        }]
      });

    } catch (logError) {
      console.error('❌ Ошибка сохранения лога ошибок:', logError);
    }
  }

  /**
   * Получение статуса планировщика
   */
  getStatus(): { isRunning: boolean; nextRun?: Date } {
    return {
      isRunning: this.isRunning,
      nextRun: this.cronJob ? new Date(Date.now() + 60 * 60 * 1000) : undefined // Следующий запуск через час
    };
  }

  /**
   * Получение последней статистики
   */
  async getLastStats(): Promise<any> {
    try {
      const result = await this.prisma.$runCommandRaw({
        find: 'billing_stats',
        sort: { timestamp: -1 },
        limit: 1
      }) as any;

      return result.cursor?.firstBatch?.[0] || null;
    } catch (error) {
      console.error('❌ Ошибка получения статистики:', error);
      return null;
    }
  }

  /**
   * Получение истории ошибок
   */
  async getErrorHistory(limit: number = 10): Promise<any[]> {
    try {
      const result = await this.prisma.$runCommandRaw({
        find: 'billing_errors',
        sort: { timestamp: -1 },
        limit
      }) as any;

      return result.cursor?.firstBatch || [];
    } catch (error) {
      console.error('❌ Ошибка получения истории ошибок:', error);
      return [];
    }
  }
}