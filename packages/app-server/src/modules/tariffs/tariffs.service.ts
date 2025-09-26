// Сервис для управления тарифами
import prisma from '../../common/database';
import { NotFoundError, ConflictError } from '../../common/errors';
import { validateTariff, validateObjectId, validatePagination, validateTariffBusinessRules } from './validation';
import {
  CreateTariffDto,
  UpdateTariffDto,
  TariffFilters,
  PaginationParams,
  PaginatedResult,
  TariffWithServices
} from './types';
import { Tariff } from '@prisma/client';
import { ServicesService } from './services.service';
import { TariffGroupsService } from './tariff-groups.service';

export class TariffsService {
  private servicesService: ServicesService;
  private tariffGroupsService: TariffGroupsService;

  constructor() {
    this.servicesService = new ServicesService();
    this.tariffGroupsService = new TariffGroupsService();
  }

  // Создание тарифа
  async createTariff(data: CreateTariffDto): Promise<TariffWithServices> {
    validateTariff(data);
    validateTariffBusinessRules(data);

    // Проверяем уникальность названия
    const existingTariff = await prisma.tariff.findUnique({
      where: { name: data.name.trim() }
    });

    if (existingTariff) {
      throw new ConflictError('Тариф с таким названием уже существует');
    }

    // Проверяем существование услуг
    await this.servicesService.validateServiceIds(data.serviceIds);

    // Проверяем существование группы тарифов, если указана
    if (data.groupId) {
      await this.tariffGroupsService.getTariffGroupById(data.groupId);
    }

    const tariff = await prisma.tariff.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim(),
        price: data.price,
        billingType: data.billingType,
        speedDown: data.speedDown,
        speedUp: data.speedUp,
        serviceIds: data.serviceIds,
        groupId: data.groupId,
        isVisibleInLK: data.isVisibleInLK ?? true,
        notificationDays: data.notificationDays ?? 3,
        isActive: data.isActive ?? true,
      }
    });

    return await this.getTariffWithServices(tariff.id);
  }

  // Получение всех тарифов с фильтрацией и пагинацией
  async getTariffs(
    filters: TariffFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<TariffWithServices>> {
    const { page = 1, limit = 20 } = pagination;
    validatePagination(page, limit);

    const skip = (page - 1) * limit;

    // Строим условия фильтрации
    const where: any = {};

    if (filters.billingType) {
      where.billingType = filters.billingType;
    }

    if (filters.groupId) {
      where.groupId = filters.groupId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isVisibleInLK !== undefined) {
      where.isVisibleInLK = filters.isVisibleInLK;
    }

    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      where.price = {};
      if (filters.priceMin !== undefined) {
        where.price.gte = filters.priceMin;
      }
      if (filters.priceMax !== undefined) {
        where.price.lte = filters.priceMax;
      }
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    // Получаем данные и общее количество
    const [tariffs, total] = await Promise.all([
      prisma.tariff.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          group: {
            select: { id: true, name: true }
          }
        }
      }),
      prisma.tariff.count({ where })
    ]);

    // Получаем услуги для каждого тарифа
    const tariffsWithServices = await Promise.all(
      tariffs.map(async (tariff) => {
        const services = await this.servicesService.getServicesByIds(tariff.serviceIds);
        return {
          ...tariff,
          services: services.map(s => ({
            id: s.id,
            name: s.name,
            type: s.type
          }))
        };
      })
    );

    return {
      data: tariffsWithServices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Получение тарифа по ID
  async getTariffById(id: string): Promise<Tariff> {
    validateObjectId(id, 'ID тарифа');

    const tariff = await prisma.tariff.findUnique({
      where: { id }
    });

    if (!tariff) {
      throw new NotFoundError('Тариф не найден');
    }

    return tariff;
  }

  // Получение тарифа с услугами
  async getTariffWithServices(id: string): Promise<TariffWithServices> {
    const tariff = await prisma.tariff.findUnique({
      where: { id },
      include: {
        group: {
          select: { id: true, name: true }
        }
      }
    });

    if (!tariff) {
      throw new NotFoundError('Тариф не найден');
    }

    const services = await this.servicesService.getServicesByIds(tariff.serviceIds);

    return {
      ...tariff,
      services: services.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type
      }))
    };
  }

  // Обновление тарифа
  async updateTariff(id: string, data: UpdateTariffDto): Promise<TariffWithServices> {
    validateObjectId(id, 'ID тарифа');
    
    // Проверяем существование тарифа
    await this.getTariffById(id);

    // Валидируем данные для обновления
    if (Object.keys(data).length > 0) {
      const validationData = {
        ...data,
        name: data.name || 'temp',
        price: data.price ?? 100,
        billingType: data.billingType || 'PREPAID_MONTHLY',
        speedDown: data.speedDown ?? 100,
        speedUp: data.speedUp ?? 100,
        serviceIds: data.serviceIds || ['507f1f77bcf86cd799439011']
      };
      validateTariff(validationData);
      validateTariffBusinessRules(validationData);
    }

    // Проверяем уникальность названия, если оно изменяется
    if (data.name) {
      const existingTariff = await prisma.tariff.findFirst({
        where: {
          name: data.name.trim(),
          id: { not: id }
        }
      });

      if (existingTariff) {
        throw new ConflictError('Тариф с таким названием уже существует');
      }
    }

    // Проверяем существование услуг, если они изменяются
    if (data.serviceIds) {
      await this.servicesService.validateServiceIds(data.serviceIds);
    }

    // Проверяем существование группы тарифов, если она изменяется
    if (data.groupId) {
      await this.tariffGroupsService.getTariffGroupById(data.groupId);
    }

    const updateData: any = {};
    
    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim();
    }
    if (data.price !== undefined) {
      updateData.price = data.price;
    }
    if (data.billingType !== undefined) {
      updateData.billingType = data.billingType;
    }
    if (data.speedDown !== undefined) {
      updateData.speedDown = data.speedDown;
    }
    if (data.speedUp !== undefined) {
      updateData.speedUp = data.speedUp;
    }
    if (data.serviceIds !== undefined) {
      updateData.serviceIds = data.serviceIds;
    }
    if (data.groupId !== undefined) {
      updateData.groupId = data.groupId;
    }
    if (data.isVisibleInLK !== undefined) {
      updateData.isVisibleInLK = data.isVisibleInLK;
    }
    if (data.notificationDays !== undefined) {
      updateData.notificationDays = data.notificationDays;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    await prisma.tariff.update({
      where: { id },
      data: updateData
    });

    return await this.getTariffWithServices(id);
  }

  // Удаление тарифа
  async deleteTariff(id: string): Promise<void> {
    validateObjectId(id, 'ID тарифа');

    // Проверяем существование тарифа
    await this.getTariffById(id);

    // Проверяем, не используется ли тариф в лицевых счетах
    const accountsUsingTariff = await prisma.account.findMany({
      where: { tariffId: id },
      select: { id: true, accountNumber: true }
    });

    if (accountsUsingTariff.length > 0) {
      const accountNumbers = accountsUsingTariff.map(a => a.accountNumber).join(', ');
      throw new ConflictError(
        `Невозможно удалить тариф. Он используется в лицевых счетах: ${accountNumbers}`
      );
    }

    await prisma.tariff.delete({
      where: { id }
    });
  }

  // Получение активных тарифов для личного кабинета
  async getVisibleTariffs(groupId?: string): Promise<TariffWithServices[]> {
    const where: any = {
      isActive: true,
      isVisibleInLK: true
    };

    if (groupId) {
      validateObjectId(groupId, 'ID группы тарифов');
      where.groupId = groupId;
    }

    const tariffs = await prisma.tariff.findMany({
      where,
      orderBy: { price: 'asc' },
      include: {
        group: {
          select: { id: true, name: true }
        }
      }
    });

    // Получаем услуги для каждого тарифа
    return await Promise.all(
      tariffs.map(async (tariff) => {
        const services = await this.servicesService.getServicesByIds(tariff.serviceIds);
        return {
          ...tariff,
          services: services.map(s => ({
            id: s.id,
            name: s.name,
            type: s.type
          }))
        };
      })
    );
  }

  // Получение статистики по тарифу
  async getTariffStats(id: string) {
    validateObjectId(id, 'ID тарифа');

    const tariff = await prisma.tariff.findUnique({
      where: { id },
      include: {
        accounts: {
          select: {
            id: true,
            status: true,
            balance: true
          }
        },
        group: {
          select: { id: true, name: true }
        }
      }
    });

    if (!tariff) {
      throw new NotFoundError('Тариф не найден');
    }

    const services = await this.servicesService.getServicesByIds(tariff.serviceIds);

    const stats = {
      totalAccounts: tariff.accounts.length,
      activeAccounts: tariff.accounts.filter(a => a.status === 'ACTIVE').length,
      blockedAccounts: tariff.accounts.filter(a => a.status === 'BLOCKED').length,
      suspendedAccounts: tariff.accounts.filter(a => a.status === 'SUSPENDED').length,
      totalBalance: tariff.accounts.reduce((sum, a) => sum + a.balance, 0),
      averageBalance: tariff.accounts.length > 0 
        ? tariff.accounts.reduce((sum, a) => sum + a.balance, 0) / tariff.accounts.length 
        : 0
    };

    return {
      tariff: {
        ...tariff,
        services: services.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type
        }))
      },
      stats
    };
  }

  // Копирование тарифа
  async copyTariff(id: string, newName: string): Promise<TariffWithServices> {
    validateObjectId(id, 'ID тарифа');

    const originalTariff = await this.getTariffById(id);

    // Проверяем уникальность нового названия
    const existingTariff = await prisma.tariff.findUnique({
      where: { name: newName.trim() }
    });

    if (existingTariff) {
      throw new ConflictError('Тариф с таким названием уже существует');
    }

    const newTariff = await prisma.tariff.create({
      data: {
        name: newName.trim(),
        description: originalTariff.description ? `Копия: ${originalTariff.description}` : 'Копия тарифа',
        price: originalTariff.price,
        billingType: originalTariff.billingType,
        speedDown: originalTariff.speedDown,
        speedUp: originalTariff.speedUp,
        serviceIds: originalTariff.serviceIds,
        groupId: originalTariff.groupId,
        isVisibleInLK: false, // Копия по умолчанию скрыта
        notificationDays: originalTariff.notificationDays,
        isActive: false, // Копия по умолчанию неактивна
      }
    });

    return await this.getTariffWithServices(newTariff.id);
  }
}