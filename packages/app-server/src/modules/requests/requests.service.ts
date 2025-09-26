// Сервис для управления заявками (CRM)
import prisma from '../../common/database';
import { NotFoundError, ConflictError, ValidationError } from '../../common/errors';
import { 
  validateRequest, 
  validateRequestUpdate,
  validateObjectId, 
  validatePagination, 
  validateRequestFilters,
  validateCreateClientFromRequest,
  validateRequestBusinessRules,
  validateStatusTransition,
  normalizePhoneNumber
} from './validation';
import {
  CreateRequestDto,
  UpdateRequestDto,
  RequestFilters,
  PaginationParams,
  PaginatedResult,
  RequestWithDetails,
  RequestStats,
  RequestSearchResult,
  CreateClientFromRequestDto,
  AutoCreateClientResult,
  AssignRequestDto,
  ChangeRequestStatusDto
} from './types';
import { Request, RequestStatus } from '@prisma/client';

export class RequestsService {

  // Создание заявки
  async createRequest(data: CreateRequestDto): Promise<RequestWithDetails> {
    validateRequest(data);
    validateRequestBusinessRules(data);

    // Нормализуем телефон
    const normalizedPhone = normalizePhoneNumber(data.phone);

    // Проверяем, нет ли уже активной заявки с таким телефоном
    const existingActiveRequest = await prisma.request.findFirst({
      where: {
        phone: normalizedPhone,
        status: {
          in: [RequestStatus.NEW, RequestStatus.IN_PROGRESS]
        }
      }
    });

    if (existingActiveRequest) {
      throw new ConflictError(
        `Уже существует активная заявка с номером ${normalizedPhone} (ID: ${existingActiveRequest.id})`
      );
    }

    // Проверяем, есть ли уже клиент с таким телефоном
    const existingClient = await prisma.client.findFirst({
      where: {
        phones: { has: normalizedPhone }
      }
    });

    let clientId: string | undefined;

    // Если клиент существует, автоматически привязываем заявку к нему
    if (existingClient) {
      clientId = existingClient.id;
    }

    const request = await prisma.request.create({
      data: {
        clientId,
        address: data.address.trim(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: normalizedPhone,
        desiredServices: data.desiredServices.map(s => s.trim()),
        notes: data.notes?.trim() || null,
        status: RequestStatus.NEW
      }
    });

    return await this.getRequestWithDetails(request.id);
  }

  // Получение всех заявок с фильтрацией и пагинацией
  async getRequests(
    filters: RequestFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<RequestWithDetails>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    validatePagination(page, limit);
    validateRequestFilters(filters);

    const skip = (page - 1) * limit;

    // Строим условия фильтрации
    const where: any = {};

    // Поиск по ФИО, телефону, адресу
    if (filters.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm } },
        { address: { contains: searchTerm, mode: 'insensitive' } },
        { notes: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Фильтр по статусу
    if (filters.status) {
      where.status = filters.status;
    }

    // Фильтр по назначенному сотруднику
    if (filters.assignedToId !== undefined) {
      if (filters.assignedToId === null) {
        where.assignedToId = null;
      } else {
        where.assignedToId = filters.assignedToId;
      }
    }

    // Фильтр по наличию привязанного клиента
    if (filters.hasClient !== undefined) {
      if (filters.hasClient) {
        where.clientId = { not: null };
      } else {
        where.clientId = null;
      }
    }

    // Фильтры по датам
    if (filters.createdFrom || filters.createdTo) {
      where.createdAt = {};
      if (filters.createdFrom) {
        where.createdAt.gte = new Date(filters.createdFrom);
      }
      if (filters.createdTo) {
        where.createdAt.lte = new Date(filters.createdTo);
      }
    }

    // Сортировка
    const orderBy: any = {};
    if (sortBy === 'fullName') {
      orderBy.lastName = sortOrder;
    } else if (sortBy === 'assignedTo') {
      orderBy.assignedTo = { username: sortOrder };
    } else {
      orderBy[sortBy] = sortOrder;
    }

    // Получаем данные и общее количество
    const [requests, total] = await Promise.all([
      prisma.request.findMany({
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
          assignedTo: {
            select: {
              id: true,
              username: true,
              role: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }),
      prisma.request.count({ where })
    ]);

    return {
      data: requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Получение заявки по ID
  async getRequestById(id: string): Promise<Request> {
    validateObjectId(id, 'ID заявки');

    const request = await prisma.request.findUnique({
      where: { id }
    });

    if (!request) {
      throw new NotFoundError('Заявка не найдена');
    }

    return request;
  }

  // Получение заявки с деталями
  async getRequestWithDetails(id: string): Promise<RequestWithDetails> {
    const request = await prisma.request.findUnique({
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
        assignedTo: {
          select: {
            id: true,
            username: true,
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!request) {
      throw new NotFoundError('Заявка не найдена');
    }

    return request;
  }

  // Обновление заявки
  async updateRequest(id: string, data: UpdateRequestDto): Promise<RequestWithDetails> {
    validateObjectId(id, 'ID заявки');
    
    // Проверяем существование заявки
    const existingRequest = await this.getRequestById(id);

    // Валидируем данные для обновления
    if (Object.keys(data).length > 0) {
      validateRequestUpdate(data);
      validateRequestBusinessRules(data, existingRequest);
    }

    const updateData: any = {};

    // Обновляем основные поля
    if (data.address !== undefined) {
      updateData.address = data.address.trim();
    }
    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName.trim();
    }
    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName.trim();
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes?.trim() || null;
    }

    // Обновляем телефон
    if (data.phone !== undefined) {
      const normalizedPhone = normalizePhoneNumber(data.phone);
      
      // Проверяем уникальность телефона среди активных заявок
      if (normalizedPhone !== existingRequest.phone) {
        const existingActiveRequest = await prisma.request.findFirst({
          where: {
            phone: normalizedPhone,
            status: {
              in: [RequestStatus.NEW, RequestStatus.IN_PROGRESS]
            },
            id: { not: id }
          }
        });

        if (existingActiveRequest) {
          throw new ConflictError(
            `Уже существует активная заявка с номером ${normalizedPhone} (ID: ${existingActiveRequest.id})`
          );
        }
      }
      
      updateData.phone = normalizedPhone;
    }

    // Обновляем желаемые услуги
    if (data.desiredServices !== undefined) {
      updateData.desiredServices = data.desiredServices.map(s => s.trim());
    }

    // Обновляем статус с проверкой переходов
    if (data.status !== undefined && data.status !== existingRequest.status) {
      validateStatusTransition(existingRequest.status, data.status);
      updateData.status = data.status;
    }

    // Обновляем назначенного сотрудника
    if (data.assignedToId !== undefined) {
      if (data.assignedToId === null) {
        updateData.assignedToId = null;
      } else {
        // Проверяем существование сотрудника
        const assignedUser = await prisma.systemUser.findUnique({
          where: { id: data.assignedToId, isActive: true }
        });

        if (!assignedUser) {
          throw new NotFoundError('Назначаемый сотрудник не найден или неактивен');
        }

        updateData.assignedToId = data.assignedToId;
      }
    }

    await prisma.request.update({
      where: { id },
      data: updateData
    });

    return await this.getRequestWithDetails(id);
  }

  // Удаление заявки
  async deleteRequest(id: string): Promise<void> {
    validateObjectId(id, 'ID заявки');

    // Проверяем существование заявки
    const existingRequest = await this.getRequestById(id);

    // Проверяем, можно ли удалить заявку
    if (existingRequest.status === RequestStatus.COMPLETED) {
      throw new ConflictError('Нельзя удалить выполненную заявку');
    }

    await prisma.request.delete({
      where: { id }
    });
  }

  // Назначение заявки сотруднику
  async assignRequest(data: AssignRequestDto): Promise<RequestWithDetails> {
    validateObjectId(data.requestId, 'ID заявки');
    validateObjectId(data.assignedToId, 'ID сотрудника');

    // Проверяем существование заявки
    const existingRequest = await this.getRequestById(data.requestId);

    // Проверяем, что заявка не завершена
    if (existingRequest.status === RequestStatus.COMPLETED || existingRequest.status === RequestStatus.CANCELLED) {
      throw new ConflictError('Нельзя назначить завершенную или отмененную заявку');
    }

    // Проверяем существование сотрудника
    const assignedUser = await prisma.systemUser.findUnique({
      where: { id: data.assignedToId, isActive: true }
    });

    if (!assignedUser) {
      throw new NotFoundError('Назначаемый сотрудник не найден или неактивен');
    }

    const updateData: any = {
      assignedToId: data.assignedToId
    };

    // Если заявка была в статусе NEW, переводим в IN_PROGRESS
    if (existingRequest.status === RequestStatus.NEW) {
      updateData.status = RequestStatus.IN_PROGRESS;
    }

    // Добавляем заметку, если указана
    if (data.notes) {
      const currentNotes = existingRequest.notes || '';
      const newNote = `[${new Date().toLocaleString('ru-RU')}] Назначено на ${assignedUser.username}: ${data.notes.trim()}`;
      updateData.notes = currentNotes ? `${currentNotes}\n\n${newNote}` : newNote;
    }

    await prisma.request.update({
      where: { id: data.requestId },
      data: updateData
    });

    return await this.getRequestWithDetails(data.requestId);
  }

  // Изменение статуса заявки
  async changeRequestStatus(data: ChangeRequestStatusDto): Promise<RequestWithDetails> {
    validateObjectId(data.requestId, 'ID заявки');

    // Проверяем существование заявки
    const existingRequest = await this.getRequestById(data.requestId);

    // Проверяем допустимость перехода статуса
    validateStatusTransition(existingRequest.status, data.status);

    const updateData: any = {
      status: data.status
    };

    // Добавляем заметку, если указана
    if (data.notes) {
      const currentNotes = existingRequest.notes || '';
      const newNote = `[${new Date().toLocaleString('ru-RU')}] Статус изменен на ${data.status}: ${data.notes.trim()}`;
      updateData.notes = currentNotes ? `${currentNotes}\n\n${newNote}` : newNote;
    }

    await prisma.request.update({
      where: { id: data.requestId },
      data: updateData
    });

    return await this.getRequestWithDetails(data.requestId);
  }

  // Поиск заявок
  async searchRequests(query: string, limit: number = 10): Promise<RequestSearchResult[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim();
    
    const requests = await prisma.request.findMany({
      where: {
        OR: [
          { firstName: { contains: searchTerm, mode: 'insensitive' } },
          { lastName: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm } },
          { address: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      take: limit,
      include: {
        assignedTo: {
          select: { username: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return requests.map(request => ({
      id: request.id,
      fullName: `${request.lastName} ${request.firstName}`.trim(),
      phone: request.phone,
      address: request.address,
      status: request.status,
      createdAt: request.createdAt,
      hasClient: !!request.clientId,
      assignedTo: request.assignedTo?.username
    }));
  }

  // Получение статистики по заявкам
  async getRequestStats(): Promise<RequestStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Получаем общую статистику
    const [
      totalRequests,
      newRequests,
      inProgressRequests,
      completedRequests,
      cancelledRequests,
      todayRequests,
      weekRequests,
      monthRequests
    ] = await Promise.all([
      prisma.request.count(),
      prisma.request.count({ where: { status: RequestStatus.NEW } }),
      prisma.request.count({ where: { status: RequestStatus.IN_PROGRESS } }),
      prisma.request.count({ where: { status: RequestStatus.COMPLETED } }),
      prisma.request.count({ where: { status: RequestStatus.CANCELLED } }),
      prisma.request.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.request.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.request.count({ where: { createdAt: { gte: monthStart } } })
    ]);

    // Вычисляем среднее время обработки
    const completedRequestsWithTime = await prisma.request.findMany({
      where: { 
        status: RequestStatus.COMPLETED,
        updatedAt: { gte: monthStart } // За последний месяц
      },
      select: {
        createdAt: true,
        updatedAt: true
      }
    });

    let averageProcessingTime = 0;
    if (completedRequestsWithTime.length > 0) {
      const totalProcessingTime = completedRequestsWithTime.reduce((sum, request) => {
        const processingTime = request.updatedAt.getTime() - request.createdAt.getTime();
        return sum + processingTime;
      }, 0);
      
      averageProcessingTime = totalProcessingTime / completedRequestsWithTime.length / (1000 * 60 * 60); // в часах
    }

    // Вычисляем процент выполнения
    const processedRequests = completedRequests + cancelledRequests;
    const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0;

    return {
      totalRequests,
      newRequests,
      inProgressRequests,
      completedRequests,
      cancelledRequests,
      todayRequests,
      weekRequests,
      monthRequests,
      averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100
    };
  }

  // Создание клиента из заявки
  async createClientFromRequest(data: CreateClientFromRequestDto): Promise<AutoCreateClientResult> {
    validateCreateClientFromRequest(data);

    // Проверяем существование заявки
    const request = await this.getRequestWithDetails(data.requestId);

    // Проверяем, что у заявки еще нет привязанного клиента
    if (request.clientId) {
      throw new ConflictError('У заявки уже есть привязанный клиент');
    }

    // Проверяем, нет ли уже клиента с таким телефоном
    const existingClient = await prisma.client.findFirst({
      where: {
        phones: { has: request.phone }
      }
    });

    if (existingClient) {
      // Если клиент существует, просто привязываем заявку к нему
      await prisma.request.update({
        where: { id: data.requestId },
        data: { clientId: existingClient.id }
      });

      return {
        clientId: existingClient.id,
        message: 'Заявка привязана к существующему клиенту'
      };
    }

    // Создаем нового клиента
    const client = await prisma.client.create({
      data: {
        firstName: request.firstName,
        lastName: request.lastName,
        middleName: data.middleName?.trim() || null,
        phones: [request.phone],
        email: data.email?.trim().toLowerCase() || null,
        telegramId: data.telegramId?.trim() 
          ? (data.telegramId.trim().startsWith('@') ? data.telegramId.trim() : `@${data.telegramId.trim()}`)
          : null,
        address: request.address,
        coordinates: data.coordinates ? JSON.parse(JSON.stringify(data.coordinates)) : null
      }
    });

    // Привязываем заявку к созданному клиенту
    await prisma.request.update({
      where: { id: data.requestId },
      data: { clientId: client.id }
    });

    return {
      clientId: client.id,
      message: 'Клиент успешно создан и привязан к заявке'
    };
  }

  // Получение заявок по клиенту
  async getRequestsByClientId(clientId: string): Promise<RequestWithDetails[]> {
    validateObjectId(clientId, 'ID клиента');

    const requests = await prisma.request.findMany({
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
        assignedTo: {
          select: {
            id: true,
            username: true,
            role: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return requests;
  }

  // Получение заявок по телефону
  async getRequestsByPhone(phone: string): Promise<RequestWithDetails[]> {
    const normalizedPhone = normalizePhoneNumber(phone);

    const requests = await prisma.request.findMany({
      where: { phone: normalizedPhone },
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
        assignedTo: {
          select: {
            id: true,
            username: true,
            role: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return requests;
  }

  // Получение активных заявок (NEW и IN_PROGRESS)
  async getActiveRequests(): Promise<RequestWithDetails[]> {
    const requests = await prisma.request.findMany({
      where: {
        status: {
          in: [RequestStatus.NEW, RequestStatus.IN_PROGRESS]
        }
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
        assignedTo: {
          select: {
            id: true,
            username: true,
            role: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return requests;
  }

  // Получение заявок назначенных сотруднику
  async getRequestsByAssignedUser(userId: string): Promise<RequestWithDetails[]> {
    validateObjectId(userId, 'ID сотрудника');

    const requests = await prisma.request.findMany({
      where: { assignedToId: userId },
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
        assignedTo: {
          select: {
            id: true,
            username: true,
            role: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return requests;
  }
}