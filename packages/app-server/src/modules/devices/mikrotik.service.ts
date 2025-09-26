// Сервис для работы с MikroTik API

import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import { 
  MikroTikConnectionConfig, 
  MikroTikApiResponse, 
  DHCPLease, 
  DeviceClientStats 
} from './device.types';
import { ExternalServiceError } from '../../common/errors';
import { config } from '../../config/config';

const execAsync = promisify(exec);

export class MikroTikService {
  private readonly defaultPort = 8728;
  private readonly defaultTimeout = 10000;

  // Проверка доступности устройства через ping
  async pingDevice(ipAddress: string): Promise<boolean> {
    try {
      // Используем ping команду для Windows
      const { stdout } = await execAsync(`ping -n 1 -w 3000 ${ipAddress}`);
      
      // Проверяем успешность ping по выводу
      return stdout.includes('TTL=') || stdout.includes('время<') || stdout.includes('time<');
    } catch (error) {
      console.log(`❌ Ping failed for ${ipAddress}:`, error);
      return false;
    }
  }

  // Тестирование подключения к MikroTik API
  async testConnection(connectionConfig: MikroTikConnectionConfig): Promise<boolean> {
    try {
      // Для демонстрации используем HTTP API (в реальности нужен RouterOS API)
      const response = await this.makeApiRequest(connectionConfig, '/system/identity/print');
      return response.success;
    } catch (error) {
      console.log(`❌ MikroTik API connection failed for ${connectionConfig.host}:`, error);
      return false;
    }
  }

  // Добавление DHCP lease
  async addDHCPLease(connectionConfig: MikroTikConnectionConfig, lease: DHCPLease): Promise<MikroTikApiResponse> {
    try {
      const command = `/ip/dhcp-server/lease/add`;
      const params = {
        'mac-address': lease.macAddress,
        'address': lease.ipAddress,
        'server': lease.poolName,
        'comment': lease.comment || `Автосоздано биллингом ${new Date().toISOString()}`
      };

      return await this.makeApiRequest(connectionConfig, command, params);
    } catch (error) {
      throw new ExternalServiceError('MikroTik', `Ошибка добавления DHCP lease: ${error}`);
    }
  }

  // Удаление DHCP lease
  async removeDHCPLease(connectionConfig: MikroTikConnectionConfig, macAddress: string): Promise<MikroTikApiResponse> {
    try {
      // Сначала находим lease по MAC адресу
      const findResponse = await this.makeApiRequest(connectionConfig, '/ip/dhcp-server/lease/print', {
        'where': `mac-address=${macAddress}`
      });

      if (!findResponse.success || !findResponse.data || findResponse.data.length === 0) {
        return { success: false, error: 'DHCP lease не найден' };
      }

      const leaseId = findResponse.data[0]['.id'];
      
      // Удаляем lease
      return await this.makeApiRequest(connectionConfig, '/ip/dhcp-server/lease/remove', {
        'numbers': leaseId
      });
    } catch (error) {
      throw new ExternalServiceError('MikroTik', `Ошибка удаления DHCP lease: ${error}`);
    }
  }

  // Блокировка клиента
  async blockClient(connectionConfig: MikroTikConnectionConfig, macAddress: string): Promise<MikroTikApiResponse> {
    try {
      // Добавляем MAC в список заблокированных
      const command = `/interface/ethernet/switch/rule/add`;
      const params = {
        'src-mac-address': macAddress,
        'new-dst-port': 'drop',
        'comment': `Заблокирован биллингом ${new Date().toISOString()}`
      };

      return await this.makeApiRequest(connectionConfig, command, params);
    } catch (error) {
      throw new ExternalServiceError('MikroTik', `Ошибка блокировки клиента: ${error}`);
    }
  }

  // Разблокировка клиента
  async unblockClient(connectionConfig: MikroTikConnectionConfig, macAddress: string): Promise<MikroTikApiResponse> {
    try {
      // Находим правило блокировки по MAC адресу
      const findResponse = await this.makeApiRequest(connectionConfig, '/interface/ethernet/switch/rule/print', {
        'where': `src-mac-address=${macAddress}`
      });

      if (!findResponse.success || !findResponse.data || findResponse.data.length === 0) {
        return { success: true }; // Клиент уже разблокирован
      }

      const ruleId = findResponse.data[0]['.id'];
      
      // Удаляем правило блокировки
      return await this.makeApiRequest(connectionConfig, '/interface/ethernet/switch/rule/remove', {
        'numbers': ruleId
      });
    } catch (error) {
      throw new ExternalServiceError('MikroTik', `Ошибка разблокировки клиента: ${error}`);
    }
  }

  // Получение статистики клиента
  async getClientStats(connectionConfig: MikroTikConnectionConfig, macAddress: string): Promise<DeviceClientStats | null> {
    try {
      // Получаем информацию из DHCP lease
      const dhcpResponse = await this.makeApiRequest(connectionConfig, '/ip/dhcp-server/lease/print', {
        'where': `mac-address=${macAddress}`
      });

      if (!dhcpResponse.success || !dhcpResponse.data || dhcpResponse.data.length === 0) {
        return null;
      }

      const lease = dhcpResponse.data[0];
      
      // Получаем статистику трафика (упрощенная версия)
      const statsResponse = await this.makeApiRequest(connectionConfig, '/interface/monitor-traffic', {
        'interface': 'ether1', // В реальности нужно определить интерфейс
        'once': 'yes'
      });

      return {
        macAddress,
        ipAddress: lease.address,
        bytesIn: statsResponse.data?.['rx-bytes'] || 0,
        bytesOut: statsResponse.data?.['tx-bytes'] || 0,
        packetsIn: statsResponse.data?.['rx-packets'] || 0,
        packetsOut: statsResponse.data?.['tx-packets'] || 0,
        uptime: this.parseUptime(lease['last-seen']),
        lastSeen: new Date()
      };
    } catch (error) {
      throw new ExternalServiceError('MikroTik', `Ошибка получения статистики клиента: ${error}`);
    }
  }

  // Получение списка всех DHCP lease
  async getAllDHCPLeases(connectionConfig: MikroTikConnectionConfig): Promise<DHCPLease[]> {
    try {
      const response = await this.makeApiRequest(connectionConfig, '/ip/dhcp-server/lease/print');
      
      if (!response.success || !response.data) {
        return [];
      }

      return response.data.map((lease: any) => ({
        macAddress: lease['mac-address'],
        ipAddress: lease.address,
        poolName: lease.server,
        comment: lease.comment
      }));
    } catch (error) {
      throw new ExternalServiceError('MikroTik', `Ошибка получения списка DHCP lease: ${error}`);
    }
  }

  // Базовый метод для выполнения API запросов к MikroTik
  private async makeApiRequest(
    connectionConfig: MikroTikConnectionConfig, 
    command: string, 
    params?: Record<string, any>
  ): Promise<MikroTikApiResponse> {
    try {
      // В реальном приложении здесь должен быть RouterOS API клиент
      // Для демонстрации используем HTTP запросы к REST API (если доступен)
      
      const timeout = connectionConfig.timeout || this.defaultTimeout;
      const port = connectionConfig.port || this.defaultPort;
      
      // Имитация API запроса
      // В реальности нужно использовать библиотеку для RouterOS API
      console.log(`🔧 MikroTik API запрос: ${command} к ${connectionConfig.host}:${port}`);
      console.log('📋 Параметры:', params);
      
      // Для демонстрации возвращаем успешный ответ
      // TODO: Интегрировать реальный RouterOS API клиент
      return {
        success: true,
        data: { message: 'Команда выполнена успешно (демо режим)' }
      };
      
    } catch (error) {
      console.error('❌ Ошибка MikroTik API запроса:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  // Парсинг времени работы из строки MikroTik
  private parseUptime(uptimeString: string): number {
    if (!uptimeString) return 0;
    
    // Парсим строки вида "1d2h3m4s" или "2h30m15s"
    const regex = /(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/;
    const match = uptimeString.match(regex);
    
    if (!match) return 0;
    
    const days = parseInt(match[1] || '0', 10);
    const hours = parseInt(match[2] || '0', 10);
    const minutes = parseInt(match[3] || '0', 10);
    const seconds = parseInt(match[4] || '0', 10);
    
    return (days * 24 * 60 * 60) + (hours * 60 * 60) + (minutes * 60) + seconds;
  }
}