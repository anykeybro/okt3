// Сервис для управления услугами
import prisma from '../../common/database';
import { NotFoundError, ConflictError } from '../../common/errors';
import { validateService, validateObjectId, validatePagination } from './validation';
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceFilters,
  PaginationParams,
  PaginatedResult
} from './types';
import { Service } from '@prisma/client';

export class ServicesService {
  // Создание услуги
  async createService(data: CreateServiceDto): Promise<Service> {
    validateService(data);

    // Проверяем уникальность названия
    const existingService = await prisma.service.findUnique({
      where: { name: data.name.trim() }
    });

    if (existingService) {
      throw new ConflictError('Услуга с таким названием уже существует');
    }

    return await prisma.service.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim(),
        type: data.type,
        isActive: data.isActive ?? true,
      }
    });
  }

  // Получение всех услуг с фильтрацией и пагинацией
  async getServices(
    filters: ServiceFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<Service>> {
    const { page = 1, limit = 20 } = pagination;
    validatePagination(page, limit);

    const skip = (page - 1) * limit;

    // Строим условия фильтрации
    const where: any = {};

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    // Получаем данные и общее количество
    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.service.count({ where })
    ]);

    return {
      data: services,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Получение услуги по ID
  async getServiceById(id: string): Promise<Service> {
    validateObjectId(id, 'ID услуги');

    const service = await prisma.service.findUnique({
      where: { id }
    });

    if (!service) {
      throw new NotFoundError('Услуга не найдена');
    }

    return service;
  }

  // Обновление услуги
  async updateService(id: string, data: UpdateServiceDto): Promise<Service> {
    validateObjectId(id, 'ID услуги');
    
    // Проверяем существование услуги
    await this.getServiceById(id);

    // Валидируем данные для обновления
    if (Object.keys(data).length > 0) {
      validateService({ ...data, name: data.name || 'temp', type: data.type || 'INTERNET' });
    }

    // Проверяем уникальность названия, если оно изменяется
    if (data.name) {
      const existingService = await prisma.service.findFirst({
        where: {
          name: data.name.trim(),
          id: { not: id }
        }
      });

      if (existingService) {
        throw new ConflictError('Услуга с таким названием уже существует');
      }
    }

    const updateData: any = {};
    
    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description?.trim();
    }
    if (data.type !== undefined) {
      updateData.type = data.type;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    return await prisma.service.update({
      where: { id },
      data: updateData
    });
  }

  // Удаление услуги
  async deleteService(id: string): Promise<void> {
    validateObjectId(id, 'ID услуги');

    // Проверяем существование услуги
    await this.getServiceById(id);

    // Проверяем, не используется ли услуга в тарифах
    const tariffsUsingService = await prisma.tariff.findMany({
      where: {
        serviceIds: {
          has: id
        }
      },
      select: { id: true, name: true }
    });

    if (tariffsUsingService.length > 0) {
      const tariffNames = tariffsUsingService.map(t => t.name).join(', ');
      throw new ConflictError(
        `Невозможно удалить услугу. Она используется в тарифах: ${tariffNames}`
      );
    }

    await prisma.service.delete({
      where: { id }
    });
  }

  // Получение активных услуг (для использования в тарифах)
  async getActiveServices(): Promise<Service[]> {
    return await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  // Получение услуг по массиву ID
  async getServicesByIds(ids: string[]): Promise<Service[]> {
    if (!Array.isArray(ids) || ids.length === 0) {
      return [];
    }

    // Валидируем все ID
    ids.forEach(id => validateObjectId(id, 'ID услуги'));

    return await prisma.service.findMany({
      where: {
        id: { in: ids }
      },
      orderBy: { name: 'asc' }
    });
  }

  // Проверка существования услуг по массиву ID
  async validateServiceIds(ids: string[]): Promise<void> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('Список ID услуг не может быть пустым');
    }

    const services = await this.getServicesByIds(ids);
    
    if (services.length !== ids.length) {
      const foundIds = services.map(s => s.id);
      const missingIds = ids.filter(id => !foundIds.includes(id));
      throw new NotFoundError(`Услуги не найдены: ${missingIds.join(', ')}`);
    }

    // Проверяем, что все услуги активны
    const inactiveServices = services.filter(s => !s.isActive);
    if (inactiveServices.length > 0) {
      const inactiveNames = inactiveServices.map(s => s.name).join(', ');
      throw new ConflictError(`Неактивные услуги нельзя добавлять в тариф: ${inactiveNames}`);
    }
  }
}