// Сервис для работы с платежами
import { PrismaClient, PaymentSource, PaymentStatus } from '@prisma/client';
import { RobokassaService } from './robokassa.service';
import {
  CreateManualPaymentDto,
  CreateRobokassaPaymentDto,
  UpdatePaymentDto,
  PaymentFilters,
  PaginationOptions,
  PaymentResponse,
  PaymentListResponse,
  PaymentStats,
  PaymentError,
  RobokassaPaymentUrl
} from './payments.types';

export class PaymentsService {
  private robokassaService: RobokassaService;

  constructor(private prisma: PrismaClient) {
    this.robokassaService = new RobokassaService();
  }

  /**
   * Создает ручной платеж (через кассу)
   */
  async createManualPayment(data: CreateManualPaymentDto): Promise<PaymentResponse> {
    try {
      // Проверяем существование лицевого счета
      const account = await this.prisma.account.findUnique({
        where: { id: data.accountId },
        include: {
          client: true
        }
      });

      if (!account) {
        throw new PaymentError('Лицевой счет не найден', 'ACCOUNT_NOT_FOUND');
      }

      // Проверяем администратора
      const admin = await this.prisma.systemUser.findUnique({
        where: { id: data.processedById }
      });

      if (!admin) {
        throw new PaymentError('Администратор не найден', 'ADMIN_NOT_FOUND');
      }

      // Создаем платеж в транзакции
      const result = await this.prisma.$transaction(async (tx) => {
        // Создаем платеж
        const payment = await tx.payment.create({
          data: {
            accountId: data.accountId,
            amount: data.amount,
            source: PaymentSource.MANUAL,
            status: PaymentStatus.COMPLETED,
            comment: data.comment,
            processedById: data.processedById,
            processedAt: new Date()
          },
          include: {
            account: {
              include: {
                client: true
              }
            },
            processedBy: true
          }
        });

        // Обновляем баланс лицевого счета
        await tx.account.update({
          where: { id: data.accountId },
          data: {
            balance: {
              increment: data.amount
            }
          }
        });

        return payment;
      });

      return this.formatPaymentResponse(result);
    } catch (error) {
      if (error instanceof PaymentError) {
        throw error;
      }
      throw new PaymentError(
        `Ошибка создания ручного платежа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        'MANUAL_PAYMENT_CREATION_ERROR'
      );
    }
  }

  /**
   * Создает платеж через Robokassa
   */
  async createRobokassaPayment(data: CreateRobokassaPaymentDto): Promise<RobokassaPaymentUrl> {
    try {
      // Проверяем существование лицевого счета
      const account = await this.prisma.account.findUnique({
        where: { id: data.accountId },
        include: {
          client: true
        }
      });

      if (!account) {
        throw new PaymentError('Лицевой счет не найден', 'ACCOUNT_NOT_FOUND');
      }

      // Валидируем параметры платежа
      this.robokassaService.validatePaymentParams(data.amount, data.accountId);

      // Создаем запись платежа в базе
      const payment = await this.prisma.payment.create({
        data: {
          accountId: data.accountId,
          amount: data.amount,
          source: PaymentSource.ROBOKASSA,
          status: PaymentStatus.PENDING,
          comment: data.description
        }
      });

      // Генерируем URL для оплаты
      const paymentUrl = await this.robokassaService.generatePaymentUrl(
        data.amount,
        payment.id,
        data.description || `Пополнение счета ${account.accountNumber}`
      );

      // Обновляем платеж с внешним ID
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          externalId: paymentUrl.invoiceId
        }
      });

      return paymentUrl;
    } catch (error) {
      if (error instanceof PaymentError) {
        throw error;
      }
      throw new PaymentError(
        `Ошибка создания платежа Robokassa: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        'ROBOKASSA_PAYMENT_CREATION_ERROR'
      );
    }
  }

  /**
   * Обрабатывает webhook от Robokassa
   */
  async processRobokassaWebhook(webhookData: any): Promise<PaymentResponse> {
    try {
      // Обрабатываем данные webhook
      const { invoiceId, amount, isValid } = await this.robokassaService.processWebhook(webhookData);

      if (!isValid) {
        throw new PaymentError('Неверная подпись webhook', 'INVALID_WEBHOOK_SIGNATURE');
      }

      // Находим платеж по ID
      const payment = await this.prisma.payment.findUnique({
        where: { id: invoiceId },
        include: {
          account: {
            include: {
              client: true
            }
          }
        }
      });

      if (!payment) {
        throw new PaymentError('Платеж не найден', 'PAYMENT_NOT_FOUND');
      }

      if (payment.status === PaymentStatus.COMPLETED) {
        // Платеж уже обработан
        return this.formatPaymentResponse(payment);
      }

      // Обновляем платеж и баланс в транзакции
      const result = await this.prisma.$transaction(async (tx) => {
        // Обновляем статус платежа
        const updatedPayment = await tx.payment.update({
          where: { id: invoiceId },
          data: {
            status: PaymentStatus.COMPLETED,
            processedAt: new Date()
          },
          include: {
            account: {
              include: {
                client: true
              }
            },
            processedBy: true
          }
        });

        // Обновляем баланс лицевого счета
        await tx.account.update({
          where: { id: payment.accountId },
          data: {
            balance: {
              increment: amount
            }
          }
        });

        return updatedPayment;
      });

      return this.formatPaymentResponse(result);
    } catch (error) {
      if (error instanceof PaymentError) {
        throw error;
      }
      throw new PaymentError(
        `Ошибка обработки webhook Robokassa: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        'ROBOKASSA_WEBHOOK_PROCESSING_ERROR'
      );
    }
  }

  /**
   * Получает список платежей с фильтрацией и пагинацией
   */
  async getPayments(
    filters: PaymentFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<PaymentListResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = pagination;

      const skip = (page - 1) * limit;

      // Формируем условия фильтрации
      const where: any = {};

      if (filters.accountId) {
        where.accountId = filters.accountId;
      }

      if (filters.source) {
        where.source = filters.source;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) {
          where.createdAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          where.createdAt.lte = filters.dateTo;
        }
      }

      if (filters.minAmount || filters.maxAmount) {
        where.amount = {};
        if (filters.minAmount) {
          where.amount.gte = filters.minAmount;
        }
        if (filters.maxAmount) {
          where.amount.lte = filters.maxAmount;
        }
      }

      // Получаем платежи и общее количество
      const [payments, total] = await Promise.all([
        this.prisma.payment.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            [sortBy]: sortOrder
          },
          include: {
            account: {
              include: {
                client: true
              }
            },
            processedBy: true
          }
        }),
        this.prisma.payment.count({ where })
      ]);

      return {
        payments: payments.map(payment => this.formatPaymentResponse(payment)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new PaymentError(
        `Ошибка получения списка платежей: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        'PAYMENTS_LIST_ERROR'
      );
    }
  }

  /**
   * Получает платеж по ID
   */
  async getPaymentById(id: string): Promise<PaymentResponse> {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id },
        include: {
          account: {
            include: {
              client: true
            }
          },
          processedBy: true
        }
      });

      if (!payment) {
        throw new PaymentError('Платеж не найден', 'PAYMENT_NOT_FOUND');
      }

      return this.formatPaymentResponse(payment);
    } catch (error) {
      if (error instanceof PaymentError) {
        throw error;
      }
      throw new PaymentError(
        `Ошибка получения платежа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        'PAYMENT_GET_ERROR'
      );
    }
  }

  /**
   * Получает статистику платежей
   */
  async getPaymentStats(dateFrom?: Date, dateTo?: Date): Promise<PaymentStats> {
    try {
      const where: any = {};
      
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = dateFrom;
        }
        if (dateTo) {
          where.createdAt.lte = dateTo;
        }
      }

      // Получаем все платежи для статистики
      const payments = await this.prisma.payment.findMany({
        where: {
          ...where,
          status: PaymentStatus.COMPLETED
        }
      });

      // Вычисляем статистику
      const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const totalCount = payments.length;

      // Статистика по источникам
      const bySource = {
        [PaymentSource.MANUAL]: { amount: 0, count: 0 },
        [PaymentSource.ROBOKASSA]: { amount: 0, count: 0 }
      };

      // Статистика по статусам
      const byStatus = {
        [PaymentStatus.PENDING]: { amount: 0, count: 0 },
        [PaymentStatus.COMPLETED]: { amount: 0, count: 0 },
        [PaymentStatus.FAILED]: { amount: 0, count: 0 }
      };

      payments.forEach(payment => {
        bySource[payment.source].amount += payment.amount;
        bySource[payment.source].count += 1;
        byStatus[payment.status].amount += payment.amount;
        byStatus[payment.status].count += 1;
      });

      // Статистика за сегодня
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayPayments = payments.filter(p => p.createdAt >= today);
      const todayAmount = todayPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const todayCount = todayPayments.length;

      // Статистика за текущий месяц
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthPayments = payments.filter(p => p.createdAt >= monthStart);
      const monthAmount = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const monthCount = monthPayments.length;

      return {
        totalAmount,
        totalCount,
        bySource,
        byStatus,
        todayAmount,
        todayCount,
        monthAmount,
        monthCount
      };
    } catch (error) {
      throw new PaymentError(
        `Ошибка получения статистики платежей: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        'PAYMENT_STATS_ERROR'
      );
    }
  }

  /**
   * Форматирует ответ платежа
   */
  private formatPaymentResponse(payment: any): PaymentResponse {
    return {
      id: payment.id,
      accountId: payment.accountId,
      amount: payment.amount,
      source: payment.source,
      status: payment.status,
      externalId: payment.externalId,
      comment: payment.comment,
      processedBy: payment.processedBy ? {
        id: payment.processedBy.id,
        username: payment.processedBy.username
      } : undefined,
      createdAt: payment.createdAt,
      processedAt: payment.processedAt,
      account: {
        accountNumber: payment.account.accountNumber,
        client: {
          firstName: payment.account.client.firstName,
          lastName: payment.account.client.lastName,
          middleName: payment.account.client.middleName
        }
      }
    };
  }
}