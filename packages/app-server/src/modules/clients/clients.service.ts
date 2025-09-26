// Сервис для управления абонентами
import prisma from '../../common/database';
import { NotFoundError, ConflictError, ValidationError, ExternalServiceError } from '../../common/errors';
import { 
  validateClient, 
  validateObjectId, 
  validatePagination, 
  validateClientFilters,
  validateClientBusinessRules,
  normalizePhoneNumber,
  normalizeMacAddress
} from './validation';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientFilters,
  PaginationParams,
  PaginatedResult,
  ClientWithAccounts,
  ClientStats,
  ClientSearchResult,
  ClientAction
} from './types';
import { Client } from '@prisma/client';
import { GeocodingService } from './geocoding.service';

export class ClientsService {
  private geocodingService: GeocodingService;

  constructor() {
    this.geocodingService = new GeocodingService();
  }

  // Создание абонента
  async createClient(data: CreateClientDto): Promise<ClientWithAccounts> {
    validateClient(data);
    validateClientBusinessRules(data);

    // Нормализуем телефоны
    const normalizedPhones = data.phones.map(phone => normalizePhoneNumber(phone));

    // Проверяем уникальность основного телефона
    const existingClient = await prisma.client.findFirst({
      where: {
        phones: {
          has: normalizedPhones[0]
        }
      }
    });

    if (existingClient) {
      throw new ConflictError(`Абонент с телефоном ${normalizedPhones[0]} уже существует`);
    }

    // Проверяем уникальность email, если указан
    if (data.email && data.email.trim()) {
      const existingClientByEmail = await prisma.client.findFirst({
        where: { email: data.email.trim().toLowerCase() }
      });

      if (existingClientByEmail) {
        throw new ConflictError(`Абонент с email ${data.email} уже существует`);
      }
    }

    // Проверяем уникальность Telegram ID, если указан
    if (data.telegramId && data.telegramId.trim()) {
      const telegramId = data.telegramId.trim().startsWith('@') 
        ? data.telegramId.trim() 
        : `@${data.telegramId.trim()}`;

      const existingClientByTelegram = await prisma.client.findFirst({
        where: { telegramId }
      });

      if (existingClientByTelegram) {
        throw new ConflictError(`Абонент с Telegram ID ${telegramId} уже существует`);
      }
    }

    // Геокодирование адреса, если указан
    let coordinates = data.coordinates;
    let formattedAddress = data.address;

    if (data.address && data.address.trim() && !coordinates) {
      try {
        const geocodeResult = await this.geocodingService.geocodeAddress({ 
          address: data.address.trim() 
        });
        
        if (geocodeResult.coordinates && !geocodeResult.error) {
          coordinates = geocodeResult.coordinates;
          formattedAddress = geocodeResult.formattedAddress || data.address;
        }
      } catch (error) {
        // Геокодирование не критично, продолжаем без координат
        console.warn('Не удалось геокодировать адрес:', error);
      }
    }

    const client = await prisma.client.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        middleName: data.middleName?.trim() || null,
        phones: normalizedPhones,
        email: data.email?.trim().toLowerCase() || null,
        telegramId: data.telegramId?.trim().startsWith('@') 
          ? data.telegramId.trim() 
          : data.telegramId?.trim() ? `@${data.telegramId.trim()}` : null,
        address: formattedAddress?.trim() || null,
        coordinates: coordinates ? JSON.parse(JSON.stringify(coordinates)) : null,
      }
    });

    return await this.getClientWithAccounts(client.id);
  }

  // Получение всех абонентов с фильтрацией и пагинацией
  async getClients(
    filters: ClientFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<ClientWithAccounts>> {
    const { page = 1, limit = 20, sortBy = 'lastName', sortOrder = 'asc' } = pagination;
    validatePagination(page, limit);
    validateClientFilters(filters);

    const skip = (page - 1) * limit;

    // Строим условия фильтрации
    const where: any = {};

    // Поиск по ФИО, телефону, адресу
    if (filters.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { middleName: { contains: searchTerm, mode: 'insensitive' } },
        { phones: { has: searchTerm } },
        { address: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Фильтр по наличию email
    if (filters.hasEmail !== undefined) {
      if (filters.hasEmail) {
        where.email = { not: null };
      } else {
        where.email = null;
      }
    }

    // Фильтр по наличию Telegram
    if (filters.hasTelegram !== undefined) {
      if (filters.hasTelegram) {
        where.telegramId = { not: null };
      } else {
        where.telegramId = null;
      }
    }

    // Фильтры по датам
    if (filters.createdFrom || filters.createdTo) {
      where.createdAt = {};
      if (filters.createdFrom) {
        where.createdAt.gte = new Date(filters.createdFrom);
      }
      if (filters.createdTo) {
        where.createdTo.lte = new Date(filters.createdTo);
      }
    }

    // Фильтры по лицевым счетам
    if (filters.status || filters.tariffId || filters.deviceId || filters.balanceMin !== undefined || filters.balanceMax !== undefined) {
      where.accounts = { some: {} };
      
      if (filters.status) {
        where.accounts.some.status = filters.status;
      }
      
      if (filters.tariffId) {
        where.accounts.some.tariffId = filters.tariffId;
      }
      
      if (filters.deviceId) {
        where.accounts.some.deviceId = filters.deviceId;
      }
      
      if (filters.balanceMin !== undefined || filters.balanceMax !== undefined) {
        where.accounts.some.balance = {};
        if (filters.balanceMin !== undefined) {
          where.accounts.some.balance.gte = filters.balanceMin;
        }
        if (filters.balanceMax !== undefined) {
          where.accounts.some.balance.lte = filters.balanceMax;
        }
      }
    }

    // Сортировка
    const orderBy: any = {};
    if (sortBy === 'fullName') {
      orderBy.lastName = sortOrder;
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
    }

    // Получаем данные и общее количество
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          accounts: {
            include: {
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
          }
        }
      }),
      prisma.client.count({ where })
    ]);

    return {
      data: clients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Получение абонента по ID
  async getClientById(id: string): Promise<Client> {
    validateObjectId(id, 'ID абонента');

    const client = await prisma.client.findUnique({
      where: { id }
    });

    if (!client) {
      throw new NotFoundError('Абонент не найден');
    }

    return client;
  }

  // Получение абонента с лицевыми счетами
  async getClientWithAccounts(id: string): Promise<ClientWithAccounts> {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        accounts: {
          include: {
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
        }
      }
    });

    if (!client) {
      throw new NotFoundError('Абонент не найден');
    }

    return client;
  }

  // Обновление абонента
  async updateClient(id: string, data: UpdateClientDto): Promise<ClientWithAccounts> {
    validateObjectId(id, 'ID абонента');
    
    // Проверяем существование абонента
    const existingClient = await this.getClientById(id);

    // Валидируем данные для обновления
    if (Object.keys(data).length > 0) {
      const validationData = {
        ...data,
        firstName: data.firstName || existingClient.firstName,
        lastName: data.lastName || existingClient.lastName,
        phones: data.phones || existingClient.phones
      };
      validateClient(validationData);
      validateClientBusinessRules(validationData, existingClient);
    }

    const updateData: any = {};

    // Обновляем основные поля
    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName.trim();
    }
    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName.trim();
    }
    if (data.middleName !== undefined) {
      updateData.middleName = data.middleName?.trim() || null;
    }

    // Обновляем телефоны
    if (data.phones !== undefined) {
      const normalizedPhones = data.phones.map(phone => normalizePhoneNumber(phone));
      
      // Проверяем уникальность основного телефона
      if (normalizedPhones[0] !== existingClient.phones[0]) {
        const existingClientByPhone = await prisma.client.findFirst({
          where: {
            phones: { has: normalizedPhones[0] },
            id: { not: id }
          }
        });

        if (existingClientByPhone) {
          throw new ConflictError(`Абонент с телефоном ${normalizedPhones[0]} уже существует`);
        }
      }
      
      updateData.phones = normalizedPhones;
    }

    // Обновляем email
    if (data.email !== undefined) {
      const email = data.email?.trim().toLowerCase() || null;
      
      if (email && email !== existingClient.email) {
        const existingClientByEmail = await prisma.client.findFirst({
          where: {
            email,
            id: { not: id }
          }
        });

        if (existingClientByEmail) {
          throw new ConflictError(`Абонент с email ${email} уже существует`);
        }
      }
      
      updateData.email = email;
    }

    // Обновляем Telegram ID
    if (data.telegramId !== undefined) {
      const telegramId = data.telegramId?.trim() 
        ? (data.telegramId.trim().startsWith('@') ? data.telegramId.trim() : `@${data.telegramId.trim()}`)
        : null;
      
      if (telegramId && telegramId !== existingClient.telegramId) {
        const existingClientByTelegram = await prisma.client.findFirst({
          where: {
            telegramId,
            id: { not: id }
          }
        });

        if (existingClientByTelegram) {
          throw new ConflictError(`Абонент с Telegram ID ${telegramId} уже существует`);
        }
      }
      
      updateData.telegramId = telegramId;
    }

    // Обновляем адрес и координаты
    if (data.address !== undefined || data.coordinates !== undefined) {
      let coordinates = data.coordinates;
      let formattedAddress = data.address?.trim() || null;

      // Если адрес изменился, но координаты не указаны, пытаемся геокодировать
      if (data.address !== undefined && data.coordinates === undefined && formattedAddress) {
        try {
          const geocodeResult = await this.geocodingService.geocodeAddress({ 
            address: formattedAddress 
          });
          
          if (geocodeResult.coordinates && !geocodeResult.error) {
            coordinates = geocodeResult.coordinates;
            formattedAddress = geocodeResult.formattedAddress || formattedAddress;
          }
        } catch (error) {
          console.warn('Не удалось геокодировать адрес:', error);
        }
      }

      updateData.address = formattedAddress;
      if (coordinates !== undefined) {
        updateData.coordinates = coordinates ? JSON.parse(JSON.stringify(coordinates)) : null;
      }
    }

    await prisma.client.update({
      where: { id },
      data: updateData
    });

    return await this.getClientWithAccounts(id);
  }

  // Удаление абонента
  async deleteClient(id: string): Promise<void> {
    validateObjectId(id, 'ID абонента');

    // Проверяем существование абонента
    await this.getClientById(id);

    // Проверяем, есть ли у абонента лицевые счета
    const accounts = await prisma.account.findMany({
      where: { clientId: id },
      select: { id: true, accountNumber: true, status: true }
    });

    if (accounts.length > 0) {
      const activeAccounts = accounts.filter(a => a.status === 'ACTIVE');
      if (activeAccounts.length > 0) {
        const accountNumbers = activeAccounts.map(a => a.accountNumber).join(', ');
        throw new ConflictError(
          `Невозможно удалить абонента. У него есть активные лицевые счета: ${accountNumbers}`
        );
      }
    }

    // Удаляем абонента (лицевые счета удалятся каскадно)
    await prisma.client.delete({
      where: { id }
    });
  }

  // Поиск абонентов
  async searchClients(query: string, limit: number = 10): Promise<ClientSearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim();
    
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { middleName: { contains: searchTerm, mode: 'insensitive' } },
          { phones: { has: searchTerm } },
          { address: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      take: limit,
      include: {
        accounts: {
          select: {
            id: true,
            accountNumber: true,
            balance: true,
            status: true,
            tariff: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { lastName: 'asc' }
    });

    return clients.map(client => ({
      id: client.id,
      fullName: `${client.lastName} ${client.firstName} ${client.middleName || ''}`.trim(),
      phones: client.phones,
      address: client.address,
      accounts: client.accounts.map(account => ({
        id: account.id,
        accountNumber: account.accountNumber,
        balance: account.balance,
        status: account.status,
        tariffName: account.tariff.name
      }))
    }));
  }

  // Получение статистики по абоненту
  async getClientStats(id: string): Promise<ClientStats> {
    validateObjectId(id, 'ID абонента');

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        accounts: {
          select: {
            id: true,
            status: true,
            balance: true
          }
        }
      }
    });

    if (!client) {
      throw new NotFoundError('Абонент не найден');
    }

    // Получаем статистику по платежам
    const payments = await prisma.payment.findMany({
      where: {
        account: {
          clientId: id
        },
        status: 'COMPLETED'
      },
      select: {
        amount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const stats: ClientStats = {
      totalAccounts: client.accounts.length,
      activeAccounts: client.accounts.filter(a => a.status === 'ACTIVE').length,
      blockedAccounts: client.accounts.filter(a => a.status === 'BLOCKED').length,
      suspendedAccounts: client.accounts.filter(a => a.status === 'SUSPENDED').length,
      totalBalance: client.accounts.reduce((sum, a) => sum + a.balance, 0),
      averageBalance: client.accounts.length > 0 
        ? client.accounts.reduce((sum, a) => sum + a.balance, 0) / client.accounts.length 
        : 0,
      totalPayments: payments.reduce((sum, p) => sum + p.amount, 0),
      lastPaymentDate: payments.length > 0 ? payments[0].createdAt : undefined,
      registrationDate: client.createdAt
    };

    return stats;
  }

  // Получение абонента по телефону
  async getClientByPhone(phone: string): Promise<Client | null> {
    const normalizedPhone = normalizePhoneNumber(phone);
    
    const client = await prisma.client.findFirst({
      where: {
        phones: { has: normalizedPhone }
      }
    });

    return client;
  }

  // Получение абонента по email
  async getClientByEmail(email: string): Promise<Client | null> {
    const client = await prisma.client.findFirst({
      where: { email: email.toLowerCase() }
    });

    return client;
  }

  // Получение абонента по Telegram ID
  async getClientByTelegramId(telegramId: string): Promise<Client | null> {
    const normalizedTelegramId = telegramId.startsWith('@') ? telegramId : `@${telegramId}`;
    
    const client = await prisma.client.findFirst({
      where: { telegramId: normalizedTelegramId }
    });

    return client;
  }

  // Геокодирование адреса абонента
  async geocodeClientAddress(id: string): Promise<ClientWithAccounts> {
    validateObjectId(id, 'ID абонента');

    const client = await this.getClientById(id);

    if (!client.address) {
      throw new ValidationError('У абонента не указан адрес для геокодирования');
    }

    const geocodeResult = await this.geocodingService.geocodeAddress({ 
      address: client.address 
    });

    if (geocodeResult.error) {
      throw new ExternalServiceError('Yandex Maps', geocodeResult.error);
    }

    if (!geocodeResult.coordinates) {
      throw new NotFoundError('Не удалось найти координаты для указанного адреса');
    }

    await prisma.client.update({
      where: { id },
      data: {
        coordinates: geocodeResult.coordinates ? JSON.parse(JSON.stringify(geocodeResult.coordinates)) : null,
        address: geocodeResult.formattedAddress || client.address
      }
    });

    return await this.getClientWithAccounts(id);
  }

  // Получение абонентов в радиусе от точки
  async getClientsInRadius(
    centerCoordinates: { latitude: number; longitude: number },
    radiusKm: number,
    limit: number = 50
  ): Promise<ClientWithAccounts[]> {
    // Для MongoDB нужно использовать $geoNear или $geoWithin
    // Пока реализуем простую фильтрацию через приложение
    const allClients = await prisma.client.findMany({
      where: {
        coordinates: { not: null }
      },
      include: {
        accounts: {
          include: {
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
        }
      },
      take: 1000 // Ограничиваем для производительности
    });

    const clientsInRadius = allClients
      .filter(client => {
        if (!client.coordinates) return false;
        
        const distance = this.geocodingService.calculateDistance(
          centerCoordinates,
          client.coordinates as { latitude: number; longitude: number }
        );
        
        return distance <= radiusKm;
      })
      .slice(0, limit);

    return clientsInRadius;
  }
}