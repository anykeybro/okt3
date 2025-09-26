// Контроллер для управления абонентами
import { Request, Response } from 'express';
import { ClientsService } from './clients.service';
import { ValidationError, NotFoundError, ConflictError } from '../../common/errors';
import { ApiResponse, PaginatedResponse } from '../../common/types';

export class ClientsController {
  private clientsService: ClientsService;

  constructor() {
    this.clientsService = new ClientsService();
  }

  // Создание абонента
  createClient = async (req: Request, res: Response) => {
    try {
      const client = await this.clientsService.createClient(req.body);
      
      const response: ApiResponse = {
        success: true,
        data: client,
        message: 'Абонент успешно создан'
      };
      
      res.status(201).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение списка абонентов
  getClients = async (req: Request, res: Response) => {
    try {
      const filters = {
        search: req.query.search as string,
        status: req.query.status as any,
        tariffId: req.query.tariffId as string,
        deviceId: req.query.deviceId as string,
        hasEmail: req.query.hasEmail === 'true' ? true : req.query.hasEmail === 'false' ? false : undefined,
        hasTelegram: req.query.hasTelegram === 'true' ? true : req.query.hasTelegram === 'false' ? false : undefined,
        balanceMin: req.query.balanceMin ? parseFloat(req.query.balanceMin as string) : undefined,
        balanceMax: req.query.balanceMax ? parseFloat(req.query.balanceMax as string) : undefined,
        createdFrom: req.query.createdFrom ? new Date(req.query.createdFrom as string) : undefined,
        createdTo: req.query.createdTo ? new Date(req.query.createdTo as string) : undefined,
      };

      const pagination = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        sortBy: req.query.sortBy as string || 'lastName',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc'
      };

      const result = await this.clientsService.getClients(filters, pagination);
      
      const response: PaginatedResponse<any> = {
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение абонента по ID
  getClientById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const client = await this.clientsService.getClientWithAccounts(id);
      
      const response: ApiResponse = {
        success: true,
        data: client
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Обновление абонента
  updateClient = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const client = await this.clientsService.updateClient(id, req.body);
      
      const response: ApiResponse = {
        success: true,
        data: client,
        message: 'Абонент успешно обновлен'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Удаление абонента
  deleteClient = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.clientsService.deleteClient(id);
      
      const response: ApiResponse = {
        success: true,
        message: 'Абонент успешно удален'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Поиск абонентов
  searchClients = async (req: Request, res: Response) => {
    try {
      const { q: query } = req.query;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      
      if (!query || typeof query !== 'string') {
        const response: ApiResponse = {
          success: false,
          error: 'Параметр поиска q обязателен'
        };
        return res.status(400).json(response);
      }

      const results = await this.clientsService.searchClients(query, limit);
      
      const response: ApiResponse = {
        success: true,
        data: results
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение статистики по абоненту
  getClientStats = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const stats = await this.clientsService.getClientStats(id);
      
      const response: ApiResponse = {
        success: true,
        data: stats
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение абонента по телефону
  getClientByPhone = async (req: Request, res: Response) => {
    try {
      const { phone } = req.params;
      const client = await this.clientsService.getClientByPhone(phone);
      
      if (!client) {
        const response: ApiResponse = {
          success: false,
          error: 'Абонент с указанным номером телефона не найден'
        };
        return res.status(404).json(response);
      }

      const clientWithAccounts = await this.clientsService.getClientWithAccounts(client.id);
      
      const response: ApiResponse = {
        success: true,
        data: clientWithAccounts
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение абонента по email
  getClientByEmail = async (req: Request, res: Response) => {
    try {
      const { email } = req.params;
      const client = await this.clientsService.getClientByEmail(email);
      
      if (!client) {
        const response: ApiResponse = {
          success: false,
          error: 'Абонент с указанным email не найден'
        };
        return res.status(404).json(response);
      }

      const clientWithAccounts = await this.clientsService.getClientWithAccounts(client.id);
      
      const response: ApiResponse = {
        success: true,
        data: clientWithAccounts
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Геокодирование адреса абонента
  geocodeClientAddress = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const client = await this.clientsService.geocodeClientAddress(id);
      
      const response: ApiResponse = {
        success: true,
        data: client,
        message: 'Адрес успешно геокодирован'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение абонентов в радиусе
  getClientsInRadius = async (req: Request, res: Response) => {
    try {
      const { latitude, longitude, radius } = req.query;
      
      if (!latitude || !longitude || !radius) {
        const response: ApiResponse = {
          success: false,
          error: 'Параметры latitude, longitude и radius обязательны'
        };
        return res.status(400).json(response);
      }

      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusKm = parseFloat(radius as string);
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm)) {
        const response: ApiResponse = {
          success: false,
          error: 'Координаты и радиус должны быть числами'
        };
        return res.status(400).json(response);
      }

      const clients = await this.clientsService.getClientsInRadius(
        { latitude: lat, longitude: lng },
        radiusKm,
        limit
      );
      
      const response: ApiResponse = {
        success: true,
        data: clients
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Обработка ошибок
  private handleError(error: any, res: Response) {
    console.error('Ошибка в ClientsController:', error);

    if (error instanceof ValidationError) {
      const response: ApiResponse = {
        success: false,
        error: error.message,
        data: error.errors
      };
      res.status(400).json(response);
    } else if (error instanceof NotFoundError) {
      const response: ApiResponse = {
        success: false,
        error: error.message
      };
      res.status(404).json(response);
    } else if (error instanceof ConflictError) {
      const response: ApiResponse = {
        success: false,
        error: error.message
      };
      res.status(409).json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: 'Внутренняя ошибка сервера'
      };
      res.status(500).json(response);
    }
  }
}