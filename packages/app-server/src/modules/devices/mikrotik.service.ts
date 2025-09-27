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

  // Блокировка клиента (несколько методов)
  async blockClient(connectionConfig: MikroTikConnectionConfig, macAddress: string): Promise<MikroTikApiResponse> {
    try {
      console.log(`🚫 Блокировка клиента ${macAddress} на устройстве ${connectionConfig.host}`);
      
      // Метод 1: Блокировка через Address List
      const addressListResult = await this.addToAddressList(connectionConfig, macAddress, 'blocked-clients');
      
      // Метод 2: Блокировка через Firewall Filter (если Address List не сработал)
      if (!addressListResult.success) {
        console.log('⚠️ Address List блокировка не удалась, пробуем Firewall Filter');
        return await this.addFirewallBlockRule(connectionConfig, macAddress);
      }

      return addressListResult;
    } catch (error) {
      throw new ExternalServiceError('MikroTik', `Ошибка блокировки клиента: ${error}`);
    }
  }

  // Разблокировка клиента
  async unblockClient(connectionConfig: MikroTikConnectionConfig, macAddress: string): Promise<MikroTikApiResponse> {
    try {
      console.log(`✅ Разблокировка клиента ${macAddress} на устройстве ${connectionConfig.host}`);
      
      // Метод 1: Удаление из Address List
      const addressListResult = await this.removeFromAddressList(connectionConfig, macAddress, 'blocked-clients');
      
      // Метод 2: Удаление Firewall правила
      const firewallResult = await this.removeFirewallBlockRule(connectionConfig, macAddress);
      
      // Считаем успешным, если хотя бы один метод сработал
      return {
        success: addressListResult.success || firewallResult.success,
        data: {
          addressList: addressListResult,
          firewall: firewallResult
        }
      };
    } catch (error) {
      throw new ExternalServiceError('MikroTik', `Ошибка разблокировки клиента: ${error}`);
    }
  }

  // Добавление MAC адреса в Address List
  private async addToAddressList(
    connectionConfig: MikroTikConnectionConfig, 
    macAddress: string, 
    listName: string
  ): Promise<MikroTikApiResponse> {
    try {
      // Сначала получаем IP адрес по MAC из DHCP lease
      const dhcpResponse = await this.makeApiRequest(connectionConfig, '/ip/dhcp-server/lease/print', {
        'where': `mac-address=${macAddress}`
      });

      if (!dhcpResponse.success || !dhcpResponse.data || dhcpResponse.data.length === 0) {
        return { success: false, error: 'IP адрес для MAC не найден в DHCP lease' };
      }

      const ipAddress = dhcpResponse.data[0].address;
      
      // Добавляем IP в Address List
      return await this.makeApiRequest(connectionConfig, '/ip/firewall/address-list/add', {
        'list': listName,
        'address': ipAddress,
        'comment': `Заблокирован биллингом: MAC ${macAddress} - ${new Date().toISOString()}`
      });
    } catch (error) {
      return { success: false, error: `Ошибка добавления в Address List: ${error}` };
    }
  }

  // Удаление MAC адреса из Address List
  private async removeFromAddressList(
    connectionConfig: MikroTikConnectionConfig, 
    macAddress: string, 
    listName: string
  ): Promise<MikroTikApiResponse> {
    try {
      // Получаем IP адрес по MAC
      const dhcpResponse = await this.makeApiRequest(connectionConfig, '/ip/dhcp-server/lease/print', {
        'where': `mac-address=${macAddress}`
      });

      if (!dhcpResponse.success || !dhcpResponse.data || dhcpResponse.data.length === 0) {
        return { success: true }; // Если нет DHCP lease, то и блокировки нет
      }

      const ipAddress = dhcpResponse.data[0].address;
      
      // Находим запись в Address List
      const findResponse = await this.makeApiRequest(connectionConfig, '/ip/firewall/address-list/print', {
        'where': `list=${listName} && address=${ipAddress}`
      });

      if (!findResponse.success || !findResponse.data || findResponse.data.length === 0) {
        return { success: true }; // Уже удален
      }

      const entryId = findResponse.data[0]['.id'];
      
      // Удаляем запись
      return await this.makeApiRequest(connectionConfig, '/ip/firewall/address-list/remove', {
        'numbers': entryId
      });
    } catch (error) {
      return { success: false, error: `Ошибка удаления из Address List: ${error}` };
    }
  }

  // Добавление правила блокировки через Firewall Filter
  private async addFirewallBlockRule(
    connectionConfig: MikroTikConnectionConfig, 
    macAddress: string
  ): Promise<MikroTikApiResponse> {
    try {
      return await this.makeApiRequest(connectionConfig, '/ip/firewall/filter/add', {
        'chain': 'forward',
        'src-mac-address': macAddress,
        'action': 'drop',
        'comment': `Блокировка биллинга: ${macAddress} - ${new Date().toISOString()}`
      });
    } catch (error) {
      return { success: false, error: `Ошибка добавления Firewall правила: ${error}` };
    }
  }

  // Удаление правила блокировки через Firewall Filter
  private async removeFirewallBlockRule(
    connectionConfig: MikroTikConnectionConfig, 
    macAddress: string
  ): Promise<MikroTikApiResponse> {
    try {
      // Находим правило по MAC адресу
      const findResponse = await this.makeApiRequest(connectionConfig, '/ip/firewall/filter/print', {
        'where': `src-mac-address=${macAddress} && action=drop`
      });

      if (!findResponse.success || !findResponse.data || findResponse.data.length === 0) {
        return { success: true }; // Правило уже удалено
      }

      const ruleId = findResponse.data[0]['.id'];
      
      // Удаляем правило
      return await this.makeApiRequest(connectionConfig, '/ip/firewall/filter/remove', {
        'numbers': ruleId
      });
    } catch (error) {
      return { success: false, error: `Ошибка удаления Firewall правила: ${error}` };
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