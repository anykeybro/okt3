// Unit тесты для ClientsService
import { ClientsService } from '../clients.service';
import { GeocodingService } from '../geocoding.service';
import prisma from '../../../common/database';
import { ValidationError, NotFoundError, ConflictError } from '../../../common/errors';

// Мокаем Prisma
jest.mock('../../../common/database', () => ({
  client: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  account: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  payment: {
    findMany: jest.fn(),
  },
}));

// Мокаем GeocodingService
jest.mock('../geocoding.service');

describe('ClientsService', () => {
  let clientsService: ClientsService;
  let mockGeocodingService: jest.Mocked<GeocodingService>;

  beforeEach(() => {
    clientsService = new ClientsService();
    mockGeocodingService = new GeocodingService() as jest.Mocked<GeocodingService>;
    (clientsService as any).geocodingService = mockGeocodingService;
    jest.clearAllMocks();
  });

  describe('createClient', () => {
    const validClientData = {
      firstName: 'Иван',
      lastName: 'Иванов',
      middleName: 'Иванович',
      phones: ['+79001234567'],
      email: 'ivan@example.com',
      address: 'Москва, ул. Тестовая, 1'
    };

    it('должен создать абонента с валидными данными', async () => {
      const mockClient = {
        id: '507f1f77bcf86cd799439011',
        ...validClientData,
        phones: ['+79001234567'],
        email: 'ivan@example.com',
        telegramId: null,
        coordinates: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockClientWithAccounts = {
        ...mockClient,
        accounts: []
      };

      (prisma.client.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.client.create as jest.Mock).mockResolvedValue(mockClient);
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClientWithAccounts);

      const result = await clientsService.createClient(validClientData);

      expect(prisma.client.create).toHaveBeenCalledWith({
        data: {
          firstName: 'Иван',
          lastName: 'Иванов',
          middleName: 'Иванович',
          phones: ['+79001234567'],
          email: 'ivan@example.com',
          telegramId: null,
          address: 'Москва, ул. Тестовая, 1',
          coordinates: null,
        }
      });

      expect(result).toEqual(mockClientWithAccounts);
    });

    it('должен выбросить ошибку при невалидных данных', async () => {
      const invalidData = {
        firstName: '', // Пустое имя
        lastName: 'Иванов',
        phones: []     // Пустой массив телефонов
      };

      await expect(clientsService.createClient(invalidData as any))
        .rejects.toThrow(ValidationError);
    });

    it('должен выбросить ошибку при дублировании телефона', async () => {
      const existingClient = { id: '507f1f77bcf86cd799439012' };
      (prisma.client.findFirst as jest.Mock).mockResolvedValue(existingClient);

      await expect(clientsService.createClient(validClientData))
        .rejects.toThrow(ConflictError);
    });

    it('должен выбросить ошибку при дублировании email', async () => {
      (prisma.client.findFirst as jest.Mock)
        .mockResolvedValueOnce(null) // Для телефона
        .mockResolvedValueOnce({ id: '507f1f77bcf86cd799439012' }); // Для email

      await expect(clientsService.createClient(validClientData))
        .rejects.toThrow(ConflictError);
    });

    it('должен геокодировать адрес при создании', async () => {
      const mockCoordinates = { latitude: 55.7558, longitude: 37.6176 };
      mockGeocodingService.geocodeAddress.mockResolvedValue({
        coordinates: mockCoordinates,
        formattedAddress: 'Москва, ул. Тестовая, д. 1'
      });

      const mockClient = {
        id: '507f1f77bcf86cd799439011',
        ...validClientData,
        coordinates: mockCoordinates,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.client.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.client.create as jest.Mock).mockResolvedValue(mockClient);
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({ ...mockClient, accounts: [] });

      await clientsService.createClient(validClientData);

      expect(mockGeocodingService.geocodeAddress).toHaveBeenCalledWith({
        address: 'Москва, ул. Тестовая, 1'
      });

      expect(prisma.client.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          coordinates: mockCoordinates,
          address: 'Москва, ул. Тестовая, д. 1'
        })
      });
    });
  });

  describe('getClients', () => {
    it('должен вернуть список абонентов с пагинацией', async () => {
      const mockClients = [
        {
          id: '507f1f77bcf86cd799439011',
          firstName: 'Иван',
          lastName: 'Иванов',
          accounts: []
        }
      ];

      (prisma.client.findMany as jest.Mock).mockResolvedValue(mockClients);
      (prisma.client.count as jest.Mock).mockResolvedValue(1);

      const result = await clientsService.getClients({}, { page: 1, limit: 20 });

      expect(result).toEqual({
        data: mockClients,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });
    });

    it('должен применить фильтры поиска', async () => {
      const filters = {
        search: 'Иван',
        status: 'ACTIVE' as any
      };

      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.client.count as jest.Mock).mockResolvedValue(0);

      await clientsService.getClients(filters);

      expect(prisma.client.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: expect.any(Array),
          accounts: { some: { status: 'ACTIVE' } }
        }),
        skip: 0,
        take: 20,
        orderBy: { lastName: 'asc' },
        include: expect.any(Object)
      });
    });
  });

  describe('getClientById', () => {
    it('должен вернуть абонента по ID', async () => {
      const mockClient = {
        id: '507f1f77bcf86cd799439011',
        firstName: 'Иван',
        lastName: 'Иванов'
      };

      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);

      const result = await clientsService.getClientById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockClient);
      expect(prisma.client.findUnique).toHaveBeenCalledWith({
        where: { id: '507f1f77bcf86cd799439011' }
      });
    });

    it('должен выбросить ошибку если абонент не найден', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(clientsService.getClientById('507f1f77bcf86cd799439011'))
        .rejects.toThrow(NotFoundError);
    });

    it('должен выбросить ошибку при невалидном ID', async () => {
      await expect(clientsService.getClientById('invalid-id'))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('updateClient', () => {
    const existingClient = {
      id: '507f1f77bcf86cd799439011',
      firstName: 'Иван',
      lastName: 'Иванов',
      phones: ['+79001234567'],
      email: 'ivan@example.com'
    };

    it('должен обновить абонента', async () => {
      const updateData = {
        firstName: 'Петр',
        email: 'petr@example.com'
      };

      (prisma.client.findUnique as jest.Mock)
        .mockResolvedValueOnce(existingClient)
        .mockResolvedValueOnce({ ...existingClient, ...updateData, accounts: [] });
      (prisma.client.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.client.update as jest.Mock).mockResolvedValue({ ...existingClient, ...updateData });

      const result = await clientsService.updateClient('507f1f77bcf86cd799439011', updateData);

      expect(prisma.client.update).toHaveBeenCalledWith({
        where: { id: '507f1f77bcf86cd799439011' },
        data: {
          firstName: 'Петр',
          email: 'petr@example.com'
        }
      });
    });

    it('должен проверить уникальность при изменении телефона', async () => {
      const updateData = { phones: ['+79009876543'] };
      const conflictingClient = { id: '507f1f77bcf86cd799439012' };

      (prisma.client.findUnique as jest.Mock).mockResolvedValue(existingClient);
      (prisma.client.findFirst as jest.Mock).mockResolvedValue(conflictingClient);

      await expect(clientsService.updateClient('507f1f77bcf86cd799439011', updateData))
        .rejects.toThrow(ConflictError);
    });
  });

  describe('deleteClient', () => {
    it('должен удалить абонента без лицевых счетов', async () => {
      const mockClient = { id: '507f1f77bcf86cd799439011' };

      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);
      (prisma.account.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.client.delete as jest.Mock).mockResolvedValue(mockClient);

      await clientsService.deleteClient('507f1f77bcf86cd799439011');

      expect(prisma.client.delete).toHaveBeenCalledWith({
        where: { id: '507f1f77bcf86cd799439011' }
      });
    });

    it('должен выбросить ошибку при наличии активных лицевых счетов', async () => {
      const mockClient = { id: '507f1f77bcf86cd799439011' };
      const activeAccounts = [
        { id: '1', accountNumber: '2401123456', status: 'ACTIVE' }
      ];

      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);
      (prisma.account.findMany as jest.Mock).mockResolvedValue(activeAccounts);

      await expect(clientsService.deleteClient('507f1f77bcf86cd799439011'))
        .rejects.toThrow(ConflictError);
    });
  });

  describe('searchClients', () => {
    it('должен найти абонентов по поисковому запросу', async () => {
      const mockClients = [
        {
          id: '507f1f77bcf86cd799439011',
          firstName: 'Иван',
          lastName: 'Иванов',
          middleName: null,
          phones: ['+79001234567'],
          address: 'Москва',
          accounts: [
            {
              id: '1',
              accountNumber: '2401123456',
              balance: 100,
              status: 'ACTIVE',
              tariff: { name: 'Базовый' }
            }
          ]
        }
      ];

      (prisma.client.findMany as jest.Mock).mockResolvedValue(mockClients);

      const result = await clientsService.searchClients('Иван');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '507f1f77bcf86cd799439011',
        fullName: 'Иванов Иван',
        phones: ['+79001234567'],
        address: 'Москва',
        accounts: [
          {
            id: '1',
            accountNumber: '2401123456',
            balance: 100,
            status: 'ACTIVE',
            tariffName: 'Базовый'
          }
        ]
      });
    });

    it('должен вернуть пустой массив для короткого запроса', async () => {
      const result = await clientsService.searchClients('И');
      expect(result).toEqual([]);
    });
  });

  describe('getClientStats', () => {
    it('должен вернуть статистику по абоненту', async () => {
      const mockClient = {
        id: '507f1f77bcf86cd799439011',
        createdAt: new Date('2024-01-01'),
        accounts: [
          { id: '1', status: 'ACTIVE', balance: 100 },
          { id: '2', status: 'BLOCKED', balance: 50 }
        ]
      };

      const mockPayments = [
        { amount: 500, createdAt: new Date('2024-01-15') },
        { amount: 300, createdAt: new Date('2024-01-10') }
      ];

      (prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient);
      (prisma.payment.findMany as jest.Mock).mockResolvedValue(mockPayments);

      const result = await clientsService.getClientStats('507f1f77bcf86cd799439011');

      expect(result).toEqual({
        totalAccounts: 2,
        activeAccounts: 1,
        blockedAccounts: 1,
        suspendedAccounts: 0,
        totalBalance: 150,
        averageBalance: 75,
        totalPayments: 800,
        lastPaymentDate: new Date('2024-01-15'),
        registrationDate: new Date('2024-01-01')
      });
    });
  });

  describe('getClientByPhone', () => {
    it('должен найти абонента по номеру телефона', async () => {
      const mockClient = {
        id: '507f1f77bcf86cd799439011',
        phones: ['+79001234567']
      };

      (prisma.client.findFirst as jest.Mock).mockResolvedValue(mockClient);

      const result = await clientsService.getClientByPhone('89001234567');

      expect(result).toEqual(mockClient);
      expect(prisma.client.findFirst).toHaveBeenCalledWith({
        where: { phones: { has: '+79001234567' } }
      });
    });

    it('должен вернуть null если абонент не найден', async () => {
      (prisma.client.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await clientsService.getClientByPhone('+79001234567');

      expect(result).toBeNull();
    });
  });
});