// Контроллер для управления лицевыми счетами
import { Request, Response } from 'express';
import { AccountsService } from './accounts.service';
import { ValidationError, NotFoundError, ConflictError } from '../../common/errors';
import { ApiResponse, PaginatedResponse } from '../../common/types';

export class AccountsController {
  private accountsService: AccountsService;

  constructor() {
    this.accountsService = new AccountsService();
  }

  // Создание лицевого счета
  createAccount = async (req: Request, res: Response) => {
    try {
      const account = await this.accountsService.createAccount(req.body);
      
      const response: ApiResponse = {
        success: true,
        data: account,
        message: 'Лицевой счет успешно создан'
      };
      
      res.status(201).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение списка лицевых счетов
  getAccounts = async (req: Request, res: Response) => {
    try {
      const filters = {
        clientId: req.query.clientId as string,
        status: req.query.status as any,
        tariffId: req.query.tariffId as string,
        deviceId: req.query.deviceId as string,
        balanceMin: req.query.balanceMin ? parseFloat(req.query.balanceMin as string) : undefined,
        balanceMax: req.query.balanceMax ? parseFloat(req.query.balanceMax as string) : undefined,
        search: req.query.search as string,
      };

      const pagination = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        sortBy: req.query.sortBy as string || 'accountNumber',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc'
      };

      const result = await this.accountsService.getAccounts(filters, pagination);
      
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

  // Получение лицевого счета по ID
  getAccountById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const account = await this.accountsService.getAccountWithDetails(id);
      
      const response: ApiResponse = {
        success: true,
        data: account
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение лицевого счета по номеру
  getAccountByNumber = async (req: Request, res: Response) => {
    try {
      const { accountNumber } = req.params;
      const account = await this.accountsService.getAccountByNumber(accountNumber);
      
      const response: ApiResponse = {
        success: true,
        data: account
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Обновление лицевого счета
  updateAccount = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const account = await this.accountsService.updateAccount(id, req.body);
      
      const response: ApiResponse = {
        success: true,
        data: account,
        message: 'Лицевой счет успешно обновлен'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Удаление лицевого счета
  deleteAccount = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.accountsService.deleteAccount(id);
      
      const response: ApiResponse = {
        success: true,
        message: 'Лицевой счет успешно удален'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Блокировка лицевого счета
  blockAccount = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const account = await this.accountsService.blockAccount(id, reason);
      
      const response: ApiResponse = {
        success: true,
        data: account,
        message: 'Лицевой счет заблокирован'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Разблокировка лицевого счета
  unblockAccount = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const account = await this.accountsService.unblockAccount(id);
      
      const response: ApiResponse = {
        success: true,
        data: account,
        message: 'Лицевой счет разблокирован'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Приостановка лицевого счета
  suspendAccount = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const account = await this.accountsService.suspendAccount(id, reason);
      
      const response: ApiResponse = {
        success: true,
        data: account,
        message: 'Лицевой счет приостановлен'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Возобновление лицевого счета
  resumeAccount = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const account = await this.accountsService.resumeAccount(id);
      
      const response: ApiResponse = {
        success: true,
        data: account,
        message: 'Лицевой счет возобновлен'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Изменение баланса
  changeBalance = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { amount, type, description, operatorId } = req.body;
      
      if (!amount || !type || !description) {
        const response: ApiResponse = {
          success: false,
          error: 'Параметры amount, type и description обязательны'
        };
        return res.status(400).json(response);
      }

      const operation = {
        accountId: id,
        amount: parseFloat(amount),
        type,
        description,
        operatorId
      };

      const account = await this.accountsService.changeBalance(operation);
      
      const response: ApiResponse = {
        success: true,
        data: account,
        message: `Баланс ${type === 'credit' ? 'пополнен' : 'списан'} на ${amount} руб.`
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение лицевых счетов клиента
  getClientAccounts = async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const accounts = await this.accountsService.getClientAccounts(clientId);
      
      const response: ApiResponse = {
        success: true,
        data: accounts
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение лицевых счетов с низким балансом
  getLowBalanceAccounts = async (req: Request, res: Response) => {
    try {
      const threshold = req.query.threshold ? parseFloat(req.query.threshold as string) : undefined;
      const accounts = await this.accountsService.getLowBalanceAccounts(threshold);
      
      const response: ApiResponse = {
        success: true,
        data: accounts
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Получение статистики по лицевым счетам
  getAccountsStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.accountsService.getAccountsStats();
      
      const response: ApiResponse = {
        success: true,
        data: stats
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Обработка ошибок
  private handleError(error: any, res: Response) {
    console.error('Ошибка в AccountsController:', error);

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