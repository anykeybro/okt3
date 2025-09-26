// Unit тесты для PaymentsService
import { PaymentsService } from '../payments.service';
import { RobokassaService } from '../robokassa.service';
import { PaymentError } from '../payments.types';
import { PaymentSource, PaymentStatus } from '@prisma/client';

// Мокаем Prisma Client
const mockPrisma = {
  account: {
    findUnique: jest.fn(),
    update: jest.fn()
  },
  systemUser: {
    findUnique: jest.fn()
  },
  payment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn()
  },
  $transaction: jest.fn()
};

// Мокаем RobokassaService
jest.mock('../robokassa.service');

describe('PaymentsService', () => {
  let paymentsService: PaymentsService;
  let mockRobokassaService: jest.Mocked<RobokassaService>;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentsService = new PaymentsService(mockPrisma as any);
    mockRobokassaService = new RobokassaService() as jest.Mocked<RobokassaService>;
    (paymentsService as any).robokassaService = mockRobokassaService;
  });

  describe('createManualPayment', () => {
    const mockAccount = {
      id: 'account_1',
      accountNumber: 'ACC001',
      balance: 100,
      client: {
        id: 'client_1',
        firstName: 'Иван',
        lastName: 'Иванов',
        middleName: 'Иванович'
      }
    };

    const mockAdmin = {
      id: 'admin_1',
      username: 'admin'
    };

    const mockPaymentData = {
      accountId: 'account_1',
      amount: 500,
      comment: 'Тестовый платеж',
      processedById: 'admin_1'
    };

    it('должен создавать ручной платеж успешно', async () => {
      const mockCreatedPayment = {
        id: 'payment_1',
        accountId: 'account_1',
        amount: 500,
        source: PaymentSource.MANUAL,
        status: PaymentStatus.COMPLETED,
        comment: 'Тестовый платеж',
        processedById: 'admin_1',
        createdAt: new Date(),
        processedAt: new Date(),
        account: mockAccount,
        processedBy: mockAdmin
      };

      mockPrisma.account.findUnique.mockResolvedValue(mockAccount);
      mockPrisma.systemUser.findUnique.mockResolvedValue(mockAdmin);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          payment: {
            create: jest.fn().mockResolvedValue(mockCreatedPayment)
          },
          account: {
            update: jest.fn().mockResolvedValue(mockAccount)
          }
        });
      });

      const result = await paymentsService.createManualPayment(mockPaymentData);

      expect(result).toHaveProperty('id', 'payment_1');
      expect(result).toHaveProperty('amount', 500);
      expect(result).toHaveProperty('source', PaymentSource.MANUAL);
      expect(result).toHaveProperty('status', PaymentStatus.COMPLETED);
      expect(mockPrisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'account_1' },
        include: { client: true }
      });
      expect(mockPrisma.systemUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'admin_1' }
      });
    });

    it('должен выбрасывать ошибку если лицевой счет не найден', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(
        paymentsService.createManualPayment(mockPaymentData)
      ).rejects.toThrow(PaymentError);
      
      expect(mockPrisma.account.findUnique).toHaveBeenCalled();
    });

    it('должен выбрасывать ошибку если администратор не найден', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(mockAccount);
      mockPrisma.systemUser.findUnique.mockResolvedValue(null);

      await expect(
        paymentsService.createManualPayment(mockPaymentData)
      ).rejects.toThrow(PaymentError);
      
      expect(mockPrisma.systemUser.findUnique).toHaveBeenCalled();
    });
  });

  describe('createRobokassaPayment', () => {
    const mockAccount = {
      id: 'account_1',
      accountNumber: 'ACC001',
      client: {
        firstName: 'Иван',
        lastName: 'Иванов'
      }
    };

    const mockPaymentData = {
      accountId: 'account_1',
      amount: 1000,
      description: 'Пополнение через Robokassa'
    };

    it('должен создавать платеж Robokassa успешно', async () => {
      const mockCreatedPayment = {
        id: 'payment_1',
        accountId: 'account_1',
        amount: 1000,
        source: PaymentSource.ROBOKASSA,
        status: PaymentStatus.PENDING
      };

      const mockPaymentUrl = {
        url: 'https://robokassa.ru/payment?params',
        invoiceId: 'payment_1'
      };

      mockPrisma.account.findUnique.mockResolvedValue(mockAccount);
      mockRobokassaService.validatePaymentParams.mockImplementation(() => {});
      mockPrisma.payment.create.mockResolvedValue(mockCreatedPayment);
      mockRobokassaService.generatePaymentUrl.mockResolvedValue(mockPaymentUrl);
      mockPrisma.payment.update.mockResolvedValue(mockCreatedPayment);

      const result = await paymentsService.createRobokassaPayment(mockPaymentData);

      expect(result).toEqual(mockPaymentUrl);
      expect(mockRobokassaService.validatePaymentParams).toHaveBeenCalledWith(1000, 'account_1');
      expect(mockRobokassaService.generatePaymentUrl).toHaveBeenCalled();
    });

    it('должен выбрасывать ошибку если лицевой счет не найден', async () => {
      mockPrisma.account.findUnique.mockResolvedValue(null);

      await expect(
        paymentsService.createRobokassaPayment(mockPaymentData)
      ).rejects.toThrow(PaymentError);
    });
  });

  describe('processRobokassaWebhook', () => {
    const mockWebhookData = {
      OutSum: '1000.00',
      InvId: 'payment_1',
      SignatureValue: 'valid_signature'
    };

    const mockPayment = {
      id: 'payment_1',
      accountId: 'account_1',
      amount: 1000,
      status: PaymentStatus.PENDING,
      account: {
        accountNumber: 'ACC001',
        client: {
          firstName: 'Иван',
          lastName: 'Иванов'
        }
      }
    };

    it('должен обрабатывать webhook успешно', async () => {
      const mockProcessedWebhook = {
        invoiceId: 'payment_1',
        amount: 1000,
        isValid: true
      };

      const mockUpdatedPayment = {
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
        processedAt: new Date()
      };

      mockRobokassaService.processWebhook.mockResolvedValue(mockProcessedWebhook);
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          payment: {
            update: jest.fn().mockResolvedValue(mockUpdatedPayment)
          },
          account: {
            update: jest.fn().mockResolvedValue({})
          }
        });
      });

      const result = await paymentsService.processRobokassaWebhook(mockWebhookData);

      expect(result).toHaveProperty('status', PaymentStatus.COMPLETED);
      expect(mockRobokassaService.processWebhook).toHaveBeenCalledWith(mockWebhookData);
    });

    it('должен выбрасывать ошибку если платеж не найден', async () => {
      const mockProcessedWebhook = {
        invoiceId: 'payment_1',
        amount: 1000,
        isValid: true
      };

      mockRobokassaService.processWebhook.mockResolvedValue(mockProcessedWebhook);
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(
        paymentsService.processRobokassaWebhook(mockWebhookData)
      ).rejects.toThrow(PaymentError);
    });

    it('должен возвращать уже обработанный платеж', async () => {
      const mockProcessedWebhook = {
        invoiceId: 'payment_1',
        amount: 1000,
        isValid: true
      };

      const mockCompletedPayment = {
        ...mockPayment,
        status: PaymentStatus.COMPLETED
      };

      mockRobokassaService.processWebhook.mockResolvedValue(mockProcessedWebhook);
      mockPrisma.payment.findUnique.mockResolvedValue(mockCompletedPayment);

      const result = await paymentsService.processRobokassaWebhook(mockWebhookData);

      expect(result).toHaveProperty('status', PaymentStatus.COMPLETED);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getPayments', () => {
    it('должен возвращать список платежей с пагинацией', async () => {
      const mockPayments = [
        {
          id: 'payment_1',
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
          },
          processedBy: {
            id: 'admin_1',
            username: 'admin'
          }
        }
      ];

      mockPrisma.payment.findMany.mockResolvedValue(mockPayments);
      mockPrisma.payment.count.mockResolvedValue(1);

      const result = await paymentsService.getPayments({}, { page: 1, limit: 10 });

      expect(result).toHaveProperty('payments');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      expect(result.payments).toHaveLength(1);
    });
  });

  describe('getPaymentStats', () => {
    it('должен возвращать статистику платежей', async () => {
      const mockPayments = [
        {
          amount: 500,
          source: PaymentSource.MANUAL,
          status: PaymentStatus.COMPLETED,
          createdAt: new Date()
        },
        {
          amount: 1000,
          source: PaymentSource.ROBOKASSA,
          status: PaymentStatus.COMPLETED,
          createdAt: new Date()
        }
      ];

      mockPrisma.payment.findMany.mockResolvedValue(mockPayments);

      const result = await paymentsService.getPaymentStats();

      expect(result).toHaveProperty('totalAmount', 1500);
      expect(result).toHaveProperty('totalCount', 2);
      expect(result).toHaveProperty('bySource');
      expect(result).toHaveProperty('byStatus');
      expect(result.bySource[PaymentSource.MANUAL]).toEqual({ amount: 500, count: 1 });
      expect(result.bySource[PaymentSource.ROBOKASSA]).toEqual({ amount: 1000, count: 1 });
    });
  });
});