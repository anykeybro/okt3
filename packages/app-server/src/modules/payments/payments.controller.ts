// Контроллер для обработки HTTP запросов платежной системы
import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';
import {
  CreateManualPaymentDto,
  CreateRobokassaPaymentDto,
  PaymentFilters,
  PaginationOptions,
  PaymentError,
  RobokassaError
} from './payments.types';

export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  /**
   * Создает ручной платеж (POST /api/payments/manual)
   */
  createManualPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId, amount, comment } = req.body;
      const processedById = req.user?.userId; // Из middleware аутентификации

      if (!processedById) {
        res.status(401).json({
          error: 'Не авторизован',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      // Валидация входных данных
      if (!accountId || !amount) {
        res.status(400).json({
          error: 'Обязательные поля: accountId, amount',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      if (typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({
          error: 'Сумма должна быть положительным числом',
          code: 'INVALID_AMOUNT'
        });
        return;
      }

      const paymentData: CreateManualPaymentDto = {
        accountId,
        amount,
        comment,
        processedById
      };

      const payment = await this.paymentsService.createManualPayment(paymentData);

      res.status(201).json({
        success: true,
        data: payment
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Создает платеж через Robokassa (POST /api/payments/robokassa)
   */
  createRobokassaPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId, amount, description } = req.body;

      // Валидация входных данных
      if (!accountId || !amount) {
        res.status(400).json({
          error: 'Обязательные поля: accountId, amount',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      if (typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({
          error: 'Сумма должна быть положительным числом',
          code: 'INVALID_AMOUNT'
        });
        return;
      }

      const paymentData: CreateRobokassaPaymentDto = {
        accountId,
        amount,
        description
      };

      const paymentUrl = await this.paymentsService.createRobokassaPayment(paymentData);

      res.status(201).json({
        success: true,
        data: paymentUrl
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Обрабатывает webhook от Robokassa (POST /api/payments/robokassa/webhook)
   */
  processRobokassaWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const webhookData = req.body;

      const payment = await this.paymentsService.processRobokassaWebhook(webhookData);

      // Robokassa ожидает ответ "OK" при успешной обработке
      res.status(200).send('OK');
    } catch (error) {
      console.error('Ошибка обработки webhook Robokassa:', error);
      
      // Возвращаем ошибку для Robokassa
      res.status(400).send('ERROR');
    }
  };

  /**
   * Получает список платежей (GET /api/payments)
   */
  getPayments = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        accountId,
        source,
        status,
        dateFrom,
        dateTo,
        minAmount,
        maxAmount,
        page,
        limit,
        sortBy,
        sortOrder
      } = req.query;

      // Формируем фильтры
      const filters: PaymentFilters = {};
      
      if (accountId) filters.accountId = accountId as string;
      if (source) filters.source = source as any;
      if (status) filters.status = status as any;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (minAmount) filters.minAmount = parseFloat(minAmount as string);
      if (maxAmount) filters.maxAmount = parseFloat(maxAmount as string);

      // Формируем параметры пагинации
      const pagination: PaginationOptions = {};
      
      if (page) pagination.page = parseInt(page as string, 10);
      if (limit) pagination.limit = parseInt(limit as string, 10);
      if (sortBy) pagination.sortBy = sortBy as string;
      if (sortOrder) pagination.sortOrder = sortOrder as 'asc' | 'desc';

      const result = await this.paymentsService.getPayments(filters, pagination);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Получает платеж по ID (GET /api/payments/:id)
   */
  getPaymentById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'ID платежа обязателен',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      const payment = await this.paymentsService.getPaymentById(id);

      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Получает статистику платежей (GET /api/payments/stats)
   */
  getPaymentStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { dateFrom, dateTo } = req.query;

      let dateFromParsed: Date | undefined;
      let dateToParsed: Date | undefined;

      if (dateFrom) {
        dateFromParsed = new Date(dateFrom as string);
        if (isNaN(dateFromParsed.getTime())) {
          res.status(400).json({
            error: 'Неверный формат даты dateFrom',
            code: 'INVALID_DATE_FORMAT'
          });
          return;
        }
      }

      if (dateTo) {
        dateToParsed = new Date(dateTo as string);
        if (isNaN(dateToParsed.getTime())) {
          res.status(400).json({
            error: 'Неверный формат даты dateTo',
            code: 'INVALID_DATE_FORMAT'
          });
          return;
        }
      }

      const stats = await this.paymentsService.getPaymentStats(dateFromParsed, dateToParsed);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Получает платежи по лицевому счету (GET /api/payments/account/:accountId)
   */
  getPaymentsByAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.params;
      const { page, limit, sortBy, sortOrder } = req.query;

      if (!accountId) {
        res.status(400).json({
          error: 'ID лицевого счета обязателен',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      const filters: PaymentFilters = { accountId };
      const pagination: PaginationOptions = {};
      
      if (page) pagination.page = parseInt(page as string, 10);
      if (limit) pagination.limit = parseInt(limit as string, 10);
      if (sortBy) pagination.sortBy = sortBy as string;
      if (sortOrder) pagination.sortOrder = sortOrder as 'asc' | 'desc';

      const result = await this.paymentsService.getPayments(filters, pagination);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  /**
   * Обрабатывает ошибки
   */
  private handleError(error: unknown, res: Response): void {
    console.error('Ошибка в PaymentsController:', error);

    if (error instanceof PaymentError || error instanceof RobokassaError) {
      const statusCode = this.getStatusCodeByErrorCode(error.code || 'UNKNOWN_ERROR');
      res.status(statusCode).json({
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      });
      return;
    }

    res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }

  /**
   * Определяет HTTP статус код по коду ошибки
   */
  private getStatusCodeByErrorCode(code: string): number {
    const statusCodes: { [key: string]: number } = {
      'ACCOUNT_NOT_FOUND': 404,
      'PAYMENT_NOT_FOUND': 404,
      'ADMIN_NOT_FOUND': 404,
      'VALIDATION_ERROR': 400,
      'INVALID_AMOUNT': 400,
      'INVALID_WEBHOOK_SIGNATURE': 400,
      'AMOUNT_TOO_HIGH': 400,
      'INVALID_INVOICE_ID': 400,
      'UNAUTHORIZED': 401,
      'INSUFFICIENT_FUNDS': 402,
      'MANUAL_PAYMENT_CREATION_ERROR': 500,
      'ROBOKASSA_PAYMENT_CREATION_ERROR': 500,
      'ROBOKASSA_WEBHOOK_PROCESSING_ERROR': 500,
      'PAYMENTS_LIST_ERROR': 500,
      'PAYMENT_GET_ERROR': 500,
      'PAYMENT_STATS_ERROR': 500
    };

    return statusCodes[code] || 500;
  }
}