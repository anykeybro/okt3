// Сервис для управления группами тарифов
import prisma from '../../common/database';
import { NotFoundError, ConflictError } from '../../common/errors';
import { validateTariffGroup, validateObjectId, validatePagination } from './validation';
import {
  CreateTariffGroupDto,
  UpdateTariffGroupDto,
  TariffGroupFilters,
  PaginationParams,
  PaginatedResult
} from './types';
import { TariffGroup } from '@prisma/client';

export class TariffGroupsService {
  // Создание группы тарифов
  async createTariffGroup(data: CreateTariffGroupDto): Promise<TariffGroup> {
    validateTariffGroup(data);

    // Проверяем уникальность названия
    const existingGroup = await prisma.tariffGroup.findUnique({
      where: { name: data.name.trim() }
    });

    if (existingGroup) {
      throw new ConflictError('Группа тарифов с таким названием уже существует');
    }

    return await prisma.tariffGroup.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim(),
      }
    });
  }

  // Получение всех групп тарифов с фильтрацией и пагинацией
  async getTariffGroups(
    filters: TariffGroupFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<TariffGroup & { _count: { tariffs: number } }>> {
    const { page = 1, limit = 20 } = pagination;
    validatePagination(page, limit);

    const skip = (page - 1) * limit;

    // Строим условия фильтрации
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    // Получаем данные и общее количество
    const [groups, total] = await Promise.all([
      prisma.tariffGroup.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { tariffs: true }
          }
        }
      }),
      prisma.tariffGroup.count({ where })
    ]);

    return {
      data: groups,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Получение группы тарифов по ID
  async getTariffGroupById(id: string): Promise<TariffGroup> {
    validateObjectId(id, 'ID группы тарифов');

    const group = await prisma.tariffGroup.findUnique({
      where: { id }
    });

    if (!group) {
      throw new NotFoundError('Группа тарифов не найдена');
    }

    return group;
  }

  // Получение группы тарифов с тарифами
  async getTariffGroupWithTariffs(id: string) {
    validateObjectId(id, 'ID группы тарифов');

    const group = await prisma.tariffGroup.findUnique({
      where: { id },
      include: {
        tariffs: {
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: { accounts: true }
            }
          }
        }
      }
    });

    if (!group) {
      throw new NotFoundError('Группа тарифов не найдена');
    }

    return group;
  }

  // Обновление группы тарифов
  async updateTariffGroup(id: string, data: UpdateTariffGroupDto): Promise<TariffGroup> {
    validateObjectId(id, 'ID группы тарифов');
    
    // Проверяем существование группы
    await this.getTariffGroupById(id);

    // Валидируем данные для обновления
    if (Object.keys(data).length > 0) {
      validateTariffGroup({ ...data, name: data.name || 'temp' });
    }

    // Проверяем уникальность названия, если оно изменяется
    if (data.name) {
      const existingGroup = await prisma.tariffGroup.findFirst({
        where: {
          name: data.name.trim(),
          id: { not: id }
        }
      });

      if (existingGroup) {
        throw new ConflictError('Группа тарифов с таким названием уже существует');
      }
    }

    const updateData: any = {};
    
    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim();
    }

    return await prisma.tariffGroup.update({
      where: { id },
      data: updateData
    });
  }

  // Удаление группы тарифов
  async deleteTariffGroup(id: string): Promise<void> {
    validateObjectId(id, 'ID группы тарифов');

    // Проверяем существование группы
    await this.getTariffGroupById(id);

    // Проверяем, есть ли тарифы в группе
    const tariffsInGroup = await prisma.tariff.findMany({
      where: { groupId: id },
      select: { id: true, name: true }
    });

    if (tariffsInGroup.length > 0) {
      const tariffNames = tariffsInGroup.map(t => t.name).join(', ');
      throw new ConflictError(
        `Невозможно удалить группу тарифов. В ней есть тарифы: ${tariffNames}`
      );
    }

    await prisma.tariffGroup.delete({
      where: { id }
    });
  }

  // Получение всех групп тарифов (для селектов)
  async getAllTariffGroups(): Promise<TariffGroup[]> {
    return await prisma.tariffGroup.findMany({
      orderBy: { name: 'asc' }
    });
  }

  // Перемещение тарифов из одной группы в другую
  async moveTariffsToGroup(fromGroupId: string, toGroupId: string | null): Promise<void> {
    validateObjectId(fromGroupId, 'ID исходной группы');
    
    if (toGroupId) {
      validateObjectId(toGroupId, 'ID целевой группы');
      // Проверяем существование целевой группы
      await this.getTariffGroupById(toGroupId);
    }

    // Проверяем существование исходной группы
    await this.getTariffGroupById(fromGroupId);

    // Перемещаем все тарифы
    await prisma.tariff.updateMany({
      where: { groupId: fromGroupId },
      data: { groupId: toGroupId }
    });
  }

  // Получение статистики по группе
  async getTariffGroupStats(id: string) {
    validateObjectId(id, 'ID группы тарифов');

    const group = await prisma.tariffGroup.findUnique({
      where: { id },
      include: {
        tariffs: {
          include: {
            _count: {
              select: { accounts: true }
            }
          }
        }
      }
    });

    if (!group) {
      throw new NotFoundError('Группа тарифов не найдена');
    }

    const stats = {
      totalTariffs: group.tariffs.length,
      activeTariffs: group.tariffs.filter(t => t.isActive).length,
      totalAccounts: group.tariffs.reduce((sum, t) => sum + t._count.accounts, 0),
      averagePrice: group.tariffs.length > 0 
        ? group.tariffs.reduce((sum, t) => sum + t.price, 0) / group.tariffs.length 
        : 0,
      priceRange: group.tariffs.length > 0 
        ? {
            min: Math.min(...group.tariffs.map(t => t.price)),
            max: Math.max(...group.tariffs.map(t => t.price))
          }
        : { min: 0, max: 0 }
    };

    return {
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      },
      stats
    };
  }
}