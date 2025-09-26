// Контроллер для управления группами тарифов
import { Request, Response, NextFunction } from 'express';
import { TariffGroupsService } from './tariff-groups.service';
import { CreateTariffGroupDto, UpdateTariffGroupDto, TariffGroupFilters, PaginationParams } from './types';

export class TariffGroupsController {
  private tariffGroupsService: TariffGroupsService;

  constructor() {
    this.tariffGroupsService = new TariffGroupsService();
  }

  // Создание группы тарифов
  createTariffGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: CreateTariffGroupDto = req.body;
      const group = await this.tariffGroupsService.createTariffGroup(data);
      
      res.status(201).json({
        success: true,
        message: 'Группа тарифов успешно создана',
        data: group
      });
    } catch (error) {
      next(error);
    }
  };

  // Получение всех групп тарифов
  getTariffGroups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters: TariffGroupFilters = {
        search: req.query.search as string
      };

      const pagination: PaginationParams = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
      };

      const result = await this.tariffGroupsService.getTariffGroups(filters, pagination);
      
      res.json({
        success: true,
        message: 'Группы тарифов получены успешно',
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

  // Получение группы тарифов по ID
  getTariffGroupById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const group = await this.tariffGroupsService.getTariffGroupById(id);
      
      res.json({
        success: true,
        message: 'Группа тарифов получена успешно',
        data: group
      });
    } catch (error) {
      next(error);
    }
  };

  // Получение группы тарифов с тарифами
  getTariffGroupWithTariffs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const group = await this.tariffGroupsService.getTariffGroupWithTariffs(id);
      
      res.json({
        success: true,
        message: 'Группа тарифов с тарифами получена успешно',
        data: group
      });
    } catch (error) {
      next(error);
    }
  };

  // Обновление группы тарифов
  updateTariffGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data: UpdateTariffGroupDto = req.body;
      const group = await this.tariffGroupsService.updateTariffGroup(id, data);
      
      res.json({
        success: true,
        message: 'Группа тарифов успешно обновлена',
        data: group
      });
    } catch (error) {
      next(error);
    }
  };

  // Удаление группы тарифов
  deleteTariffGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.tariffGroupsService.deleteTariffGroup(id);
      
      res.json({
        success: true,
        message: 'Группа тарифов успешно удалена'
      });
    } catch (error) {
      next(error);
    }
  };

  // Получение всех групп тарифов (для селектов)
  getAllTariffGroups = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const groups = await this.tariffGroupsService.getAllTariffGroups();
      
      res.json({
        success: true,
        message: 'Все группы тарифов получены успешно',
        data: groups
      });
    } catch (error) {
      next(error);
    }
  };

  // Получение статистики по группе
  getTariffGroupStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const stats = await this.tariffGroupsService.getTariffGroupStats(id);
      
      res.json({
        success: true,
        message: 'Статистика группы тарифов получена успешно',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  };

  // Перемещение тарифов между группами
  moveTariffsToGroup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fromGroupId } = req.params;
      const { toGroupId } = req.body;
      
      await this.tariffGroupsService.moveTariffsToGroup(fromGroupId, toGroupId);
      
      res.json({
        success: true,
        message: 'Тарифы успешно перемещены'
      });
    } catch (error) {
      next(error);
    }
  };
}