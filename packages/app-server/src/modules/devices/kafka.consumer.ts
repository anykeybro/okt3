// Kafka consumer для обработки команд MikroTik

import { PrismaClient } from '@prisma/client';
import { MikroTikService } from './mikrotik.service';
import { MikroTikCommand, MikroTikCommandResult } from './device.types';
import { config } from '../../config/config';
import KafkaService from '../../kafka';

export class MikroTikKafkaConsumer {
  private prisma: PrismaClient;
  private mikrotikService: MikroTikService;
  private kafkaService: KafkaService;

  constructor(prisma: PrismaClient, kafkaService: KafkaService) {
    this.prisma = prisma;
    this.mikrotikService = new MikroTikService();
    this.kafkaService = kafkaService;
  }

  // Запуск consumer'а
  async start(): Promise<void> {
    try {
      await this.kafkaService.connectConsumer('mikrotik-consumer-group');
      
      await this.kafkaService.subscribeToTopic(
        config.kafka.topics.mikrotikCommands,
        this.handleMikroTikCommand.bind(this)
      );

      console.log('🎯 MikroTik Kafka Consumer запущен');
    } catch (error) {
      console.error('❌ Ошибка запуска MikroTik Kafka Consumer:', error);
      throw error;
    }
  }

  // Обработка команд MikroTik
  private async handleMikroTikCommand(message: MikroTikCommand): Promise<void> {
    console.log(`🔧 Обработка команды MikroTik: ${message.type} для устройства ${message.deviceId}`);

    try {
      // Получаем информацию об устройстве
      const device = await this.prisma.device.findUnique({
        where: { id: message.deviceId }
      });

      if (!device) {
        console.error(`❌ Устройство ${message.deviceId} не найдено`);
        await this.sendCommandResult({
          commandId: `${message.deviceId}-${message.timestamp}`,
          deviceId: message.deviceId,
          success: false,
          error: 'Устройство не найдено',
          timestamp: Date.now()
        });
        return;
      }

      // Получаем информацию о лицевом счете
      const account = await this.prisma.account.findUnique({
        where: { id: message.accountId },
        include: { client: true }
      });

      if (!account) {
        console.error(`❌ Лицевой счет ${message.accountId} не найден`);
        await this.sendCommandResult({
          commandId: `${message.deviceId}-${message.timestamp}`,
          deviceId: message.deviceId,
          success: false,
          error: 'Лицевой счет не найден',
          timestamp: Date.now()
        });
        return;
      }

      // Конфигурация подключения к MikroTik
      const connectionConfig = {
        host: device.ipAddress,
        username: device.username,
        password: 'encrypted_password' // TODO: Реализовать расшифровку пароля
      };

      let result: any;
      let success = false;

      // Выполняем команду в зависимости от типа
      switch (message.type) {
        case 'ADD_DHCP':
          if (!message.ipAddress || !message.poolName) {
            throw new Error('Для команды ADD_DHCP требуются ipAddress и poolName');
          }
          
          result = await this.mikrotikService.addDHCPLease(connectionConfig, {
            macAddress: message.macAddress,
            ipAddress: message.ipAddress,
            poolName: message.poolName,
            comment: `Л/С: ${account.accountNumber}, Клиент: ${account.client.firstName} ${account.client.lastName}`
          });
          success = result.success;
          break;

        case 'REMOVE_DHCP':
          result = await this.mikrotikService.removeDHCPLease(connectionConfig, message.macAddress);
          success = result.success;
          break;

        case 'BLOCK_CLIENT':
          result = await this.mikrotikService.blockClient(connectionConfig, message.macAddress);
          success = result.success;
          break;

        case 'UNBLOCK_CLIENT':
          result = await this.mikrotikService.unblockClient(connectionConfig, message.macAddress);
          success = result.success;
          break;

        case 'GET_STATS':
          result = await this.mikrotikService.getClientStats(connectionConfig, message.macAddress);
          success = result !== null;
          break;

        default:
          throw new Error(`Неизвестный тип команды: ${message.type}`);
      }

      // Отправляем результат выполнения
      await this.sendCommandResult({
        commandId: `${message.deviceId}-${message.timestamp}`,
        deviceId: message.deviceId,
        success,
        result,
        timestamp: Date.now()
      });

      console.log(`✅ Команда ${message.type} выполнена успешно для устройства ${message.deviceId}`);

    } catch (error) {
      console.error(`❌ Ошибка выполнения команды ${message.type}:`, error);

      // Отправляем информацию об ошибке
      await this.sendCommandResult({
        commandId: `${message.deviceId}-${message.timestamp}`,
        deviceId: message.deviceId,
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        timestamp: Date.now()
      });
    }
  }

  // Отправка результата выполнения команды
  private async sendCommandResult(result: MikroTikCommandResult): Promise<void> {
    try {
      await this.kafkaService.sendMessage(config.kafka.topics.deviceStatus, result);
      console.log(`📤 Результат команды отправлен: ${result.commandId}`);
    } catch (error) {
      console.error('❌ Ошибка отправки результата команды:', error);
    }
  }

  // Остановка consumer'а
  async stop(): Promise<void> {
    try {
      await this.kafkaService.disconnect();
      console.log('🛑 MikroTik Kafka Consumer остановлен');
    } catch (error) {
      console.error('❌ Ошибка остановки MikroTik Kafka Consumer:', error);
    }
  }
}