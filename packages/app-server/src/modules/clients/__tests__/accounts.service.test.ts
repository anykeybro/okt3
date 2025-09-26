// Unit тесты для AccountsService
import { AccountsService } from '../accounts.service';
import prisma from '../../../common/database';
import { ValidationError, NotFoundError, ConflictError } from '../../../common/errors';
import { AccountStatus } from '@prisma/client';

// Мокаем Prisma
jest.mock('../../../common/database', () => ({
  account: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  client: {
    findUnique: jest.fn(),
  },
  tariff: {
    findUnique: jest.fn(),
  },
  device: {
    findUnique: jest.fn(),
  },
  payment: {
    count: jest.fn(),
  },
}));

// Мокаем конфигурацию
jest.mock('../../../config/config', () => ({
  config: {
    billing: {
      defaultBlockThreshold: 0
    }
  }
}));

describe('AccountsService', () => {
  let accountsService: AccountsService;

  beforeEach(() => {
    accountsService = new AccountsService();
    jest.clearAllMocks();
  });

  describe('createAccount', () => {
    const validAccountData = {
      clientId: '507f1f77bcf86cd799439011',
      tariffId: '507f1f77bcf86cd799439012',
      macAddress: '00:11:22:33:44:55',
      poolName: 'default',
      blockThreshold: 0
    };

    const mockClient = {
      id: '507f1f77bcf86cd799439011',
      firstName: 'Иван',
      lastName: 'Иванов'
    };

    const mockTariff = {
      id: '507f1f77bcf86cd799439012',
      name: 'Базовый',
      isActive: true
    };

    beforeEach(() => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);
      (prisma.tariff.findUnique as jest.Mock).mockResolvedValue(mockTariff);
      (prisma.account.count as jest.Mock).mockResolvedValue(0);
      (prisma.account.findFirst as jest.Mock).mockResolvedValue(null);
    });

    it('должен создать лицевой счет с валидными данными', async () => {
      const mockAccount = {
        id: '507f1f77bcf86cd799439013',
        accountNumber: '2401123456',
        ...validAccountData,
        balance: 0,
        status: AccountStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockAccountWithDetails = {
        ...mockAccount,
        client: mockClient,
        tariff: mockTariff,
        device: null
      };

      (prisma.account.create as jest.Mock).mockResolvedValue(mockAccount);
      (prisma.account.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // Для проверки уникальности номера в generateAccountNumber
        .mockResolvedValueOnce(mockAccountWithDetails); // Для getAccountWithDetails

      const result = await accountsService.createAccount(validAccountData);

      expect(prisma.account.create).toHaveBeenCalledWith({
        data: {
          accountNumber: expect.stringMatching(/^\d{10}$/),
          clientId: validAccountData.clientId,
          tariffId: validAccountData.tariffId,
          balance: 0,
          status: AccountStatus.ACTIVE,
          macAddress: '00:11:22:33:44:55',
          poolName: 'default',
          blockThreshold: 0,
          deviceId: null,
        }
      });

      expect(result).toEqual(mockAccountWithDetails);
    });

    it('должен выбросить ошибку при невалидных данных', async () => {
      const invalidData = {
        clientId: 'invalid-id',
        tariffId: '507f1f77bcf86cd799439012'
      };

      await expect(accountsService.createAccount(invalidData as any))
        .rejects.toThrow(ValidationError);
    });

    it('должен выбросить ошибку если клиент не найден', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(accountsService.createAccount(validAccountData))
        .rejects.toThrow(NotFoundError);
    });

    it('должен выбросить ошибку если тариф не найден', async () => {
      (prisma.tariff.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(accountsService.createAccount(validAccountData))
        .rejects.toThrow(NotFoundError);
    });

    it('должен выбросить ошибку если тариф неактивен', async () => {
      (prisma.tariff.findUnique as jest.Mock).mockResolvedValue({
        ...mockTariff,
        isActive: false
      });

      await expect(accountsService.createAccount(validAccountData))
        .rejects.toThrow(ConflictError);
    });

    it('должен выбросить ошибку при превышении лимита лицевых счетов', async () => {
      (prisma.account.count as jest.Mock).mockResolvedValue(10);

      await expect(accountsService.createAccount(validAccountData))
        .rejects.toThrow(ConflictError);
    });

    it('должен выбросить ошибку при дублировании MAC-адреса', async () => {
      const existingAccount = { id: '507f1f77bcf86cd799439014' };
      (prisma.account.findFirst as jest.Mock).mockResolvedValue(existingAccount);

      await expect(accountsService.createAccount(validAccountData))
        .rejects.toThrow(ConflictError);
    });
  });

  describe('getAccounts', () => {
    it('должен вернуть список лицевых счетов с пагинацией', async () => {
      const mockAccounts = [
        {
          id: '507f1f77bcf86cd799439013',
          accountNumber: '2401123456',
          client: { firstName: 'Иван', lastName: 'Иванов' },
          tariff: { name: 'Базовый' }
        }
      ];

      (prisma.account.findMany as jest.Mock).mockResolvedValue(mockAccounts);
      (prisma.account.count as jest.Mock).mockResolvedValue(1);

      const result = await accountsService.getAccounts({}, { page: 1, limit: 20 });

      expect(result).toEqual({
        data: mockAccounts,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });
    });

    it('должен применить фильтры', async () => {
      const filters = {
        clientId: '507f1f77bcf86cd799439011',
        status: AccountStatus.ACTIVE,
        search: 'Иван'
      };

      (prisma.account.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.account.count as jest.Mock).mockResolvedValue(0);

      await accountsService.getAccounts(filters);

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          clientId: '507f1f77bcf86cd799439011',
          status: AccountStatus.ACTIVE,
          OR: expect.any(Array)
        }),
        skip: 0,
        take: 20,
        orderBy: { accountNumber: 'asc' },
        include: expect.any(Object)
      });
    });
  });

  describe('getAccountById', () => {
    it('должен вернуть лицевой счет по ID', async () => {
      const mockAccount = {
        id: '507f1f77bcf86cd799439013',
        accountNumber: '2401123456'
      };

      (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      const result = await accountsService.getAccountById('507f1f77bcf86cd799439013');

      expect(result).toEqual(mockAccount);
    });

    it('должен выбросить ошибку если лицевой счет не найден', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(accountsService.getAccountById('507f1f77bcf86cd799439013'))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('updateAccount', () => {
    const existingAccount = {
      id: '507f1f77bcf86cd799439013',
      clientId: '507f1f77bcf86cd799439011',
      tariffId: '507f1f77bcf86cd799439012',
      macAddress: '00:11:22:33:44:55'
    };

    beforeEach(() => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(existingAccount);
    });

    it('должен обновить лицевой счет', async () => {
      const updateData = {
        poolName: 'new-pool',
        blockThreshold: 100
      };

      const mockTariff = { id: '507f1f77bcf86cd799439012', isActive: true };
      (prisma.tariff.findUnique as jest.Mock).mockResolvedValue(mockTariff);

      const updatedAccount = { ...existingAccount, ...updateData };
      (prisma.account.update as jest.Mock).mockResolvedValue(updatedAccount);
      (prisma.account.findUnique as jest.Mock)
        .mockResolvedValueOnce(existingAccount)
        .mockResolvedValueOnce({ ...updatedAccount, client: {}, tariff: {} });

      const result = await accountsService.updateAccount('507f1f77bcf86cd799439013', updateData);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: '507f1f77bcf86cd799439013' },
        data: {
          poolName: 'new-pool',
          blockThreshold: 100
        }
      });
    });

    it('должен проверить существование тарифа при его изменении', async () => {
      const updateData = { tariffId: '507f1f77bcf86cd799439014' };

      (prisma.tariff.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(accountsService.updateAccount('507f1f77bcf86cd799439013', updateData))
        .rejects.toThrow(NotFoundError);
    });

    it('должен проверить уникальность MAC-адреса при его изменении', async () => {
      const updateData = { macAddress: '00:11:22:33:44:66' };
      const conflictingAccount = { id: '507f1f77bcf86cd799439014' };

      (prisma.account.findFirst as jest.Mock).mockResolvedValue(conflictingAccount);

      await expect(accountsService.updateAccount('507f1f77bcf86cd799439013', updateData))
        .rejects.toThrow(ConflictError);
    });
  });

  describe('deleteAccount', () => {
    it('должен удалить лицевой счет без платежей', async () => {
      const mockAccount = { id: '507f1f77bcf86cd799439013' };

      (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (prisma.payment.count as jest.Mock).mockResolvedValue(0);
      (prisma.account.delete as jest.Mock).mockResolvedValue(mockAccount);

      await accountsService.deleteAccount('507f1f77bcf86cd799439013');

      expect(prisma.account.delete).toHaveBeenCalledWith({
        where: { id: '507f1f77bcf86cd799439013' }
      });
    });

    it('должен выбросить ошибку при наличии платежей', async () => {
      const mockAccount = { id: '507f1f77bcf86cd799439013' };

      (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (prisma.payment.count as jest.Mock).mockResolvedValue(5);

      await expect(accountsService.deleteAccount('507f1f77bcf86cd799439013'))
        .rejects.toThrow(ConflictError);
    });
  });

  describe('blockAccount', () => {
    it('должен заблокировать активный лицевой счет', async () => {
      const mockAccount = {
        id: '507f1f77bcf86cd799439013',
        status: AccountStatus.ACTIVE
      };

      const blockedAccount = {
        ...mockAccount,
        status: AccountStatus.BLOCKED,
        client: {},
        tariff: {}
      };

      (prisma.account.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(blockedAccount);
      (prisma.account.update as jest.Mock).mockResolvedValue(blockedAccount);

      const result = await accountsService.blockAccount('507f1f77bcf86cd799439013');

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: '507f1f77bcf86cd799439013' },
        data: { status: AccountStatus.BLOCKED }
      });

      expect(result.status).toBe(AccountStatus.BLOCKED);
    });

    it('должен выбросить ошибку если счет уже заблокирован', async () => {
      const mockAccount = {
        id: '507f1f77bcf86cd799439013',
        status: AccountStatus.BLOCKED
      };

      (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      await expect(accountsService.blockAccount('507f1f77bcf86cd799439013'))
        .rejects.toThrow(ConflictError);
    });
  });

  describe('changeBalance', () => {
    it('должен пополнить баланс', async () => {
      const mockAccount = {
        id: '507f1f77bcf86cd799439013',
        balance: 100
      };

      const operation = {
        accountId: '507f1f77bcf86cd799439013',
        amount: 50,
        type: 'credit' as const,
        description: 'Пополнение'
      };

      const updatedAccount = {
        ...mockAccount,
        balance: 150,
        client: {},
        tariff: {}
      };

      (prisma.account.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(updatedAccount);
      (prisma.account.update as jest.Mock).mockResolvedValue(updatedAccount);

      const result = await accountsService.changeBalance(operation);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: '507f1f77bcf86cd799439013' },
        data: { balance: 150 }
      });

      expect(result.balance).toBe(150);
    });

    it('должен списать с баланса', async () => {
      const mockAccount = {
        id: '507f1f77bcf86cd799439013',
        balance: 100
      };

      const operation = {
        accountId: '507f1f77bcf86cd799439013',
        amount: 30,
        type: 'debit' as const,
        description: 'Списание'
      };

      const updatedAccount = {
        ...mockAccount,
        balance: 70,
        client: {},
        tariff: {}
      };

      (prisma.account.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(updatedAccount);
      (prisma.account.update as jest.Mock).mockResolvedValue(updatedAccount);

      const result = await accountsService.changeBalance(operation);

      expect(result.balance).toBe(70);
    });

    it('должен выбросить ошибку при невалидной сумме', async () => {
      const operation = {
        accountId: '507f1f77bcf86cd799439013',
        amount: -50,
        type: 'credit' as const,
        description: 'Пополнение'
      };

      await expect(accountsService.changeBalance(operation))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('getAccountsStats', () => {
    it('должен вернуть статистику по лицевым счетам', async () => {
      (prisma.account.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // active
        .mockResolvedValueOnce(15)  // blocked
        .mockResolvedValueOnce(5)   // suspended
        .mockResolvedValueOnce(10); // low balance

      (prisma.account.aggregate as jest.Mock).mockResolvedValue({
        _sum: { balance: 50000 }
      });

      const result = await accountsService.getAccountsStats();

      expect(result).toEqual({
        totalAccounts: 100,
        activeAccounts: 80,
        blockedAccounts: 15,
        suspendedAccounts: 5,
        totalBalance: 50000,
        lowBalanceAccounts: 10,
        averageBalance: 500
      });
    });
  });
});