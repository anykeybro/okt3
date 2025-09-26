// Мокаем Prisma
const mockPrisma = {
  tariff: {
    create: jest.fn().mockReturnValue(Promise.resolve()),
    findUnique: jest.fn().mockReturnValue(Promise.resolve()),
    findFirst: jest.fn().mockReturnValue(Promise.resolve()),
    findMany: jest.fn().mockReturnValue(Promise.resolve()),
    count: jest.fn().mockReturnValue(Promise.resolve()),
    update: jest.fn().mockReturnValue(Promise.resolve()),
    delete: jest.fn().mockReturnValue(Promise.resolve()),
  },
  account: {
    findMany: jest.fn().mockReturnValue(Promise.resolve()),
  },
};

jest.mock('../../../common/database', () => mockPrisma);

// Мокаем сервисы
jest.mock('../services.service');
jest.mock('../tariff-groups.service');

// Тесты для TariffsService
import { TariffsService } from '../tariffs.service';
import { ServicesService } from '../services.service';
import { TariffGroupsService } from '../tariff-groups.service';
import { ValidationError, NotFoundError, ConflictError } from '../../../common/errors';
import { BillingType, ServiceType } from '@prisma/client';
const MockServicesService = ServicesService as jest.MockedClass<typeof ServicesService>;
const MockTariffGroupsService = TariffGroupsService as jest.MockedClass<typeof TariffGroupsService>;

describe('TariffsService', () => {
  let tariffsService: TariffsService;
  let mockServicesService: jest.Mocked<ServicesService>;
  let mockTariffGroupsService: jest.Mocked<TariffGroupsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockServicesService = new MockServicesService() as jest.Mocked<ServicesService>;
    mockTariffGroupsService = new MockTariffGroupsService() as jest.Mocked<TariffGroupsService>;
    
    tariffsService = new TariffsService();
    // Заменяем приватные сервисы на моки
    (tariffsService as any).servicesService = mockServicesService;
    (tariffsService as any).tariffGroupsService = mockTariffGroupsService;
  });

  describe('createTariff', () => {
    const validTariffData = {
      name: 'Базовый тариф',
      description: 'Базовый интернет тариф',
      price: 500,
      billingType: BillingType.PREPAID_MONTHLY,
      speedDown: 100,
      speedUp: 50,
      serviceIds: ['507f1f77bcf86cd799439011'],
      isActive: true,
    };

    it('должен создать тариф с валидными данными', async () => {
      const mockTariff = { 
        id: '1', 
        ...validTariffData, 
        groupId: null,
        isVisibleInLK: true,
        notificationDays: 3,
        createdAt: new Date(), 
        updatedAt: new Date() 
      };
      
      const mockServices = [
        { id: '507f1f77bcf86cd799439011', name: 'Интернет', type: ServiceType.INTERNET }
      ];

      mockPrisma.tariff.findUnique.mockResolvedValue(null);
      mockServicesService.validateServiceIds.mockResolvedValue();
      mockPrisma.tariff.create.mockResolvedValue(mockTariff as any);
      mockServicesService.getServicesByIds.mockResolvedValue(mockServices as any);
      mockPrisma.tariff.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...mockTariff,
          group: null
        } as any);

      const result = await tariffsService.createTariff(validTariffData);

      expect(mockPrisma.tariff.findUnique).toHaveBeenCalledWith({
        where: { name: validTariffData.name }
      });
      expect(mockServicesService.validateServiceIds).toHaveBeenCalledWith(validTariffData.serviceIds);
      expect(mockPrisma.tariff.create).toHaveBeenCalledWith({
        data: {
          name: validTariffData.name,
          description: validTariffData.description,
          price: validTariffData.price,
          billingType: validTariffData.billingType,
          speedDown: validTariffData.speedDown,
          speedUp: validTariffData.speedUp,
          serviceIds: validTariffData.serviceIds,
          groupId: undefined,
          isVisibleInLK: true,
          notificationDays: 3,
          isActive: true,
        }
      });
      expect(result.services).toEqual([{
        id: '507f1f77bcf86cd799439011',
        name: 'Интернет',
        type: ServiceType.INTERNET
      }]);
    });

    it('должен выбросить ValidationError при невалидных данных', async () => {
      const invalidData = {
        name: '',
        price: -100,
        billingType: 'INVALID' as BillingType,
        speedDown: 0,
        speedUp: 0,
        serviceIds: [],
      };

      await expect(tariffsService.createTariff(invalidData)).rejects.toThrow(ValidationError);
    });

    it('должен выбросить ValidationError при нарушении бизнес-правил', async () => {
      const invalidData = {
        ...validTariffData,
        speedUp: 200, // больше чем speedDown
        speedDown: 100,
      };

      await expect(tariffsService.createTariff(invalidData)).rejects.toThrow(ValidationError);
    });

    it('должен выбросить ConflictError при дублировании названия', async () => {
      const existingTariff = { id: '1', name: 'Базовый тариф' };
      mockPrisma.tariff.findUnique.mockResolvedValue(existingTariff as any);

      await expect(tariffsService.createTariff(validTariffData)).rejects.toThrow(ConflictError);
    });
  });

  describe('getTariffs', () => {
    it('должен вернуть список тарифов с пагинацией', async () => {
      const mockTariffs = [
        { 
          id: '1', 
          name: 'Тариф 1', 
          serviceIds: ['507f1f77bcf86cd799439011'],
          group: null
        },
        { 
          id: '2', 
          name: 'Тариф 2', 
          serviceIds: ['507f1f77bcf86cd799439012'],
          group: { id: 'group1', name: 'Группа 1' }
        },
      ];

      const mockServices = [
        { id: '507f1f77bcf86cd799439011', name: 'Интернет', type: ServiceType.INTERNET },
        { id: '507f1f77bcf86cd799439012', name: 'IPTV', type: ServiceType.IPTV },
      ];

      mockPrisma.tariff.findMany.mockResolvedValue(mockTariffs as any);
      mockPrisma.tariff.count.mockResolvedValue(2);
      mockServicesService.getServicesByIds
        .mockResolvedValueOnce([mockServices[0]] as any)
        .mockResolvedValueOnce([mockServices[1]] as any);

      const result = await tariffsService.getTariffs({}, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.data[0].services).toEqual([{
        id: '507f1f77bcf86cd799439011',
        name: 'Интернет',
        type: ServiceType.INTERNET
      }]);
    });

    it('должен применить фильтры', async () => {
      const filters = {
        billingType: BillingType.PREPAID_MONTHLY,
        isActive: true,
        priceMin: 100,
        priceMax: 1000,
        search: 'базовый',
      };

      mockPrisma.tariff.findMany.mockResolvedValue([]);
      mockPrisma.tariff.count.mockResolvedValue(0);

      await tariffsService.getTariffs(filters);

      expect(mockPrisma.tariff.findMany).toHaveBeenCalledWith({
        where: {
          billingType: BillingType.PREPAID_MONTHLY,
          isActive: true,
          price: {
            gte: 100,
            lte: 1000,
          },
          OR: [
            { name: { contains: 'базовый', mode: 'insensitive' } },
            { description: { contains: 'базовый', mode: 'insensitive' } }
          ]
        },
        skip: 0,
        take: 20,
        orderBy: { name: 'asc' },
        include: {
          group: {
            select: { id: true, name: true }
          }
        }
      });
    });
  });

  describe('getTariffById', () => {
    it('должен вернуть тариф по ID', async () => {
      const mockTariff = { id: '507f1f77bcf86cd799439011', name: 'Тариф' };
      mockPrisma.tariff.findUnique.mockResolvedValue(mockTariff as any);

      const result = await tariffsService.getTariffById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockTariff);
    });

    it('должен выбросить NotFoundError если тариф не найден', async () => {
      mockPrisma.tariff.findUnique.mockResolvedValue(null);

      await expect(tariffsService.getTariffById('507f1f77bcf86cd799439011')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateTariff', () => {
    const tariffId = '507f1f77bcf86cd799439011';
    const updateData = {
      name: 'Обновленный тариф',
      price: 600,
    };

    it('должен обновить тариф', async () => {
      const existingTariff = { id: tariffId, name: 'Старый тариф' };
      const updatedTariff = { 
        ...existingTariff, 
        ...updateData,
        serviceIds: ['507f1f77bcf86cd799439011'],
        group: null
      };
      const mockServices = [
        { id: '507f1f77bcf86cd799439011', name: 'Интернет', type: ServiceType.INTERNET }
      ];

      mockPrisma.tariff.findUnique
        .mockResolvedValueOnce(existingTariff as any)
        .mockResolvedValueOnce(updatedTariff as any);
      mockPrisma.tariff.findFirst.mockResolvedValue(null);
      mockPrisma.tariff.update.mockResolvedValue(updatedTariff as any);
      mockServicesService.getServicesByIds.mockResolvedValue(mockServices as any);

      const result = await tariffsService.updateTariff(tariffId, updateData);

      expect(result.name).toBe(updateData.name);
      expect(result.services).toEqual([{
        id: '507f1f77bcf86cd799439011',
        name: 'Интернет',
        type: ServiceType.INTERNET
      }]);
    });

    it('должен выбросить ConflictError при дублировании названия', async () => {
      const existingTariff = { id: tariffId, name: 'Старый тариф' };
      const conflictTariff = { id: 'other-id', name: updateData.name };

      mockPrisma.tariff.findUnique.mockResolvedValue(existingTariff as any);
      mockPrisma.tariff.findFirst.mockResolvedValue(conflictTariff as any);

      await expect(tariffsService.updateTariff(tariffId, updateData)).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteTariff', () => {
    const tariffId = '507f1f77bcf86cd799439011';

    it('должен удалить тариф', async () => {
      const existingTariff = { id: tariffId, name: 'Тариф' };

      mockPrisma.tariff.findUnique.mockResolvedValue(existingTariff as any);
      mockPrisma.account.findMany.mockResolvedValue([]);
      mockPrisma.tariff.delete.mockResolvedValue(existingTariff as any);

      await tariffsService.deleteTariff(tariffId);

      expect(mockPrisma.tariff.delete).toHaveBeenCalledWith({
        where: { id: tariffId }
      });
    });

    it('должен выбросить ConflictError если тариф используется в лицевых счетах', async () => {
      const existingTariff = { id: tariffId, name: 'Тариф' };
      const accountsUsingTariff = [{ id: 'account1', accountNumber: 'ACC001' }];

      mockPrisma.tariff.findUnique.mockResolvedValue(existingTariff as any);
      mockPrisma.account.findMany.mockResolvedValue(accountsUsingTariff as any);

      await expect(tariffsService.deleteTariff(tariffId)).rejects.toThrow(ConflictError);
    });
  });

  describe('getVisibleTariffs', () => {
    it('должен вернуть только видимые активные тарифы', async () => {
      const mockTariffs = [
        { 
          id: '1', 
          name: 'Тариф 1', 
          serviceIds: ['507f1f77bcf86cd799439011'],
          group: null
        },
      ];

      const mockServices = [
        { id: '507f1f77bcf86cd799439011', name: 'Интернет', type: ServiceType.INTERNET }
      ];

      mockPrisma.tariff.findMany.mockResolvedValue(mockTariffs as any);
      mockServicesService.getServicesByIds.mockResolvedValue(mockServices as any);

      const result = await tariffsService.getVisibleTariffs();

      expect(mockPrisma.tariff.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          isVisibleInLK: true
        },
        orderBy: { price: 'asc' },
        include: {
          group: {
            select: { id: true, name: true }
          }
        }
      });
      expect(result[0].services).toEqual([{
        id: '507f1f77bcf86cd799439011',
        name: 'Интернет',
        type: ServiceType.INTERNET
      }]);
    });
  });

  describe('copyTariff', () => {
    const tariffId = '507f1f77bcf86cd799439011';
    const newName = 'Копия тарифа';

    it('должен скопировать тариф', async () => {
      const originalTariff = {
        id: tariffId,
        name: 'Оригинальный тариф',
        description: 'Описание',
        price: 500,
        billingType: BillingType.PREPAID_MONTHLY,
        speedDown: 100,
        speedUp: 50,
        serviceIds: ['507f1f77bcf86cd799439011'],
        groupId: null,
        isVisibleInLK: true,
        notificationDays: 3,
        isActive: true,
      };

      const copiedTariff = {
        id: 'new-id',
        name: newName,
        description: 'Копия: Описание',
        price: 500,
        billingType: BillingType.PREPAID_MONTHLY,
        speedDown: 100,
        speedUp: 50,
        serviceIds: ['507f1f77bcf86cd799439011'],
        groupId: null,
        isVisibleInLK: false,
        notificationDays: 3,
        isActive: false,
        group: null,
      };

      const mockServices = [
        { id: '507f1f77bcf86cd799439011', name: 'Интернет', type: ServiceType.INTERNET }
      ];

      mockPrisma.tariff.findUnique
        .mockResolvedValueOnce(originalTariff as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(copiedTariff as any);
      mockPrisma.tariff.create.mockResolvedValue(copiedTariff as any);
      mockServicesService.getServicesByIds.mockResolvedValue(mockServices as any);

      const result = await tariffsService.copyTariff(tariffId, newName);

      expect(result.name).toBe(newName);
      expect(result.isActive).toBe(false);
      expect(result.isVisibleInLK).toBe(false);
    });

    it('должен выбросить ConflictError при дублировании названия', async () => {
      const originalTariff = { id: tariffId, name: 'Оригинальный тариф' };
      const existingTariff = { id: 'other-id', name: newName };

      mockPrisma.tariff.findUnique
        .mockResolvedValueOnce(originalTariff as any)
        .mockResolvedValueOnce(existingTariff as any);

      await expect(tariffsService.copyTariff(tariffId, newName)).rejects.toThrow(ConflictError);
    });
  });
});