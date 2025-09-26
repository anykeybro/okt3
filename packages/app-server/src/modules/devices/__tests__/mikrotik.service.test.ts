// Unit тесты для MikroTikService

import { MikroTikService } from '../mikrotik.service';
import { ExternalServiceError } from '../../../common/errors';

// Мокаем child_process
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

// Мокаем util
jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn)
}));

describe('MikroTikService', () => {
  let mikrotikService: MikroTikService;
  let mockExec: jest.Mock;

  beforeEach(() => {
    mikrotikService = new MikroTikService();
    mockExec = require('child_process').exec;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('pingDevice', () => {
    it('должен вернуть true для успешного ping', async () => {
      // Arrange
      const ipAddress = '192.168.1.1';
      mockExec.mockResolvedValue({
        stdout: 'Ответ от 192.168.1.1: число байт=32 время<1мс TTL=64'
      });

      // Act
      const result = await mikrotikService.pingDevice(ipAddress);

      // Assert
      expect(result).toBe(true);
      expect(mockExec).toHaveBeenCalledWith(`ping -n 1 -w 3000 ${ipAddress}`);
    });

    it('должен вернуть false для неуспешного ping', async () => {
      // Arrange
      const ipAddress = '192.168.1.999';
      mockExec.mockResolvedValue({
        stdout: 'Превышен интервал ожидания для запроса.'
      });

      // Act
      const result = await mikrotikService.pingDevice(ipAddress);

      // Assert
      expect(result).toBe(false);
    });

    it('должен вернуть false при ошибке выполнения ping', async () => {
      // Arrange
      const ipAddress = '192.168.1.1';
      mockExec.mockRejectedValue(new Error('Command failed'));

      // Act
      const result = await mikrotikService.pingDevice(ipAddress);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('должен вернуть true для успешного подключения', async () => {
      // Arrange
      const connectionConfig = {
        host: '192.168.1.1',
        username: 'admin',
        password: 'password'
      };

      // Мокаем успешный API запрос
      jest.spyOn(mikrotikService as any, 'makeApiRequest').mockResolvedValue({
        success: true,
        data: { identity: 'MikroTik' }
      });

      // Act
      const result = await mikrotikService.testConnection(connectionConfig);

      // Assert
      expect(result).toBe(true);
    });

    it('должен вернуть false для неуспешного подключения', async () => {
      // Arrange
      const connectionConfig = {
        host: '192.168.1.1',
        username: 'admin',
        password: 'wrong_password'
      };

      // Мокаем неуспешный API запрос
      jest.spyOn(mikrotikService as any, 'makeApiRequest').mockResolvedValue({
        success: false,
        error: 'Authentication failed'
      });

      // Act
      const result = await mikrotikService.testConnection(connectionConfig);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('addDHCPLease', () => {
    it('должен успешно добавить DHCP lease', async () => {
      // Arrange
      const connectionConfig = {
        host: '192.168.1.1',
        username: 'admin',
        password: 'password'
      };

      const lease = {
        macAddress: '00:11:22:33:44:55',
        ipAddress: '192.168.1.100',
        poolName: 'default',
        comment: 'Test lease'
      };

      // Мокаем успешный API запрос
      jest.spyOn(mikrotikService as any, 'makeApiRequest').mockResolvedValue({
        success: true,
        data: { id: 'lease-id-1' }
      });

      // Act
      const result = await mikrotikService.addDHCPLease(connectionConfig, lease);

      // Assert
      expect(result.success).toBe(true);
      expect(mikrotikService['makeApiRequest']).toHaveBeenCalledWith(
        connectionConfig,
        '/ip/dhcp-server/lease/add',
        expect.objectContaining({
          'mac-address': lease.macAddress,
          'address': lease.ipAddress,
          'server': lease.poolName,
          'comment': lease.comment
        })
      );
    });

    it('должен выбросить ExternalServiceError при ошибке', async () => {
      // Arrange
      const connectionConfig = {
        host: '192.168.1.1',
        username: 'admin',
        password: 'password'
      };

      const lease = {
        macAddress: '00:11:22:33:44:55',
        ipAddress: '192.168.1.100',
        poolName: 'default'
      };

      // Мокаем ошибку API запроса
      jest.spyOn(mikrotikService as any, 'makeApiRequest').mockRejectedValue(
        new Error('Connection timeout')
      );

      // Act & Assert
      await expect(mikrotikService.addDHCPLease(connectionConfig, lease))
        .rejects
        .toThrow(ExternalServiceError);
    });
  });

  describe('removeDHCPLease', () => {
    it('должен успешно удалить DHCP lease', async () => {
      // Arrange
      const connectionConfig = {
        host: '192.168.1.1',
        username: 'admin',
        password: 'password'
      };

      const macAddress = '00:11:22:33:44:55';

      // Мокаем поиск lease
      jest.spyOn(mikrotikService as any, 'makeApiRequest')
        .mockResolvedValueOnce({
          success: true,
          data: [{ '.id': 'lease-id-1', 'mac-address': macAddress }]
        })
        .mockResolvedValueOnce({
          success: true
        });

      // Act
      const result = await mikrotikService.removeDHCPLease(connectionConfig, macAddress);

      // Assert
      expect(result.success).toBe(true);
    });

    it('должен вернуть ошибку если lease не найден', async () => {
      // Arrange
      const connectionConfig = {
        host: '192.168.1.1',
        username: 'admin',
        password: 'password'
      };

      const macAddress = '00:11:22:33:44:55';

      // Мокаем отсутствие lease
      jest.spyOn(mikrotikService as any, 'makeApiRequest').mockResolvedValue({
        success: true,
        data: []
      });

      // Act
      const result = await mikrotikService.removeDHCPLease(connectionConfig, macAddress);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('DHCP lease не найден');
    });
  });

  describe('blockClient', () => {
    it('должен успешно заблокировать клиента', async () => {
      // Arrange
      const connectionConfig = {
        host: '192.168.1.1',
        username: 'admin',
        password: 'password'
      };

      const macAddress = '00:11:22:33:44:55';

      // Мокаем успешный API запрос
      jest.spyOn(mikrotikService as any, 'makeApiRequest').mockResolvedValue({
        success: true,
        data: { id: 'rule-id-1' }
      });

      // Act
      const result = await mikrotikService.blockClient(connectionConfig, macAddress);

      // Assert
      expect(result.success).toBe(true);
      expect(mikrotikService['makeApiRequest']).toHaveBeenCalledWith(
        connectionConfig,
        '/interface/ethernet/switch/rule/add',
        expect.objectContaining({
          'src-mac-address': macAddress,
          'new-dst-port': 'drop'
        })
      );
    });
  });

  describe('unblockClient', () => {
    it('должен успешно разблокировать клиента', async () => {
      // Arrange
      const connectionConfig = {
        host: '192.168.1.1',
        username: 'admin',
        password: 'password'
      };

      const macAddress = '00:11:22:33:44:55';

      // Мокаем поиск и удаление правила
      jest.spyOn(mikrotikService as any, 'makeApiRequest')
        .mockResolvedValueOnce({
          success: true,
          data: [{ '.id': 'rule-id-1', 'src-mac-address': macAddress }]
        })
        .mockResolvedValueOnce({
          success: true
        });

      // Act
      const result = await mikrotikService.unblockClient(connectionConfig, macAddress);

      // Assert
      expect(result.success).toBe(true);
    });

    it('должен вернуть success если правило блокировки не найдено', async () => {
      // Arrange
      const connectionConfig = {
        host: '192.168.1.1',
        username: 'admin',
        password: 'password'
      };

      const macAddress = '00:11:22:33:44:55';

      // Мокаем отсутствие правила
      jest.spyOn(mikrotikService as any, 'makeApiRequest').mockResolvedValue({
        success: true,
        data: []
      });

      // Act
      const result = await mikrotikService.unblockClient(connectionConfig, macAddress);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('getClientStats', () => {
    it('должен вернуть статистику клиента', async () => {
      // Arrange
      const connectionConfig = {
        host: '192.168.1.1',
        username: 'admin',
        password: 'password'
      };

      const macAddress = '00:11:22:33:44:55';

      // Мокаем получение DHCP lease и статистики
      jest.spyOn(mikrotikService as any, 'makeApiRequest')
        .mockResolvedValueOnce({
          success: true,
          data: [{
            'mac-address': macAddress,
            'address': '192.168.1.100',
            'last-seen': '2h30m15s'
          }]
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            'rx-bytes': 1024000,
            'tx-bytes': 512000,
            'rx-packets': 1000,
            'tx-packets': 500
          }
        });

      // Act
      const result = await mikrotikService.getClientStats(connectionConfig, macAddress);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.macAddress).toBe(macAddress);
      expect(result?.ipAddress).toBe('192.168.1.100');
      expect(result?.bytesIn).toBe(1024000);
      expect(result?.bytesOut).toBe(512000);
    });

    it('должен вернуть null если клиент не найден', async () => {
      // Arrange
      const connectionConfig = {
        host: '192.168.1.1',
        username: 'admin',
        password: 'password'
      };

      const macAddress = '00:11:22:33:44:55';

      // Мокаем отсутствие DHCP lease
      jest.spyOn(mikrotikService as any, 'makeApiRequest').mockResolvedValue({
        success: true,
        data: []
      });

      // Act
      const result = await mikrotikService.getClientStats(connectionConfig, macAddress);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getAllDHCPLeases', () => {
    it('должен вернуть список всех DHCP lease', async () => {
      // Arrange
      const connectionConfig = {
        host: '192.168.1.1',
        username: 'admin',
        password: 'password'
      };

      const mockLeases = [
        {
          'mac-address': '00:11:22:33:44:55',
          'address': '192.168.1.100',
          'server': 'default',
          'comment': 'Client 1'
        },
        {
          'mac-address': '00:11:22:33:44:66',
          'address': '192.168.1.101',
          'server': 'default',
          'comment': 'Client 2'
        }
      ];

      // Мокаем успешный API запрос
      jest.spyOn(mikrotikService as any, 'makeApiRequest').mockResolvedValue({
        success: true,
        data: mockLeases
      });

      // Act
      const result = await mikrotikService.getAllDHCPLeases(connectionConfig);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].macAddress).toBe('00:11:22:33:44:55');
      expect(result[0].ipAddress).toBe('192.168.1.100');
      expect(result[1].macAddress).toBe('00:11:22:33:44:66');
    });

    it('должен вернуть пустой массив при ошибке API', async () => {
      // Arrange
      const connectionConfig = {
        host: '192.168.1.1',
        username: 'admin',
        password: 'password'
      };

      // Мокаем неуспешный API запрос
      jest.spyOn(mikrotikService as any, 'makeApiRequest').mockResolvedValue({
        success: false,
        error: 'Connection failed'
      });

      // Act
      const result = await mikrotikService.getAllDHCPLeases(connectionConfig);

      // Assert
      expect(result).toEqual([]);
    });
  });
});