// Сервис мониторинга статуса выполнения команд MikroTik

import { PrismaClient } from '@prisma/client';
import { MikroTikCommandResult } from './device.types';
import { config } from '../../config/config';
import KafkaService from '../../kafka';

export interface CommandStatus {
  commandId: string;
  deviceId: string;
  accountId: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';
  result?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
}

export class CommandMonitorService {
  private prisma: PrismaClient;
  private kafkaService: KafkaService;
  private commandStatuses = new Map<string, CommandStatus>();
  private timeoutHandlers = new Map<string, NodeJS.Timeout>();

  constructor(prisma: PrismaClient, kafkaService: KafkaService) {
    this.prisma = prisma;
    this.kafkaService = kafkaService;
  }

  // Запуск мониторинга
  async start(): Promise<void> {
    try {
      await this.kafkaService.connectConsumer('command-monitor-group');
      
      // Подписываемся на результаты выполнения команд
      await this.kafkaService.subscribeToTopic(
        config.kafka.topics.deviceStatus,
        this.handleCommandResult.bind(this)
      );

      console.log('📊 Command Monitor Service запущен');
    } catch (error) {
      console.error('❌ Ошибка запуска Command Monitor Service:', error);
      throw error;
    }
  }

  // Регистрация новой команды для мониторинга
  registerCommand(
    commandId: string,
    deviceId: string,
    accountId: string,
    type: string,
    timeoutMs: number = 30000
  ): void {
    const commandStatus: CommandStatus = {
      commandId,
      deviceId,
      accountId,
      type,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: config.mikrotik.maxRetries
    };

    this.commandStatuses.set(commandId, commandStatus);

    // Устанавливаем таймаут для команды
    const timeoutHandler = setTimeout(() => {
      this.handleCommandTimeout(commandId);
    }, timeoutMs);

    this.timeoutHandlers.set(commandId, timeoutHandler);

    console.log(`📝 Зарегистрирована команда для мониторинга: ${commandId}`);
  }

  // Обработка результата выполнения команды
  private async handleCommandResult(result: MikroTikCommandResult): Promise<void> {
    const commandStatus = this.commandStatuses.get(result.commandId);
    
    if (!commandStatus) {
      console.log(`⚠️ Получен результат для неизвестной команды: ${result.commandId}`);
      return;
    }

    // Очищаем таймаут
    const timeoutHandler = this.timeoutHandlers.get(result.commandId);
    if (timeoutHandler) {
      clearTimeout(timeoutHandler);
      this.timeoutHandlers.delete(result.commandId);
    }

    // Обновляем статус команды
    commandStatus.status = result.success ? 'completed' : 'failed';
    commandStatus.result = result.result;
    commandStatus.error = result.error;
    commandStatus.completedAt = new Date();

    console.log(`📊 Команда ${result.commandId} ${result.success ? 'выполнена успешно' : 'завершилась с ошибкой'}`);

    // Если команда не выполнена и есть попытки повтора
    if (!result.success && commandStatus.retryCount < commandStatus.maxRetries) {
      await this.retryCommand(commandStatus);
      return;
    }

    // Сохраняем результат в базу данных
    await this.saveCommandResult(commandStatus);

    // Удаляем из мониторинга
    this.commandStatuses.delete(result.commandId);

    // Отправляем уведомление о завершении команды
    await this.notifyCommandCompletion(commandStatus);
  }

  // Обработка таймаута команды
  private async handleCommandTimeout(commandId: string): Promise<void> {
    const commandStatus = this.commandStatuses.get(commandId);
    
    if (!commandStatus) {
      return;
    }

    console.log(`⏰ Таймаут команды: ${commandId}`);

    // Если есть попытки повтора
    if (commandStatus.retryCount < commandStatus.maxRetries) {
      await this.retryCommand(commandStatus);
      return;
    }

    // Помечаем как таймаут
    commandStatus.status = 'timeout';
    commandStatus.error = 'Превышено время ожидания выполнения команды';
    commandStatus.completedAt = new Date();

    // Сохраняем результат
    await this.saveCommandResult(commandStatus);

    // Удаляем из мониторинга
    this.commandStatuses.delete(commandId);
    this.timeoutHandlers.delete(commandId);

    // Отправляем уведомление
    await this.notifyCommandCompletion(commandStatus);
  }

  // Повтор выполнения команды
  private async retryCommand(commandStatus: CommandStatus): Promise<void> {
    commandStatus.retryCount++;
    commandStatus.status = 'pending';

    console.log(`🔄 Повтор команды ${commandStatus.commandId} (попытка ${commandStatus.retryCount}/${commandStatus.maxRetries})`);

    // Задержка перед повтором
    await new Promise(resolve => setTimeout(resolve, config.mikrotik.retryDelay));

    // Отправляем команду повторно
    const retryCommandId = `${commandStatus.commandId}-retry-${commandStatus.retryCount}`;
    
    const command = {
      type: commandStatus.type,
      deviceId: commandStatus.deviceId,
      accountId: commandStatus.accountId,
      macAddress: '', // Нужно сохранять в статусе
      timestamp: Date.now()
    };

    try {
      await this.kafkaService.sendMessage(config.kafka.topics.mikrotikCommands, command);
      
      // Регистрируем новую команду для мониторинга
      this.registerCommand(
        retryCommandId,
        commandStatus.deviceId,
        commandStatus.accountId,
        commandStatus.type
      );
      
    } catch (error) {
      console.error(`❌ Ошибка повтора команды ${commandStatus.commandId}:`, error);
      
      commandStatus.status = 'failed';
      commandStatus.error = `Ошибка повтора: ${error}`;
      commandStatus.completedAt = new Date();
      
      await this.saveCommandResult(commandStatus);
      this.commandStatuses.delete(commandStatus.commandId);
    }
  }

  // Сохранение результата команды в базу данных
  private async saveCommandResult(commandStatus: CommandStatus): Promise<void> {
    try {
      // Создаем запись в таблице логов команд
      // Предполагаем, что такая таблица будет создана в Prisma схеме
      console.log(`💾 Сохранение результата команды ${commandStatus.commandId} в базу данных`);
      
      // TODO: Добавить модель CommandLog в Prisma схему
      // await this.prisma.commandLog.create({
      //   data: {
      //     commandId: commandStatus.commandId,
      //     deviceId: commandStatus.deviceId,
      //     accountId: commandStatus.accountId,
      //     type: commandStatus.type,
      //     status: commandStatus.status,
      //     result: commandStatus.result ? JSON.stringify(commandStatus.result) : null,
      //     error: commandStatus.error,
      //     retryCount: commandStatus.retryCount,
      //     createdAt: commandStatus.createdAt,
      //     completedAt: commandStatus.completedAt
      //   }
      // });

    } catch (error) {
      console.error(`❌ Ошибка сохранения результата команды ${commandStatus.commandId}:`, error);
    }
  }

  // Уведомление о завершении команды
  private async notifyCommandCompletion(commandStatus: CommandStatus): Promise<void> {
    try {
      // Отправляем уведомление в топик уведомлений
      const notification = {
        type: 'command_completed',
        deviceId: commandStatus.deviceId,
        accountId: commandStatus.accountId,
        commandId: commandStatus.commandId,
        success: commandStatus.status === 'completed',
        error: commandStatus.error,
        timestamp: Date.now()
      };

      await this.kafkaService.sendMessage(config.kafka.topics.notifications, notification);
      
      console.log(`📢 Отправлено уведомление о завершении команды: ${commandStatus.commandId}`);
      
    } catch (error) {
      console.error(`❌ Ошибка отправки уведомления о команде ${commandStatus.commandId}:`, error);
    }
  }

  // Получение статуса команды
  getCommandStatus(commandId: string): CommandStatus | undefined {
    return this.commandStatuses.get(commandId);
  }

  // Получение всех активных команд
  getActiveCommands(): CommandStatus[] {
    return Array.from(this.commandStatuses.values());
  }

  // Получение статистики команд
  getCommandStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    timeout: number;
  } {
    const commands = Array.from(this.commandStatuses.values());
    
    return {
      total: commands.length,
      pending: commands.filter(c => c.status === 'pending').length,
      processing: commands.filter(c => c.status === 'processing').length,
      completed: commands.filter(c => c.status === 'completed').length,
      failed: commands.filter(c => c.status === 'failed').length,
      timeout: commands.filter(c => c.status === 'timeout').length
    };
  }

  // Остановка мониторинга
  async stop(): Promise<void> {
    try {
      // Очищаем все таймауты
      for (const timeoutHandler of this.timeoutHandlers.values()) {
        clearTimeout(timeoutHandler);
      }
      this.timeoutHandlers.clear();

      // Очищаем статусы команд
      this.commandStatuses.clear();

      console.log('🛑 Command Monitor Service остановлен');
    } catch (error) {
      console.error('❌ Ошибка остановки Command Monitor Service:', error);
    }
  }
}