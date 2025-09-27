// Сервис для управления устройствами MikroTik

import { PrismaClient, Device, DeviceStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { 
  CreateDeviceRequest, 
  UpdateDeviceRequest, 
  DeviceFilters, 
  DeviceResponse,
  DeviceHealthCheck,
  MikroTikCommand
} from './device.types';
import { MikroTikService } from './mikrotik.service';
import { ValidationError, NotFoundError, ConflictError } from '../../common/errors';
import { config } from '../../config/config';
import KafkaService from '../../kafka';

export class DeviceService {
  private prisma: PrismaClient;
  private mikrotikService: MikroTikService;
  private kafkaService: KafkaService;

  constructor(prisma: PrismaClient, kafkaService: KafkaService) {
    this.prisma = prisma;
    this.mikrotikService = new MikroTikService();
    this.kafkaService = kafkaService;
  }

  // Создание нового устройства
  async createDevice(data: CreateDeviceRequest): Promise<DeviceResponse> {
    // Валидация IP адреса
    if (!this.isValidIP(data.ipAddress)) {
      throw new ValidationError('Некорректный IP адрес');
    }

    // Проверка уникальности IP
    const existingDevice = await this.prisma.device.findUnique({
      where: { ipAddress: data.ipAddress }
    });

    if (existingDevice) {
      throw new ConflictError(`Устройство с IP ${data.ipAddress} уже существует`);
    }

    // Проверка доступности устройства
    const healthCheck = await this.checkDeviceHealth(data.ipAddress, data.username, data.password);
    
    if (!healthCheck.pingSuccess) {
      throw new ValidationError(`Устройство ${data.ipAddress} недоступно (ping failed)`);
    }

    if (!healthCheck.apiSuccess) {
      throw new ValidationError(`Не удается подключиться к API MikroTik на ${data.ipAddress}`);
    }

    // Хеширование пароля
    const passwordHash = await bcrypt.hash(data.password, config.security.bcryptRounds);

    // Создание устройства
    const device = await this.prisma.device.create({
      data: {
        ipAddress: data.ipAddress,
        username: data.username,
        passwordHash,
        description: data.description,
        status: DeviceStatus.ONLINE,
        lastCheck: new Date()
      }
    });

    return this.mapDeviceToResponse(device);
  }

  // Получение списка устройств
  async getDevices(filters: DeviceFilters = {}): Promise<{
    devices: DeviceResponse[];
    total: number;
  }> {
    const { page = 1, limit = 20, status, search } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [devices, total] = await Promise.all([
      this.prisma.device.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { accounts: true }
          }
        }
      }),
      this.prisma.device.count({ where })
    ]);

    return {
      devices: devices.map(device => ({
        ...this.mapDeviceToResponse(device),
        accountsCount: device._count.accounts
      })),
      total
    };
  }

  // Получение устройства по ID
  async getDeviceById(id: string): Promise<DeviceResponse> {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        _count: {
          select: { accounts: true }
        }
      }
    });

    if (!device) {
      throw new NotFoundError(`Устройство с ID ${id} не найдено`);
    }

    return {
      ...this.mapDeviceToResponse(device),
      accountsCount: device._count.accounts
    };
  }

  // Обновление устройства
  async updateDevice(id: string, data: UpdateDeviceRequest): Promise<DeviceResponse> {
    const device = await this.prisma.device.findUnique({
      where: { id }
    });

    if (!device) {
      throw new NotFoundError(`Устройство с ID ${id} не найдено`);
    }

    const updateData: any = {
      ...data,
      updatedAt: new Date()
    };

    // Если обновляется пароль, хешируем его
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, config.security.bcryptRounds);
      delete updateData.password;
    }

    // Если обновляются учетные данные, проверяем подключение
    if (data.username || data.password) {
      const username = data.username || device.username;
      const password = data.password || 'current_password'; // Используем текущий пароль если не обновляется
      
      if (data.password) {
        const healthCheck = await this.checkDeviceHealth(device.ipAddress, username, password);
        
        if (!healthCheck.apiSuccess) {
          throw new ValidationError('Не удается подключиться к устройству с новыми учетными данными');
        }
        
        updateData.status = DeviceStatus.ONLINE;
        updateData.lastCheck = new Date();
      }
    }

    const updatedDevice = await this.prisma.device.update({
      where: { id },
      data: updateData
    });

    return this.mapDeviceToResponse(updatedDevice);
  }

  // Удаление устройства
  async deleteDevice(id: string): Promise<void> {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: {
        _count: {
          select: { accounts: true }
        }
      }
    });

    if (!device) {
      throw new NotFoundError(`Устройство с ID ${id} не найдено`);
    }

    if (device._count.accounts > 0) {
      throw new ConflictError('Нельзя удалить устройство, к которому привязаны лицевые счета');
    }

    await this.prisma.device.delete({
      where: { id }
    });
  }

  // Проверка состояния устройства
  async checkDeviceHealth(ipAddress: string, username?: string, password?: string): Promise<DeviceHealthCheck> {
    const startTime = Date.now();
    
    // Проверка ping
    const pingSuccess = await this.mikrotikService.pingDevice(ipAddress);
    
    let apiSuccess = false;
    let error: string | undefined;

    // Проверка API если есть учетные данные
    if (username && password && pingSuccess) {
      try {
        apiSuccess = await this.mikrotikService.testConnection({
          host: ipAddress,
          username,
          password
        });
      } catch (err) {
        error = err instanceof Error ? err.message : 'Ошибка подключения к API';
      }
    }

    const responseTime = Date.now() - startTime;

    return {
      deviceId: '', // Будет заполнено при вызове
      pingSuccess,
      apiSuccess,
      responseTime,
      error,
      timestamp: new Date()
    };
  }

  // Проверка всех устройств
  async checkAllDevices(): Promise<DeviceHealthCheck[]> {
    const devices = await this.prisma.device.findMany();
    const results: DeviceHealthCheck[] = [];

    for (const device of devices) {
      try {
        const password = await this.getDevicePassword(device.id);
        const healthCheck = await this.checkDeviceHealth(
          device.ipAddress, 
          device.username, 
          password
        );
        
        healthCheck.deviceId = device.id;
        results.push(healthCheck);

        // Обновляем статус устройства
        const newStatus = healthCheck.apiSuccess ? DeviceStatus.ONLINE : 
                         healthCheck.pingSuccess ? DeviceStatus.ERROR : DeviceStatus.OFFLINE;

        await this.prisma.device.update({
          where: { id: device.id },
          data: {
            status: newStatus,
            lastCheck: new Date()
          }
        });

      } catch (error) {
        const healthCheck: DeviceHealthCheck = {
          deviceId: device.id,
          pingSuccess: false,
          apiSuccess: false,
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
          timestamp: new Date()
        };
        
        results.push(healthCheck);

        // Устанавливаем статус ERROR
        await this.prisma.device.update({
          where: { id: device.id },
          data: {
            status: DeviceStatus.ERROR,
            lastCheck: new Date()
          }
        });
      }
    }

    return results;
  }

  // Отправка команды через Kafka
  async sendMikroTikCommand(command: MikroTikCommand): Promise<string> {
    try {
      const commandId = `${command.deviceId}-${command.timestamp}`;
      
      await this.kafkaService.sendMessage(config.kafka.topics.mikrotikCommands, {
        ...command,
        timestamp: Date.now()
      });
      
      console.log(`📤 Команда MikroTik отправлена: ${command.type} для устройства ${command.deviceId}`);
      return commandId;
    } catch (error) {
      console.error('❌ Ошибка отправки команды MikroTik:', error);
      throw error;
    }
  }

  // Получение статуса команды (заглушка - нужна интеграция с consumer)
  getCommandStatus(commandId: string): any {
    // TODO: Интегрировать с CommandMonitorService
    console.log(`🔍 Запрос статуса команды: ${commandId}`);
    return null;
  }

  // Получение активных команд (заглушка - нужна интеграция с consumer)
  getActiveCommands(): any[] {
    // TODO: Интегрировать с CommandMonitorService
    console.log('📋 Запрос списка активных команд');
    return [];
  }

  // Получение статистики команд (заглушка - нужна интеграция с consumer)
  getCommandStats(): any {
    // TODO: Интегрировать с CommandMonitorService
    console.log('📊 Запрос статистики команд');
    return {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      timeout: 0
    };
  }

  // Получение пароля устройства (для внутреннего использования)
  private async getDevicePassword(deviceId: string): Promise<string> {
    // В реальном приложении пароли должны быть зашифрованы, а не хешированы
    // Для демонстрации возвращаем заглушку
    // TODO: Реализовать шифрование паролей вместо хеширования
    throw new Error('Получение паролей не реализовано. Необходимо использовать шифрование вместо хеширования.');
  }

  // Валидация IP адреса
  private isValidIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  // Маппинг Device в DeviceResponse
  private mapDeviceToResponse(device: Device): DeviceResponse {
    return {
      id: device.id,
      ipAddress: device.ipAddress,
      username: device.username,
      description: device.description || undefined,
      status: device.status,
      lastCheck: device.lastCheck || undefined,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt
    };
  }
}