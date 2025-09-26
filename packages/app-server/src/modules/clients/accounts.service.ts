// Сервис для управления лицевыми счетами
import prisma from '../../common/database';
import { NotFoundError, ConflictError, ValidationError } from '../../common/errors';
import { 
  validateAccount, 
  validateObjectId, 
  validatePagination,
  validateAccountBusinessRules,
  normalizeMacAddress
} from './validation';
import {
  CreateAccountDto,
  UpdateAccountDto,
  AccountFilters,
  PaginationParams,
  PaginatedResult,
  AccountWithDetails,
  BalanceOperation
} from './types';
import { Account, AccountStatus } from '@prisma/client';
import { config } from '../../config/config';

export class AccountsService {

  // Генерация уникального номера лицевого счета
  private async generateAccountNumber(): Promise<string> {
    let accountNumber: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      // Генерируем номер в формате: год + месяц + случайные 6 цифр
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      
      accountNumber = `${year}${month}${random}`;
      
      // Проверяем уникальность
      const existing = await prisma.account.findUnique({
        where: { accountNumber }
      });
      
      if (!existing) {
        break;
      }
      
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Не удалось сгенерировать уникальный номер лицевого счета');
    }

    return accountNumber;
  }

  // Создание лицевого счета
  async createAccount(data: CreateAccountDto): Promise<AccountWithDetails> {
    validateAccount(data);
    validateAccountBusinessRules(data);

    // Проверяем существование клиента
    const client = await prisma.client.findUnique({
      where: { id: data.clientId }
    });

    if (!client) {
      throw new NotFoundError('Клиент не найден');
    }

    // Проверяем существование тарифа
    const tariff = await prisma.tariff.findUnique({
      where: { id: data.tariffId }
    });

    if (!tariff) {
      throw new NotFoundError('Тариф не найден');
    }

    if (!tariff.isActive) {
      throw new ConflictError('Нельзя создать лицевой счет с неактивным тарифом');
    }

    // Проверяем лимит лицевых счетов на клиента
    const existingAccounts = await prisma.account.count({
      where: { clientId: data.clientId }
    });

    if (existingAccounts >= 10) {
      throw new ConflictError('У клиента не может быть более 10 лицевых счетов');
    }

    // Проверяем уникальность MAC-адреса, если указан
    if (data.macAddress && data.macAddress.trim()) {
      const normalizedMac = normalizeMacAddress(data.macAddress.trim());
      
      const existingAccount = await prisma.account.findFirst({
        where: { macAddress: normalizedMac }
      });

      if (existingAccount) {
        throw new ConflictError(`MAC-адрес ${normalizedMac} уже используется`);
      }
    }

    // Проверяем существование устройства, если указано
    if (data.deviceId) {
      const device = await prisma.device.findUnique({
        where: { id: data.deviceId }
      });

      if (!device) {
        throw new NotFoundError('Устройство не найдено');
      }
    }

    // Генерируем номер лицевого счета
    const accountNumber = await this.generateAccountNumber();

    const account = await prisma.account.create({
      data: {
        accountNumber,
        clientId: data.clientId,
        tariffId: data.tariffId,
        balance: 0,
        status: AccountStatus.ACTIVE,
        macAddress: data.macAddress ? normalizeMacAddress(data.macAddress.trim()) : null,
        poolName: data.poolName?.trim() || 'default',
        blockThreshold: data.blockThreshold ?? config.billing.defaultBlockThreshold,
        deviceId: data.deviceId || null,
      }
    });

    return await this.getAccountWithDetails(account.id);
  }

  // Получение всех лицевых счетов с фильтрацией и пагинацией
  async getAccounts(
    filters: AccountFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<AccountWithDetails>> {
    const { page = 1, limit = 20, sortBy = 'accountNumber', sortOrder = 'asc' } = pagination;
    validatePagination(page, limit);

    const skip = (page - 1) * limit;

    // Строим условия фильтрации
    const where: any = {};

    if (filters.clientId) {
      validateObjectId(filters.clientId, 'ID клиента');
      where.clientId = filters.clientId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.tariffId) {
      validateObjectId(filters.tariffId, 'ID тарифа');
      where.tariffId = filters.tariffId;
    }

    if (filters.deviceId) {
      validateObjectId(filters.deviceId, 'ID устройства');
      where.deviceId = filters.deviceId;
    }

    if (filters.balanceMin !== undefined || filters.balanceMax !== undefined) {
      where.balance = {};
      if (filters.balanceMin !== undefined) {
        where.balance.gte = filters.balanceMin;
      }
      if (filters.balanceMax !== undefined) {
        where.balance.lte = filters.balanceMax;
      }
    }

    // Поиск по номеру счета или ФИО клиента
    if (filters.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { accountNumber: { contains: searchTerm } },
        { 
          client: {
            OR: [
              { firstName: { contains: searchTerm, mode: 'insensitive' } },
              { lastName: { contains: searchTerm, mode: 'insensitive' } },
              { middleName: { contains: searchTerm, mode: 'insensitive' } }
            ]
          }
        }
      ];
    }

    // Сортировка
    const orderBy: any = {};
    if (sortBy === 'clientName') {
      orderBy.client = { lastName: sortOrder };
    } else if (sortBy === 'tariffName') {
      orderBy.tariff = { name: sortOrder };
    } else {
      orderBy[sortBy] = sortOrder;
    }

    // Получаем данные и общее количество
    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              middleName: true,
              phones: true,
              email: true,
              address: true
            }
          },
          tariff: {
            select: {
              id: true,
              name: true,
              price: true,
              billingType: true,
              speedDown: true,
              speedUp: true
            }
          },
          device: {
            select: {
              id: true,
              ipAddress: true,
              description: true,
              status: true
            }
          }
        }
      }),
      prisma.account.count({ where })
    ]);

    return {
      data: accounts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Получение лицевого счета по ID
  async getAccountById(id: string): Promise<Account> {
    validateObjectId(id, 'ID лицевого счета');

    const account = await prisma.account.findUnique({
      where: { id }
    });

    if (!account) {
      throw new NotFoundError('Лицевой счет не найден');
    }

    return account;
  }

  // Получение лицевого счета с деталями
  async getAccountWithDetails(id: string): Promise<AccountWithDetails> {
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phones: true,
            email: true,
            address: true
          }
        },
        tariff: {
          select: {
            id: true,
            name: true,
            price: true,
            billingType: true,
            speedDown: true,
            speedUp: true
          }
        },
        device: {
          select: {
            id: true,
            ipAddress: true,
            description: true,
            status: true
          }
        }
      }
    });

    if (!account) {
      throw new NotFoundError('Лицевой счет не найден');
    }

    return account;
  }

  // Получение лицевого счета по номеру
  async getAccountByNumber(accountNumber: string): Promise<AccountWithDetails> {
    const account = await prisma.account.findUnique({
      where: { accountNumber },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phones: true,
            email: true,
            address: true
          }
        },
        tariff: {
          select: {
            id: true,
            name: true,
            price: true,
            billingType: true,
            speedDown: true,
            speedUp: true
          }
        },
        device: {
          select: {
            id: true,
            ipAddress: true,
            description: true,
            status: true
          }
        }
      }
    });

    if (!account) {
      throw new NotFoundError('Лицевой счет не найден');
    }

    return account;
  }

  // Обновление лицевого счета
  async updateAccount(id: string, data: UpdateAccountDto): Promise<AccountWithDetails> {
    validateObjectId(id, 'ID лицевого счета');
    
    // Проверяем существование лицевого счета
    const existingAccount = await this.getAccountById(id);

    // Валидируем данные для обновления
    if (Object.keys(data).length > 0) {
      const validationData = {
        ...data,
        clientId: existingAccount.clientId,
        tariffId: data.tariffId || existingAccount.tariffId
      };
      validateAccount(validationData);
      validateAccountBusinessRules(validationData);
    }

    const updateData: any = {};

    // Проверяем и обновляем тариф
    if (data.tariffId && data.tariffId !== existingAccount.tariffId) {
      const tariff = await prisma.tariff.findUnique({
        where: { id: data.tariffId }
      });

      if (!tariff) {
        throw new NotFoundError('Тариф не найден');
      }

      if (!tariff.isActive) {
        throw new ConflictError('Нельзя назначить неактивный тариф');
      }

      updateData.tariffId = data.tariffId;
    }

    // Проверяем и обновляем MAC-адрес
    if (data.macAddress !== undefined) {
      if (data.macAddress && data.macAddress.trim()) {
        const normalizedMac = normalizeMacAddress(data.macAddress.trim());
        
        if (normalizedMac !== existingAccount.macAddress) {
          const existingAccountByMac = await prisma.account.findFirst({
            where: {
              macAddress: normalizedMac,
              id: { not: id }
            }
          });

          if (existingAccountByMac) {
            throw new ConflictError(`MAC-адрес ${normalizedMac} уже используется`);
          }
        }
        
        updateData.macAddress = normalizedMac;
      } else {
        updateData.macAddress = null;
      }
    }

    // Проверяем и обновляем устройство
    if (data.deviceId !== undefined) {
      if (data.deviceId) {
        const device = await prisma.device.findUnique({
          where: { id: data.deviceId }
        });

        if (!device) {
          throw new NotFoundError('Устройство не найдено');
        }
        
        updateData.deviceId = data.deviceId;
      } else {
        updateData.deviceId = null;
      }
    }

    // Обновляем остальные поля
    if (data.poolName !== undefined) {
      updateData.poolName = data.poolName?.trim() || 'default';
    }

    if (data.blockThreshold !== undefined) {
      updateData.blockThreshold = data.blockThreshold;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    await prisma.account.update({
      where: { id },
      data: updateData
    });

    return await this.getAccountWithDetails(id);
  }

  // Удаление лицевого счета
  async deleteAccount(id: string): Promise<void> {
    validateObjectId(id, 'ID лицевого счета');

    // Проверяем существование лицевого счета
    await this.getAccountById(id);

    // Проверяем, есть ли платежи по счету
    const paymentsCount = await prisma.payment.count({
      where: { accountId: id }
    });

    if (paymentsCount > 0) {
      throw new ConflictError('Невозможно удалить лицевой счет с историей платежей');
    }

    await prisma.account.delete({
      where: { id }
    });
  }

  // Блокировка лицевого счета
  async blockAccount(id: string, reason?: string): Promise<AccountWithDetails> {
    validateObjectId(id, 'ID лицевого счета');

    const account = await this.getAccountById(id);

    if (account.status === AccountStatus.BLOCKED) {
      throw new ConflictError('Лицевой счет уже заблокирован');
    }

    await prisma.account.update({
      where: { id },
      data: { status: AccountStatus.BLOCKED }
    });

    // TODO: Отправить команду в Kafka для блокировки на MikroTik
    // TODO: Отправить уведомление клиенту

    return await this.getAccountWithDetails(id);
  }

  // Разблокировка лицевого счета
  async unblockAccount(id: string): Promise<AccountWithDetails> {
    validateObjectId(id, 'ID лицевого счета');

    const account = await this.getAccountById(id);

    if (account.status !== AccountStatus.BLOCKED) {
      throw new ConflictError('Лицевой счет не заблокирован');
    }

    await prisma.account.update({
      where: { id },
      data: { status: AccountStatus.ACTIVE }
    });

    // TODO: Отправить команду в Kafka для разблокировки на MikroTik
    // TODO: Отправить уведомление клиенту

    return await this.getAccountWithDetails(id);
  }

  // Приостановка лицевого счета
  async suspendAccount(id: string, reason?: string): Promise<AccountWithDetails> {
    validateObjectId(id, 'ID лицевого счета');

    const account = await this.getAccountById(id);

    if (account.status === AccountStatus.SUSPENDED) {
      throw new ConflictError('Лицевой счет уже приостановлен');
    }

    await prisma.account.update({
      where: { id },
      data: { status: AccountStatus.SUSPENDED }
    });

    return await this.getAccountWithDetails(id);
  }

  // Возобновление лицевого счета
  async resumeAccount(id: string): Promise<AccountWithDetails> {
    validateObjectId(id, 'ID лицевого счета');

    const account = await this.getAccountById(id);

    if (account.status !== AccountStatus.SUSPENDED) {
      throw new ConflictError('Лицевой счет не приостановлен');
    }

    await prisma.account.update({
      where: { id },
      data: { status: AccountStatus.ACTIVE }
    });

    return await this.getAccountWithDetails(id);
  }

  // Изменение баланса
  async changeBalance(operation: BalanceOperation): Promise<AccountWithDetails> {
    validateObjectId(operation.accountId, 'ID лицевого счета');

    if (typeof operation.amount !== 'number' || operation.amount <= 0) {
      throw new ValidationError('Сумма должна быть положительным числом');
    }

    const account = await this.getAccountById(operation.accountId);

    let newBalance: number;
    
    if (operation.type === 'credit') {
      newBalance = account.balance + operation.amount;
    } else if (operation.type === 'debit') {
      newBalance = account.balance - operation.amount;
    } else {
      throw new ValidationError('Тип операции должен быть credit или debit');
    }

    await prisma.account.update({
      where: { id: operation.accountId },
      data: { balance: newBalance }
    });

    // TODO: Записать операцию в историю транзакций
    // TODO: Проверить пороги и отправить уведомления при необходимости

    return await this.getAccountWithDetails(operation.accountId);
  }

  // Получение лицевых счетов клиента
  async getClientAccounts(clientId: string): Promise<AccountWithDetails[]> {
    validateObjectId(clientId, 'ID клиента');

    const accounts = await prisma.account.findMany({
      where: { clientId },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phones: true,
            email: true,
            address: true
          }
        },
        tariff: {
          select: {
            id: true,
            name: true,
            price: true,
            billingType: true,
            speedDown: true,
            speedUp: true
          }
        },
        device: {
          select: {
            id: true,
            ipAddress: true,
            description: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return accounts;
  }

  // Получение лицевых счетов с низким балансом
  async getLowBalanceAccounts(threshold?: number): Promise<AccountWithDetails[]> {
    const balanceThreshold = threshold ?? 100; // По умолчанию 100 рублей

    const accounts = await prisma.account.findMany({
      where: {
        status: AccountStatus.ACTIVE,
        balance: { lte: balanceThreshold }
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            phones: true,
            email: true,
            address: true
          }
        },
        tariff: {
          select: {
            id: true,
            name: true,
            price: true,
            billingType: true,
            speedDown: true,
            speedUp: true
          }
        },
        device: {
          select: {
            id: true,
            ipAddress: true,
            description: true,
            status: true
          }
        }
      },
      orderBy: { balance: 'asc' }
    });

    return accounts;
  }

  // Получение статистики по лицевым счетам
  async getAccountsStats() {
    const [
      totalAccounts,
      activeAccounts,
      blockedAccounts,
      suspendedAccounts,
      totalBalance,
      lowBalanceAccounts
    ] = await Promise.all([
      prisma.account.count(),
      prisma.account.count({ where: { status: AccountStatus.ACTIVE } }),
      prisma.account.count({ where: { status: AccountStatus.BLOCKED } }),
      prisma.account.count({ where: { status: AccountStatus.SUSPENDED } }),
      prisma.account.aggregate({
        _sum: { balance: true }
      }),
      prisma.account.count({
        where: {
          status: AccountStatus.ACTIVE,
          balance: { lte: 100 }
        }
      })
    ]);

    return {
      totalAccounts,
      activeAccounts,
      blockedAccounts,
      suspendedAccounts,
      totalBalance: totalBalance._sum.balance || 0,
      lowBalanceAccounts,
      averageBalance: totalAccounts > 0 
        ? (totalBalance._sum.balance || 0) / totalAccounts 
        : 0
    };
  }
}