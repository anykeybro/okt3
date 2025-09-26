// Контроллер для управления услугами
import { Request, Response, NextFunction } from 'express';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto, ServiceFilters, PaginationParams } from './types';
import { ServiceType } from '@prisma/client';

export class ServicesController {
  private servicesService: ServicesService;

  constructor() {
    this.servicesService = new ServicesService();
  }

  // Создание услуги
  createService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: CreateServiceDto = req.body;
      const service = await this.servicesService.createService(data);
      
      res.status(201).json({
        success: true,
        message: 'Услуга успешно создана',
        data: service
      });
    } catch (error) {
      next(error);
    }
  };

  // Получение всех услуг
  getServices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters: ServiceFilters = {
        type: req.query.type as ServiceType,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        search: req.query.search as string
      };

      const pagination: PaginationParams = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
      };

      const result = await this.servicesService.getServices(filters, pagination);
      
      res.json({
        success: true,
        message: 'Услуги получены успешно',
        data: result.data,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Получение услуги по ID
  getServiceById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const service = await this.servicesService.getServiceById(id);
      
      res.json({
        success: true,
        message: 'Услуга получена успешно',
        data: service
      });
    } catch (error) {
      next(error);
    }
  };

  // Обновление услуги
  updateService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data: UpdateServiceDto = req.body;
      const service = await this.servicesService.updateService(id, data);
      
      res.json({
        success: true,
        message: 'Услуга успешно обновлена',
        data: service
      });
    } catch (error) {
      next(error);
    }
  };

  // Удаление услуги
  deleteService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.servicesService.deleteService(id);
      
      res.json({
        success: true,
        message: 'Услуга успешно удалена'
      });
    } catch (error) {
      next(error);
    }
  };

  // Получение активных услуг
  getActiveServices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const services = await this.servicesService.getActiveServices();
      
      res.json({
        success: true,
        message: 'Активные услуги получены успешно',
        data: services
      });
    } catch (error) {
      next(error);
    }
  };
}