// Контроллер для управления заявками (CRM)
import { Request, Response } from 'express';
import { RequestsService } from './requests.service';
import { 
  CreateRequestDto, 
  UpdateRequestDto, 
  RequestFilters, 
  PaginationParams,
  CreateClientFromRequestDto,
  AssignRequestDto,
  ChangeRequestStatusDto
} from './types';
import { ValidationError, NotFoundError, ConflictError } from '../../common/errors';

export class RequestsController {
  private requestsService: RequestsService;

  constructor() {
    this.requestsService = new RequestsService();
  }

  // Создание заявки
  createRequest = async (req: Request, res: Response) => {
    try {
      const data: CreateRequestDto = req.body;
      const request = await this.requestsService.createRequest(data);
      
      res.status(201).json({
        success: true,
        data: request,
        message: 'Заявка успешно создана'
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
          details: error.errors
        });
      } else if (error instanceof ConflictError) {
        res.status(409).json({
          success: false,
          error: error.message
        });
      } else {
        console.error('Ошибка создания заявки:', error);
        res.status(500).json({
          success: false,
          error: 'Внутренняя ошибка сервера'
        });
      }
    }
  };

  // Получение списка заявок
  getRequests = async (req: Request, res: Response) => {
    try {
      const filters: RequestFilters = {
        search: req.query.search as string,
        status: req.query.status as any,
        assignedToId: req.query.assignedToId as string,
        hasClient: req.query.hasClient === 'true' ? true : req.query.hasClient === 'false' ? false : undefined,
        createdFrom: req.query.createdFrom ? new Date(req.query.createdFrom as string) : undefined,
        createdTo: req.query.createdTo ? new Date(req.query.createdTo as string) : undefined
      };

      const pagination: PaginationParams = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const result = await this.requestsService.getRequests(filters, pagination);
      
      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
          details: error.errors
        });
      } else {
        console.error('Ошибка получения заявок:', error);
        res.status(500).json({
          success: false,
          error: 'Внутренняя ошибка сервера'
        });
      }
    }
  };

  // Получение заявки по ID
  getRequestById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const request = await this.requestsService.getRequestWithDetails(id);
      
      res.json({
        success: true,
        data: request
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else {
        console.error('Ошибка получения заявки:', error);
        res.status(500).json({
          success: false,
          error: 'Внутренняя ошибка сервера'
        });
      }
    }
  };

  // Обновление заявки
  updateRequest = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data: UpdateRequestDto = req.body;
      const request = await this.requestsService.updateRequest(id, data);
      
      res.json({
        success: true,
        data: request,
        message: 'Заявка успешно обновлена'
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
          details: error.errors
        });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else if (error instanceof ConflictError) {
        res.status(409).json({
          success: false,
          error: error.message
        });
      } else {
        console.error('Ошибка обновления заявки:', error);
        res.status(500).json({
          success: false,
          error: 'Внутренняя ошибка сервера'
        });
      }
    }
  };

  // Удаление заявки
  deleteRequest = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.requestsService.deleteRequest(id);
      
      res.json({
        success: true,
        message: 'Заявка успешно удалена'
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else if (error instanceof ConflictError) {
        res.status(409).json({
          success: false,
          error: error.message
        });
      } else {
        console.error('Ошибка удаления заявки:', error);
        res.status(500).json({
          success: false,
          error: 'Внутренняя ошибка сервера'
        });
      }
    }
  };

  // Назначение заявки сотруднику
  assignRequest = async (req: Request, res: Response) => {
    try {
      const data: AssignRequestDto = {
        requestId: req.params.id,
        assignedToId: req.body.assignedToId,
        notes: req.body.notes
      };
      
      const request = await this.requestsService.assignRequest(data);
      
      res.json({
        success: true,
        data: request,
        message: 'Заявка успешно назначена'
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
          details: error.errors
        });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else if (error instanceof ConflictError) {
        res.status(409).json({
          success: false,
          error: error.message
        });
      } else {
        console.error('Ошибка назначения заявки:', error);
        res.status(500).json({
          success: false,
          error: 'Внутренняя ошибка сервера'
        });
      }
    }
  };

  // Изменение статуса заявки
  changeRequestStatus = async (req: Request, res: Response) => {
    try {
      const data: ChangeRequestStatusDto = {
        requestId: req.params.id,
        status: req.body.status,
        notes: req.body.notes
      };
      
      const request = await this.requestsService.changeRequestStatus(data);
      
      res.json({
        success: true,
        data: request,
        message: 'Статус заявки успешно изменен'
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
          details: error.errors
        });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else if (error instanceof ConflictError) {
        res.status(409).json({
          success: false,
          error: error.message
        });
      } else {
        console.error('Ошибка изменения статуса заявки:', error);
        res.status(500).json({
          success: false,
          error: 'Внутренняя ошибка сервера'
        });
      }
    }
  };

  // Поиск заявок
  searchRequests = async (req: Request, res: Response) => {
    try {
      const { q: query } = req.query;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Параметр поиска "q" обязателен'
        });
        return;
      }

      const results = await this.requestsService.searchRequests(query, limit);
      
      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Ошибка поиска заявок:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  };

  // Получение статистики по заявкам
  getRequestStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.requestsService.getRequestStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Ошибка получения статистики заявок:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  };

  // Создание клиента из заявки
  createClientFromRequest = async (req: Request, res: Response) => {
    try {
      const data: CreateClientFromRequestDto = {
        requestId: req.params.id,
        middleName: req.body.middleName,
        email: req.body.email,
        telegramId: req.body.telegramId,
        coordinates: req.body.coordinates
      };
      
      const result = await this.requestsService.createClientFromRequest(data);
      
      res.status(201).json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message,
          details: error.errors
        });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message
        });
      } else if (error instanceof ConflictError) {
        res.status(409).json({
          success: false,
          error: error.message
        });
      } else {
        console.error('Ошибка создания клиента из заявки:', error);
        res.status(500).json({
          success: false,
          error: 'Внутренняя ошибка сервера'
        });
      }
    }
  };

  // Получение заявок по клиенту
  getRequestsByClient = async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const requests = await this.requestsService.getRequestsByClientId(clientId);
      
      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        console.error('Ошибка получения заявок по клиенту:', error);
        res.status(500).json({
          success: false,
          error: 'Внутренняя ошибка сервера'
        });
      }
    }
  };

  // Получение заявок по телефону
  getRequestsByPhone = async (req: Request, res: Response) => {
    try {
      const { phone } = req.params;
      const requests = await this.requestsService.getRequestsByPhone(phone);
      
      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Ошибка получения заявок по телефону:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  };

  // Получение активных заявок
  getActiveRequests = async (req: Request, res: Response) => {
    try {
      const requests = await this.requestsService.getActiveRequests();
      
      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error('Ошибка получения активных заявок:', error);
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера'
      });
    }
  };

  // Получение заявок назначенных сотруднику
  getRequestsByAssignedUser = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const requests = await this.requestsService.getRequestsByAssignedUser(userId);
      
      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: error.message
        });
      } else {
        console.error('Ошибка получения заявок по сотруднику:', error);
        res.status(500).json({
          success: false,
          error: 'Внутренняя ошибка сервера'
        });
      }
    }
  };
}