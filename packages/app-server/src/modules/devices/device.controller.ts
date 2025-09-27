// Контроллер для управления устройствами MikroTik

import { Request, Response } from 'express';
import { DeviceService } from './device.service';
import { 
  CreateDeviceRequest, 
  UpdateDeviceRequest, 
  DeviceFilters 
} from './device.types';
import { ApiResponse, PaginatedResponse } from '../../common/types';
import { ValidationError, NotFoundError } from '../../common/errors';
import { validateCreateDevice, validateUpdateDevice, validateDeviceFilters } from './device.validation';

export class DeviceController {
  private deviceService: DeviceService;

  constructor(deviceService: DeviceService) {
    this.deviceService = deviceService;
  }

  // Создание устройства
  createDevice = async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = validateCreateDevice(req.body);
      if (validation.error) {
        res.status(400).json({
          success: false,
          error: 'Ошибка валидации',
          message: validation.error.details.map(d => d.message).join(', ')
        } as ApiResponse);
        return;
      }

      const deviceData: CreateDeviceRequest = validation.value;
      const device = await this.deviceService.createDevice(deviceData);

      res.status(201).json({
        success: true,
        data: device,
        message: 'Устройство успешно добавлено'
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // Получение списка устройств
  getDevices = async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = validateDeviceFilters(req.query);
      if (validation.error) {
        res.status(400).json({
          success: false,
          error: 'Ошибка валидации параметров',
          message: validation.error.details.map(d => d.message).join(', ')
        } as ApiResponse);
        return;
      }

      const filters: DeviceFilters = validation.value;
      const result = await this.deviceService.getDevices(filters);

      const response: PaginatedResponse<any> = {
        success: true,
        data: result.devices,
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (filters.limit || 20))
        }
      };

      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // Получение устройства по ID
  getDevice = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID устройства обязателен'
        } as ApiResponse);
        return;
      }

      const device = await this.deviceService.getDeviceById(id);

      res.json({
        success: true,
        data: device
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // Обновление устройства
  updateDevice = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID устройства обязателен'
        } as ApiResponse);
        return;
      }

      const validation = validateUpdateDevice(req.body);
      if (validation.error) {
        res.status(400).json({
          success: false,
          error: 'Ошибка валидации',
          message: validation.error.details.map(d => d.message).join(', ')
        } as ApiResponse);
        return;
      }

      const updateData: UpdateDeviceRequest = validation.value;
      const device = await this.deviceService.updateDevice(id, updateData);

      res.json({
        success: true,
        data: device,
        message: 'Устройство успешно обновлено'
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // Удаление устройства
  deleteDevice = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID устройства обязателен'
        } as ApiResponse);
        return;
      }

      await this.deviceService.deleteDevice(id);

      res.json({
        success: true,
        message: 'Устройство успешно удалено'
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // Проверка состояния устройства
  checkDeviceHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID устройства обязателен'
        } as ApiResponse);
        return;
      }

      const device = await this.deviceService.getDeviceById(id);
      
      // Для проверки здоровья нужен пароль, но мы его не храним в открытом виде
      // Поэтому делаем только ping проверку
      const healthCheck = await this.deviceService.checkDeviceHealth(device.ipAddress);
      healthCheck.deviceId = id;

      res.json({
        success: true,
        data: healthCheck
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // Проверка всех устройств
  checkAllDevices = async (req: Request, res: Response): Promise<void> => {
    try {
      const healthChecks = await this.deviceService.checkAllDevices();

      res.json({
        success: true,
        data: healthChecks,
        message: `Проверено ${healthChecks.length} устройств`
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // Тестирование подключения к устройству
  testConnection = async (req: Request, res: Response): Promise<void> => {
    try {
      const { ipAddress, username, password } = req.body;

      if (!ipAddress || !username || !password) {
        res.status(400).json({
          success: false,
          error: 'IP адрес, логин и пароль обязательны'
        } as ApiResponse);
        return;
      }

      const healthCheck = await this.deviceService.checkDeviceHealth(ipAddress, username, password);

      res.json({
        success: true,
        data: {
          pingSuccess: healthCheck.pingSuccess,
          apiSuccess: healthCheck.apiSuccess,
          responseTime: healthCheck.responseTime,
          error: healthCheck.error
        },
        message: healthCheck.apiSuccess ? 
          'Подключение успешно' : 
          'Ошибка подключения'
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // Отправка команды на устройство
  sendCommand = async (req: Request, res: Response): Promise<void> => {
    try {
      const { deviceId, accountId, type, macAddress, ipAddress, poolName } = req.body;

      if (!deviceId || !accountId || !type || !macAddress) {
        res.status(400).json({
          success: false,
          error: 'deviceId, accountId, type и macAddress обязательны'
        } as ApiResponse);
        return;
      }

      const commandId = await this.deviceService.sendMikroTikCommand({
        type,
        deviceId,
        accountId,
        macAddress,
        ipAddress,
        poolName,
        timestamp: Date.now()
      });

      res.json({
        success: true,
        data: { commandId },
        message: 'Команда отправлена на выполнение'
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // Получение статуса команды
  getCommandStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { commandId } = req.params;

      if (!commandId) {
        res.status(400).json({
          success: false,
          error: 'ID команды обязателен'
        } as ApiResponse);
        return;
      }

      const status = this.deviceService.getCommandStatus(commandId);

      if (!status) {
        res.status(404).json({
          success: false,
          error: 'Команда не найдена или уже завершена'
        } as ApiResponse);
        return;
      }

      res.json({
        success: true,
        data: status
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // Получение списка активных команд
  getActiveCommands = async (req: Request, res: Response): Promise<void> => {
    try {
      const commands = this.deviceService.getActiveCommands();

      res.json({
        success: true,
        data: commands,
        message: `Найдено ${commands.length} активных команд`
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // Получение статистики команд
  getCommandStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = this.deviceService.getCommandStats();

      res.json({
        success: true,
        data: stats
      } as ApiResponse);
    } catch (error) {
      this.handleError(res, error);
    }
  };

  // Обработка ошибок
  private handleError(res: Response, error: unknown): void {
    console.error('❌ Ошибка в DeviceController:', error);

    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
        message: error.errors.join(', ')
      } as ApiResponse);
    } else if (error instanceof NotFoundError) {
      res.status(404).json({
        success: false,
        error: error.message
      } as ApiResponse);
    } else {
      res.status(500).json({
        success: false,
        error: 'Внутренняя ошибка сервера',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка'
      } as ApiResponse);
    }
  }
}