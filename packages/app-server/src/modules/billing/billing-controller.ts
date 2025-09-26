// Контроллер для API биллинга
import { Request, Response } from 'express';
import { BillingService } from './billing-service';
import { PrismaClient } from '@prisma/client';

export class BillingController {
  private billingService: BillingService;

  constructor(prisma: PrismaClient) {
    this.billingService = new BillingService(prisma);
  }

  /**
   * Ручной запуск биллинга
   */
  runManualBilling = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.billingService.runManualBilling();
      
      res.json({
        success: true,
        message: 'Биллинг выполнен успешно',
        data: stats
      });
    } catch (error) {
      console.error('Ошибка ручного запуска биллинга:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка выполнения биллинга',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  /**
   * Тестовый запуск биллинга
   */
  testBilling = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.billingService.testBilling();
      
      res.json({
        success: true,
        message: 'Тестовый биллинг выполнен (без изменений в БД)',
        data: stats
      });
    } catch (error) {
      console.error('Ошибка тестового биллинга:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка тестового биллинга',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  /**
   * Получение статистики биллинга
   */
  getBillingStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const stats = await this.billingService.getBillingStatistics(days);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Ошибка получения статистики биллинга:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения статистики',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  /**
   * Получение информации о следующем списании для аккаунта
   */
  getNextChargeInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.params;
      
      if (!accountId) {
        res.status(400).json({
          success: false,
          message: 'ID аккаунта обязателен'
        });
        return;
      }

      const chargeInfo = await this.billingService.getNextChargeInfo(accountId);
      
      res.json({
        success: true,
        data: chargeInfo
      });
    } catch (error) {
      console.error('Ошибка получения информации о списании:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения информации о списании',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  /**
   * Получение статуса планировщика
   */
  getSchedulerStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = this.billingService.getSchedulerStatus();
      
      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Ошибка получения статуса планировщика:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения статуса планировщика',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  /**
   * Запуск планировщика
   */
  startScheduler = async (req: Request, res: Response): Promise<void> => {
    try {
      this.billingService.startScheduler();
      
      res.json({
        success: true,
        message: 'Планировщик биллинга запущен'
      });
    } catch (error) {
      console.error('Ошибка запуска планировщика:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка запуска планировщика',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  /**
   * Остановка планировщика
   */
  stopScheduler = async (req: Request, res: Response): Promise<void> => {
    try {
      this.billingService.stopScheduler();
      
      res.json({
        success: true,
        message: 'Планировщик биллинга остановлен'
      });
    } catch (error) {
      console.error('Ошибка остановки планировщика:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка остановки планировщика',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  /**
   * Получение аккаунтов с низким балансом
   */
  getLowBalanceAccounts = async (req: Request, res: Response): Promise<void> => {
    try {
      const accounts = await this.billingService.checkLowBalanceAccounts();
      
      res.json({
        success: true,
        data: accounts
      });
    } catch (error) {
      console.error('Ошибка получения аккаунтов с низким балансом:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения аккаунтов с низким балансом',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  /**
   * Получение истории ошибок биллинга
   */
  getBillingErrors = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const errors = await this.billingService.getBillingErrors(limit);
      
      res.json({
        success: true,
        data: errors
      });
    } catch (error) {
      console.error('Ошибка получения истории ошибок:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения истории ошибок',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  /**
   * Обработка пополнения баланса (webhook от платежной системы)
   */
  handleBalanceTopUp = async (req: Request, res: Response): Promise<void> => {
    try {
      const { accountId } = req.body;
      
      if (!accountId) {
        res.status(400).json({
          success: false,
          message: 'ID аккаунта обязателен'
        });
        return;
      }

      const result = await this.billingService.handleBalanceTopUp(accountId);
      
      res.json({
        success: true,
        message: result ? 'Аккаунт разблокирован' : 'Действий не требуется',
        data: result
      });
    } catch (error) {
      console.error('Ошибка обработки пополнения баланса:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка обработки пополнения баланса',
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };
}