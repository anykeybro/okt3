// Контроллер для управления тарифами
import { Request, Response, NextFunction } from 'express';
import { TariffsService } from './tariffs.service';
import { CreateTariffDto, UpdateTariffDto, TariffFilters, PaginationParams } from './types';
import { BillingType } from '@prisma/client';

export class TariffsController {
  private tariffsService: TariffsService;

  constructor() {
    this.tariffsService = new TariffsService();
  }

  // Создание тарифа
  createTariff = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: CreateTariffDto = req.body;
      const tariff = await this.tariffsService.createTariff(data);
      
      res.status(201).json({
        success: true,
        message: 'Тариф успешно создан',
        data: tariff
      });
    } catch (error) {
      next(error);
    }
  };

  // Получение всех тарифов
  getTariffs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters: TariffFilters = {
        billingType: req.query.billingType as BillingType,
        groupId: req.query.groupId as string,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
        isVisibleInLK: req.query.isVisibleInLK ? req.query.isVisibleInLK === 'true' : undefined,
        priceMin: req.query.priceMin ? parseFloat(req.query.priceMin as string) : undefined,
        priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
        search: req.query.search as string
      };

      const pagination: PaginationParams = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined
      };

      const result = await this.tariffsService.getTariffs(filters, pagination);
      
      res.json({
        success: true,
        message: 'Тарифы получены успешно',
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

  // Получение тарифа по ID
  getTariffById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const tariff = await this.tariffsService.getTariffWithServices(id);
      
      res.json({
        success: true,
        message: 'Тариф получен успешно',
        data: tariff
      });
    } catch (error) {
      next(error);
    }
  };

  // Обновление тарифа
  updateTariff = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const data: UpdateTariffDto = req.body;
      const tariff = await this.tariffsService.updateTariff(id, data);
      
      res.json({
        success: true,
        message: 'Тариф успешно обновлен',
        data: tariff
      });
    } catch (error) {
      next(error);
    }
  };

  // Удаление тарифа
  deleteTariff = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.tariffsService.deleteTariff(id);
      
      res.json({
        success: true,
        message: 'Тариф успешно удален'
      });
    } catch (error) {
      next(error);
    }
  };

  // Получение видимых тарифов для личного кабинета
  getVisibleTariffs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const groupId = req.query.groupId as string;
      const tariffs = await this.tariffsService.getVisibleTariffs(groupId);
      
      res.json({
        success: true,
        message: 'Видимые тарифы получены успешно',
        data: tariffs
      });
    } catch (error) {
      next(error);
    }
  };

  // Получение статистики по тарифу
  getTariffStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const stats = await this.tariffsService.getTariffStats(id);
      
      res.json({
        success: true,
        message: 'Статистика тарифа получена успешно',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  };

  // Копирование тарифа
  copyTariff = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { newName } = req.body;
      
      if (!newName || typeof newName !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Новое название тарифа обязательно'
        });
      }

      const tariff = await this.tariffsService.copyTariff(id, newName);
      
      res.status(201).json({
        success: true,
        message: 'Тариф успешно скопирован',
        data: tariff
      });
    } catch (error) {
      next(error);
    }
  };
}