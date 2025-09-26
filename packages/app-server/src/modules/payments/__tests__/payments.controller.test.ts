// Unit тесты для PaymentsController
import { Request, Response } from 'express';
import { PaymentsController } from '../payments.controller';
import { PaymentsService } from '../payments.service';
import { PaymentError, RobokassaError } from '../payments.types';
import { PaymentSource, PaymentStatus } from '@prisma/client';

// Мокаем PaymentsService
jest.mock('../payments.service');

describe('PaymentsController', () => {
  let paymentsController: PaymentsController;
  let mockPaymentsService: jest.Mocked<PaymentsService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPaymentsService = new PaymentsService({} as any) as jest.Mocked<PaymentsService>;
    paymentsController = new PaymentsController(mockPaymentsService);

    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: { 
        userId: 'admin_1',
        username: 'admin',
        roleId: 'role_1',
        permissions: []
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('createManualPayment', () => {
    it('должен создавать ручной платеж успешно', async () => {
      const mockPaymentData = {
        accountId: 'account_1',
        amount: 500,
        comment: 'Тестовый платеж'
      };

      const mockCreatedPayment = {
        id: 'payment_1',
        accountId: 'account_1',
        amount: 500,
        source: PaymentSource.MANUAL,
        status: PaymentStatus.COMPLETED,
        createdAt: new Date(),
        account: {
          accountNumber: 'ACC001',
          client: {
            firstName: 'Иван',
            lastName: 'Иванов'
          }
        }
      };

      mockRequest.body = mockPaymentData;
      mockPaymentsService.createManualPayment.mockResolvedValue(mockCreatedPayment as any);

      await paymentsController.createManualPayment(mockRequest as Request, mockResponse as Response);

      expect(mockPaymentsService.createManualPayment).toHaveBeenCalledWith({
        ...mockPaymentData,
        processedById: 'admin_1'
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedPayment
      });
    });

    it('должен возвращать ошибку валидации для отсутствующих полей', async () => {
      mockRequest.body = { amount: 500 }; // Отсутствует accountId

      await paymentsController.createManualPayment(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Обязательные поля: accountId, amount',
        code: 'VALIDATION_ERROR'
      });
    });

    it('должен возвращать ошибку для некорректной суммы', async () => {
      mockRequest.body = {
        accountId: 'account_1',
        amount: -100 // Отрицательная сумма
      };

      await paymentsController.createManualPayment(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Сумма должна быть положительным числом',
        code: 'INVALID_AMOUNT'
      });
    });

    it('должен возвращать ошибку для неавторизованного пользователя', async () => {
      mockRequest.user = undefined;
      mockRequest.body = {
        accountId: 'account_1',
        amount: 500
      };

      await paymentsController.createManualPayment(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Не авторизован',
        code: 'UNAUTHORIZED'
      });
    });

    it('должен обрабатывать ошибки сервиса', async () => {
      mockRequest.body = {
        accountId: 'account_1',
        amount: 500
      };

      mockPaymentsService.createManualPayment.mockRejectedValue(
        new PaymentError('Лицевой счет не найден', 'ACCOUNT_NOT_FOUND')
      );

      await paymentsController.createManualPayment(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Лицевой счет не найден',
        code: 'ACCOUNT_NOT_FOUND'
      });
    });
  });

  describe('createRobokassaPayment', () => {
    it('должен создавать платеж Robokassa успешно', async () => {
      const mockPaymentData = {
        accountId: 'account_1',
        amount: 1000,
        description: 'Пополнение через Robokassa'
      };

      const mockPaymentUrl = {
        url: 'https://robokassa.ru/payment?params',
        invoiceId: 'payment_1'
      };

      mockRequest.body = mockPaymentData;
      mockPaymentsService.createRobokassaPayment.mockResolvedValue(mockPaymentUrl);

      await paymentsController.createRobokassaPayment(mockRequest as Request, mockResponse as Response);

      expect(mockPaymentsService.createRobokassaPayment).toHaveBeenCalledWith(mockPaymentData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPaymentUrl
      });
    });
  });

  describe('processRobokassaWebhook', () => {
    it('должен обрабатывать webhook успешно', async () => {
      const mockWebhookData = {
        OutSum: '1000.00',
        InvId: 'payment_1',
        SignatureValue: 'valid_signature'
      };

      const mockProcessedPayment = {
        id: 'payment_1',
        status: PaymentStatus.COMPLETED
      };

      mockRequest.body = mockWebhookData;
      mockPaymentsService.processRobokassaWebhook.mockResolvedValue(mockProcessedPayment as any);

      await paymentsController.processRobokassaWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockPaymentsService.processRobokassaWebhook).toHaveBeenCalledWith(mockWebhookData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.send).toHaveBeenCalledWith('OK');
    });

    it('должен возвращать ошибку при неудачной обработке webhook', async () => {
      const mockWebhookData = {
        OutSum: '1000.00',
        InvId: 'payment_1',
        SignatureValue: 'invalid_signature'
      };

      mockRequest.body = mockWebhookData;
      mockPaymentsService.processRobokassaWebhook.mockRejectedValue(
        new RobokassaError('Неверная подпись webhook')
      );

      await paymentsController.processRobokassaWebhook(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.send).toHaveBeenCalledWith('ERROR');
    });
  });

  describe('getPayments', () => {
    it('должен возвращать список платежей', async () => {
      const mockPaymentsList = {
        payments: [
          {
            id: 'payment_1',
            amount: 500,
            source: PaymentSource.MANUAL,
            status: PaymentStatus.COMPLETED
          }
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      };

      mockRequest.query = {
        page: '1',
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      mockPaymentsService.getPayments.mockResolvedValue(mockPaymentsList as any);

      await paymentsController.getPayments(mockRequest as Request, mockResponse as Response);

      expect(mockPaymentsService.getPayments).toHaveBeenCalledWith(
        {},
        {
          page: 1,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPaymentsList
      });
    });

    it('должен применять фильтры из query параметров', async () => {
      mockRequest.query = {
        accountId: 'account_1',
        source: 'MANUAL',
        status: 'COMPLETED',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        minAmount: '100',
        maxAmount: '1000'
      };

      mockPaymentsService.getPayments.mockResolvedValue({
        payments: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      });

      await paymentsController.getPayments(mockRequest as Request, mockResponse as Response);

      expect(mockPaymentsService.getPayments).toHaveBeenCalledWith(
        {
          accountId: 'account_1',
          source: 'MANUAL',
          status: 'COMPLETED',
          dateFrom: new Date('2024-01-01'),
          dateTo: new Date('2024-12-31'),
          minAmount: 100,
          maxAmount: 1000
        },
        {}
      );
    });
  });

  describe('getPaymentById', () => {
    it('должен возвращать платеж по ID', async () => {
      const mockPayment = {
        id: 'payment_1',
        amount: 500,
        source: PaymentSource.MANUAL,
        status: PaymentStatus.COMPLETED
      };

      mockRequest.params = { id: 'payment_1' };
      mockPaymentsService.getPaymentById.mockResolvedValue(mockPayment as any);

      await paymentsController.getPaymentById(mockRequest as Request, mockResponse as Response);

      expect(mockPaymentsService.getPaymentById).toHaveBeenCalledWith('payment_1');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPayment
      });
    });

    it('должен возвращать ошибку для отсутствующего ID', async () => {
      mockRequest.params = {};

      await paymentsController.getPaymentById(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'ID платежа обязателен',
        code: 'VALIDATION_ERROR'
      });
    });
  });

  describe('getPaymentStats', () => {
    it('должен возвращать статистику платежей', async () => {
      const mockStats = {
        totalAmount: 1500,
        totalCount: 2,
        bySource: {
          [PaymentSource.MANUAL]: { amount: 500, count: 1 },
          [PaymentSource.ROBOKASSA]: { amount: 1000, count: 1 }
        },
        byStatus: {
          [PaymentStatus.PENDING]: { amount: 0, count: 0 },
          [PaymentStatus.COMPLETED]: { amount: 1500, count: 2 },
          [PaymentStatus.FAILED]: { amount: 0, count: 0 }
        },
        todayAmount: 500,
        todayCount: 1,
        monthAmount: 1500,
        monthCount: 2
      };

      mockPaymentsService.getPaymentStats.mockResolvedValue(mockStats);

      await paymentsController.getPaymentStats(mockRequest as Request, mockResponse as Response);

      expect(mockPaymentsService.getPaymentStats).toHaveBeenCalledWith(undefined, undefined);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });

    it('должен обрабатывать параметры дат', async () => {
      mockRequest.query = {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31'
      };

      mockPaymentsService.getPaymentStats.mockResolvedValue({} as any);

      await paymentsController.getPaymentStats(mockRequest as Request, mockResponse as Response);

      expect(mockPaymentsService.getPaymentStats).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );
    });

    it('должен возвращать ошибку для некорректного формата даты', async () => {
      mockRequest.query = {
        dateFrom: 'invalid-date'
      };

      await paymentsController.getPaymentStats(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Неверный формат даты dateFrom',
        code: 'INVALID_DATE_FORMAT'
      });
    });
  });
});