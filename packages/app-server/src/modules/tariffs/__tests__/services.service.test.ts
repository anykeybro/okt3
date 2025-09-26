// Мокаем Prisma
const mockPrisma = {
  service: {
    create: jest.fn().mockReturnValue(Promise.resolve()),
    findUnique: jest.fn().mockReturnValue(Promise.resolve()),
    findFirst: jest.fn().mockReturnValue(Promise.resolve()),
    findMany: jest.fn().mockReturnValue(Promise.resolve()),
    count: jest.fn().mockReturnValue(Promise.resolve()),
    update: jest.fn().mockReturnValue(Promise.resolve()),
    delete: jest.fn().mockReturnValue(Promise.resolve()),
  },
  tariff: {
    findMany: jest.fn().mockReturnValue(Promise.resolve()),
  },
};

jest.mock('../../../common/database', () => mockPrisma);

// Тесты для ServicesService
import { ServicesService } from '../services.service';
import { ValidationError, NotFoundError, ConflictError } from '../../../common/errors';
import { ServiceType } from '@prisma/client';

describe('ServicesService', () => {
  let servicesService: ServicesService;

  beforeEach(() => {
    servicesService = new ServicesService();
    jest.clearAllMocks();
  });

  describe('createService', () => {
    const validServiceData = {
      name: 'Интернет',
      description: 'Высокоскоростной интернет',
      type: ServiceType.INTERNET,
      isActive: true,
    };

    it('должен создать услугу с валидными данными', async () => {
      const mockService = { id: '1', ...validServiceData, createdAt: new Date(), updatedAt: new Date() };
      
      mockPrisma.service.findUnique.mockResolvedValue(null);
      mockPrisma.service.create.mockResolvedValue(mockService);

      const result = await servicesService.createService(validServiceData);

      expect(mockPrisma.service.findUnique).toHaveBeenCalledWith({
        where: { name: validServiceData.name }
      });
      expect(mockPrisma.service.create).toHaveBeenCalledWith({
        data: {
          name: validServiceData.name,
          description: validServiceData.description,
          type: validServiceData.type,
          isActive: validServiceData.isActive,
        }
      });
      expect(result).toEqual(mockService);
    });

    it('должен выбросить ValidationError при невалидных данных', async () => {
      const invalidData = {
        name: '',
        type: 'INVALID_TYPE' as ServiceType,
      };

      await expect(servicesService.createService(invalidData)).rejects.toThrow(ValidationError);
    });

    it('должен выбросить ConflictError при дублировании названия', async () => {
      const existingService = { id: '1', name: 'Интернет' };
      mockPrisma.service.findUnique.mockResolvedValue(existingService as any);

      await expect(servicesService.createService(validServiceData)).rejects.toThrow(ConflictError);
    });
  });

  describe('getServices', () => {
    it('должен вернуть список услуг с пагинацией', async () => {
      const mockServices = [
        { id: '1', name: 'Интернет', type: ServiceType.INTERNET, isActive: true },
        { id: '2', name: 'IPTV', type: ServiceType.IPTV, isActive: true },
      ];

      mockPrisma.service.findMany.mockResolvedValue(mockServices as any);
      mockPrisma.service.count.mockResolvedValue(2);

      const result = await servicesService.getServices({}, { page: 1, limit: 10 });

      expect(result).toEqual({
        data: mockServices,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('должен применить фильтры', async () => {
      const filters = {
        type: ServiceType.INTERNET,
        isActive: true,
        search: 'интернет',
      };

      mockPrisma.service.findMany.mockResolvedValue([]);
      mockPrisma.service.count.mockResolvedValue(0);

      await servicesService.getServices(filters);

      expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
        where: {
          type: ServiceType.INTERNET,
          isActive: true,
          OR: [
            { name: { contains: 'интернет', mode: 'insensitive' } },
            { description: { contains: 'интернет', mode: 'insensitive' } }
          ]
        },
        skip: 0,
        take: 20,
        orderBy: { name: 'asc' }
      });
    });
  });

  describe('getServiceById', () => {
    it('должен вернуть услугу по ID', async () => {
      const mockService = { id: '507f1f77bcf86cd799439011', name: 'Интернет' };
      mockPrisma.service.findUnique.mockResolvedValue(mockService as any);

      const result = await servicesService.getServiceById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockService);
    });

    it('должен выбросить NotFoundError если услуга не найдена', async () => {
      mockPrisma.service.findUnique.mockResolvedValue(null);

      await expect(servicesService.getServiceById('507f1f77bcf86cd799439011')).rejects.toThrow(NotFoundError);
    });

    it('должен выбросить ValidationError при невалидном ID', async () => {
      await expect(servicesService.getServiceById('invalid-id')).rejects.toThrow(ValidationError);
    });
  });

  describe('updateService', () => {
    const serviceId = '507f1f77bcf86cd799439011';
    const updateData = {
      name: 'Обновленное название',
      description: 'Обновленное описание',
    };

    it('должен обновить услугу', async () => {
      const existingService = { id: serviceId, name: 'Старое название' };
      const updatedService = { ...existingService, ...updateData };

      mockPrisma.service.findUnique.mockResolvedValue(existingService as any);
      mockPrisma.service.findFirst.mockResolvedValue(null);
      mockPrisma.service.update.mockResolvedValue(updatedService as any);

      const result = await servicesService.updateService(serviceId, updateData);

      expect(result).toEqual(updatedService);
    });

    it('должен выбросить ConflictError при дублировании названия', async () => {
      const existingService = { id: serviceId, name: 'Старое название' };
      const conflictService = { id: 'other-id', name: updateData.name };

      mockPrisma.service.findUnique.mockResolvedValue(existingService as any);
      mockPrisma.service.findFirst.mockResolvedValue(conflictService as any);

      await expect(servicesService.updateService(serviceId, updateData)).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteService', () => {
    const serviceId = '507f1f77bcf86cd799439011';

    it('должен удалить услугу', async () => {
      const existingService = { id: serviceId, name: 'Услуга' };

      mockPrisma.service.findUnique.mockResolvedValue(existingService as any);
      mockPrisma.tariff.findMany.mockResolvedValue([]);
      mockPrisma.service.delete.mockResolvedValue(existingService as any);

      await servicesService.deleteService(serviceId);

      expect(mockPrisma.service.delete).toHaveBeenCalledWith({
        where: { id: serviceId }
      });
    });

    it('должен выбросить ConflictError если услуга используется в тарифах', async () => {
      const existingService = { id: serviceId, name: 'Услуга' };
      const tariffsUsingService = [{ id: 'tariff1', name: 'Тариф 1' }];

      mockPrisma.service.findUnique.mockResolvedValue(existingService as any);
      mockPrisma.tariff.findMany.mockResolvedValue(tariffsUsingService as any);

      await expect(servicesService.deleteService(serviceId)).rejects.toThrow(ConflictError);
    });
  });

  describe('getActiveServices', () => {
    it('должен вернуть только активные услуги', async () => {
      const mockServices = [
        { id: '1', name: 'Интернет', isActive: true },
        { id: '2', name: 'IPTV', isActive: true },
      ];

      mockPrisma.service.findMany.mockResolvedValue(mockServices as any);

      const result = await servicesService.getActiveServices();

      expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      expect(result).toEqual(mockServices);
    });
  });

  describe('validateServiceIds', () => {
    it('должен пройти валидацию для существующих активных услуг', async () => {
      const serviceIds = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
      const mockServices = [
        { id: '507f1f77bcf86cd799439011', name: 'Интернет', isActive: true },
        { id: '507f1f77bcf86cd799439012', name: 'IPTV', isActive: true },
      ];

      mockPrisma.service.findMany.mockResolvedValue(mockServices as any);

      await expect(servicesService.validateServiceIds(serviceIds)).resolves.not.toThrow();
    });

    it('должен выбросить NotFoundError для несуществующих услуг', async () => {
      const serviceIds = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
      const mockServices = [
        { id: '507f1f77bcf86cd799439011', name: 'Интернет', isActive: true },
      ];

      mockPrisma.service.findMany.mockResolvedValue(mockServices as any);

      await expect(servicesService.validateServiceIds(serviceIds)).rejects.toThrow(NotFoundError);
    });

    it('должен выбросить ConflictError для неактивных услуг', async () => {
      const serviceIds = ['507f1f77bcf86cd799439011'];
      const mockServices = [
        { id: '507f1f77bcf86cd799439011', name: 'Интернет', isActive: false },
      ];

      mockPrisma.service.findMany.mockResolvedValue(mockServices as any);

      await expect(servicesService.validateServiceIds(serviceIds)).rejects.toThrow(ConflictError);
    });
  });
});