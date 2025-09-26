// Основной биллинговый движок
import { PrismaClient, AccountStatus, BillingType } from '@prisma/client';
import { config } from '../../config/config';
import { 
  BillingResult, 
  BillingStats, 
  AccountBillingInfo, 
  BillingEngineConfig,
  ChargeCalculation 
} from './types';

export class BillingEngine {
  private prisma: PrismaClient;
  private config: BillingEngineConfig;

  constructor(prisma: PrismaClient, engineConfig?: Partial<BillingEngineConfig>) {
    this.prisma = prisma;
    this.config = {
      hourlyCheckInterval: config.billing.hourlyCheckInterval,
      notificationThresholds: config.billing.notificationThresholds,
      autoBlockEnabled: config.billing.autoBlockEnabled,
      defaultBlockThreshold: config.billing.defaultBlockThreshold,
      ...engineConfig
    };
  }

  /**
   * Основной метод для обработки биллинга всех активных аккаунтов
   */
  async processBilling(): Promise<BillingStats> {
    console.log('🔄 Запуск биллингового цикла...');
    
    const stats: BillingStats = {
      totalProcessed: 0,
      successfulCharges: 0,
      failedCharges: 0,
      blockedAccounts: 0,
      notificationsSent: 0,
      totalAmount: 0
    };

    try {
      // Получаем все активные аккаунты с тарифами
      const accounts = await this.getActiveAccounts();
      stats.totalProcessed = accounts.length;

      console.log(`📊 Найдено ${accounts.length} активных аккаунтов для обработки`);

      // Обрабатываем каждый аккаунт
      for (const account of accounts) {
        try {
          const result = await this.processAccount(account);
          this.updateStats(stats, result);
        } catch (error) {
          console.error(`❌ Ошибка обработки аккаунта ${account.accountNumber}:`, error);
          stats.failedCharges++;
        }
      }

      console.log('✅ Биллинговый цикл завершен:', stats);
      return stats;

    } catch (error) {
      console.error('❌ Критическая ошибка в биллинговом движке:', error);
      throw error;
    }
  }

  /**
   * Обработка отдельного аккаунта
   */
  async processAccount(account: AccountBillingInfo): Promise<BillingResult[]> {
    const results: BillingResult[] = [];

    try {
      // Рассчитываем что нужно списать
      const calculation = await this.calculateCharge(account);
      
      if (calculation.shouldCharge && !this.config.dryRun) {
        // Списываем средства
        const chargeResult = await this.chargeAccount(account, calculation.amount, calculation.reason);
        results.push(chargeResult);

        if (chargeResult.success) {
          // Обновляем баланс в памяти для дальнейших проверок
          account.balance -= calculation.amount;
        }
      }

      // Проверяем нужно ли уведомить о низком балансе
      if (calculation.shouldNotify) {
        const notifyResult = await this.sendLowBalanceNotification(account);
        results.push(notifyResult);
      }

      // Проверяем нужно ли заблокировать
      if (calculation.shouldBlock && this.config.autoBlockEnabled && !this.config.dryRun) {
        const blockResult = await this.blockAccount(account);
        results.push(blockResult);
      }

      return results;

    } catch (error) {
      console.error(`❌ Ошибка обработки аккаунта ${account.accountNumber}:`, error);
      return [{
        accountId: account.id,
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        action: 'charge'
      }];
    }
  }

  /**
   * Расчет суммы к списанию
   */
  private async calculateCharge(account: AccountBillingInfo): Promise<ChargeCalculation> {
    const now = new Date();
    let shouldCharge = false;
    let amount = 0;
    let reason = '';

    if (account.billingType === 'PREPAID_MONTHLY') {
      // Предоплатная тарификация - списываем раз в месяц
      const lastCharge = account.lastChargeDate;
      
      if (!lastCharge) {
        // Первое списание
        shouldCharge = true;
        amount = account.tariffPrice;
        reason = 'Первоначальное списание за месяц';
      } else {
        // Проверяем прошел ли месяц
        const nextChargeDate = new Date(lastCharge);
        nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
        
        if (now >= nextChargeDate) {
          shouldCharge = true;
          amount = account.tariffPrice;
          reason = 'Ежемесячное списание';
        }
      }
    } else if (account.billingType === 'HOURLY') {
      // Почасовая тарификация
      const hourlyRate = account.tariffPrice / (30 * 24); // Цена за час (месяц = 30 дней)
      const lastCharge = account.lastChargeDate || new Date(now.getTime() - 60 * 60 * 1000); // Час назад если нет данных
      
      const hoursToCharge = Math.floor((now.getTime() - lastCharge.getTime()) / (60 * 60 * 1000));
      
      if (hoursToCharge >= 1) {
        shouldCharge = true;
        amount = hourlyRate * hoursToCharge;
        reason = `Почасовое списание за ${hoursToCharge} час(ов)`;
      }
    }

    // Проверяем достаточно ли средств
    if (shouldCharge && account.balance < amount) {
      shouldCharge = false;
      reason = 'Недостаточно средств для списания';
    }

    // Проверяем нужно ли уведомить о низком балансе
    const shouldNotify = this.config.notificationThresholds.some(threshold => 
      account.balance <= threshold && account.balance > threshold - amount
    );

    // Проверяем нужно ли заблокировать
    const shouldBlock = account.balance <= account.blockThreshold;

    return {
      accountId: account.id,
      amount,
      reason,
      shouldCharge,
      shouldNotify,
      shouldBlock
    };
  }

  /**
   * Списание средств с аккаунта
   */
  private async chargeAccount(account: AccountBillingInfo, amount: number, reason: string): Promise<BillingResult> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Обновляем баланс
        await tx.account.update({
          where: { id: account.id },
          data: { 
            balance: { decrement: amount },
            updatedAt: new Date()
          }
        });

        // Создаем запись о платеже (списании)
        await tx.payment.create({
          data: {
            accountId: account.id,
            amount: -amount, // Отрицательная сумма для списания
            source: 'MANUAL', // Автоматическое списание помечаем как MANUAL
            comment: reason,
            status: 'COMPLETED',
            processedAt: new Date()
          }
        });
      });

      console.log(`💰 Списано ${amount} руб. с аккаунта ${account.accountNumber}: ${reason}`);

      return {
        accountId: account.id,
        success: true,
        amount,
        action: 'charge'
      };

    } catch (error) {
      console.error(`❌ Ошибка списания с аккаунта ${account.accountNumber}:`, error);
      return {
        accountId: account.id,
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка списания',
        action: 'charge'
      };
    }
  }

  /**
   * Блокировка аккаунта
   */
  private async blockAccount(account: AccountBillingInfo): Promise<BillingResult> {
    try {
      await this.prisma.account.update({
        where: { id: account.id },
        data: { 
          status: AccountStatus.BLOCKED,
          updatedAt: new Date()
        }
      });

      console.log(`🚫 Заблокирован аккаунт ${account.accountNumber} (баланс: ${account.balance})`);

      // TODO: Отправить команду на MikroTik через Kafka для блокировки

      return {
        accountId: account.id,
        success: true,
        action: 'block'
      };

    } catch (error) {
      console.error(`❌ Ошибка блокировки аккаунта ${account.accountNumber}:`, error);
      return {
        accountId: account.id,
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка блокировки',
        action: 'block'
      };
    }
  }

  /**
   * Отправка уведомления о низком балансе
   */
  private async sendLowBalanceNotification(account: AccountBillingInfo): Promise<BillingResult> {
    try {
      // Создаем уведомление в базе данных
      await this.prisma.notification.create({
        data: {
          clientId: account.clientId,
          type: 'LOW_BALANCE',
          channel: account.telegramId ? 'TELEGRAM' : 'SMS',
          message: `Внимание! На вашем лицевом счете ${account.accountNumber} остается ${account.balance} руб. Пожалуйста, пополните баланс.`,
          status: 'PENDING'
        }
      });

      console.log(`📢 Создано уведомление о низком балансе для аккаунта ${account.accountNumber}`);

      return {
        accountId: account.id,
        success: true,
        action: 'notify'
      };

    } catch (error) {
      console.error(`❌ Ошибка создания уведомления для аккаунта ${account.accountNumber}:`, error);
      return {
        accountId: account.id,
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка уведомления',
        action: 'notify'
      };
    }
  }

  /**
   * Получение всех активных аккаунтов
   */
  private async getActiveAccounts(): Promise<AccountBillingInfo[]> {
    const accounts = await this.prisma.account.findMany({
      where: {
        status: AccountStatus.ACTIVE
      },
      include: {
        client: true,
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

    return accounts.map(account => ({
      id: account.id,
      accountNumber: account.accountNumber,
      balance: account.balance,
      tariffPrice: account.tariff.price,
      billingType: account.tariff.billingType as 'PREPAID_MONTHLY' | 'HOURLY',
      status: account.status as 'ACTIVE' | 'BLOCKED' | 'SUSPENDED',
      blockThreshold: account.blockThreshold,
      notificationDays: account.tariff.notificationDays,
      lastChargeDate: account.payments[0]?.createdAt,
      clientId: account.clientId,
      clientName: `${account.client.firstName} ${account.client.lastName}`,
      clientPhones: account.client.phones,
      telegramId: account.client.telegramId || undefined
    }));
  }

  /**
   * Обновление статистики
   */
  private updateStats(stats: BillingStats, results: BillingResult[]): void {
    for (const result of results) {
      if (result.success) {
        switch (result.action) {
          case 'charge':
            stats.successfulCharges++;
            stats.totalAmount += result.amount || 0;
            break;
          case 'block':
            stats.blockedAccounts++;
            break;
          case 'notify':
            stats.notificationsSent++;
            break;
        }
      } else {
        if (result.action === 'charge') {
          stats.failedCharges++;
        }
      }
    }
  }

  /**
   * Разблокировка аккаунта (при пополнении баланса)
   */
  async unblockAccount(accountId: string): Promise<BillingResult> {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id: accountId },
        include: { client: true }
      });

      if (!account) {
        return {
          accountId,
          success: false,
          error: 'Аккаунт не найден',
          action: 'unblock'
        };
      }

      if (account.status !== AccountStatus.BLOCKED) {
        return {
          accountId,
          success: false,
          error: 'Аккаунт не заблокирован',
          action: 'unblock'
        };
      }

      // Проверяем достаточно ли средств для разблокировки
      if (account.balance <= account.blockThreshold) {
        return {
          accountId,
          success: false,
          error: 'Недостаточно средств для разблокировки',
          action: 'unblock'
        };
      }

      // Разблокируем аккаунт
      await this.prisma.account.update({
        where: { id: accountId },
        data: { 
          status: AccountStatus.ACTIVE,
          updatedAt: new Date()
        }
      });

      // Создаем уведомление о разблокировке
      await this.prisma.notification.create({
        data: {
          clientId: account.clientId,
          type: 'UNBLOCKED',
          channel: account.client.telegramId ? 'TELEGRAM' : 'SMS',
          message: `Ваш лицевой счет ${account.accountNumber} разблокирован. Текущий баланс: ${account.balance} руб.`,
          status: 'PENDING'
        }
      });

      console.log(`✅ Разблокирован аккаунт ${account.accountNumber}`);

      // TODO: Отправить команду на MikroTik через Kafka для разблокировки

      return {
        accountId,
        success: true,
        action: 'unblock'
      };

    } catch (error) {
      console.error(`❌ Ошибка разблокировки аккаунта ${accountId}:`, error);
      return {
        accountId,
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка разблокировки',
        action: 'unblock'
      };
    }
  }
}