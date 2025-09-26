// Мокаем Prisma
const mockPrisma = {
  tariffGroup: {
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
    updateMany: jest.fn().mockReturnValue(Promise.resolve()),
  },
};

jest.mock('../../../common/database', () => mockPrisma);

// Тесты для TariffGroupsService
import { TariffGroupsService } from '../tariff-groups.service';
import { ValidationError, NotFoundError, ConflictError } from '../../../common/errors';

describe('TariffGroupsService', () => {
  let tariffGroupsService: TariffGroupsService;

  beforeEach(() => {
    tariffGroupsService = new TariffGroupsService();
    jest.clearAllMocks();
  });

  describe('createTariffGroup', () => {
    const validGroupData = {
      name: 'Базовые тарифы',
      description: 'Группа базовых тарифных планов',
    };

    it('должен создать группу тарифов с валидными данными', async () => {
      const mockGroup = { 
        id: '1', 
        ...validGroupData, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      };
      
      mockPrisma.tariffGroup.findUnique.mockResolvedValue(null);
      mockPrisma.tariffGroup.create.mockResolvedValue(mockGroup);

      const result = await tariffGroupsService.createTariffGroup(validGroupData);

      expect(mockPrisma.tariffGroup.findUnique).toHaveBeenCalledWith({
        where: { name: validGroupData.name }
      });
      expect(mockPrisma.tariffGroup.create).toHaveBeenCalledWith({
        data: {
          name: validGroupData.name,
          description: validGroupData.description,
        }
      });
      expect(result).toEqual(mockGroup);
    });

    it('должен создать группу без описания', async () => {
      const groupDataWithoutDescription = {
        name: 'Тестовая группа',
      };

      const mockGroup = { 
        id: '1', 
        ...groupDataWithoutDescription,
        description: null,
        createdAt: new Date(), 
        updatedAt: new Date() 
      };
      
      mockPrisma.tariffGroup.findUnique.mockResolvedValue(null);
      mockPrisma.tariffGroup.create.mockResolvedValue(mockGroup);

      const result = await tariffGroupsService.createTariffGroup(groupDataWithoutDescription);

      expect(mockPrisma.tariffGroup.create).toHaveBeenCalledWith({
        data: {
          name: groupDataWithoutDescription.name,
          description: undefined,
        }
      });
      expect(result).toEqual(mockGroup);
    });

    it('должен выбросить ValidationError при невалидных данных', async () => {
      const invalidData = {
        name: '', // пустое название
      };

      await expect(tariffGroupsService.createTariffGroup(invalidData)).rejects.toThrow(ValidationError);
    });

    it('должен выбросить ValidationError при слишком коротком названии', async () => {
      const invalidData = {
        name: 'А', // слишком короткое
      };

      await expect(tariffGroupsService.createTariffGroup(invalidData)).rejects.toThrow(ValidationError);
    });

    it('должен выбросить ConflictError при дублировании названия', async () => {
      const existingGroup = { id: '1', name: 'Базовые тарифы' };
      mockPrisma.tariffGroup.findUnique.mockResolvedValue(existingGroup as any);

      await expect(tariffGroupsService.createTariffGroup(validGroupData)).rejects.toThrow(ConflictError);
    });
  });

  describe('getTariffGroups', () => {
    it('должен вернуть список групп тарифов с пагинацией', async () => {
      const mockGroups = [
        { 
          id: '1', 
          name: 'Группа 1', 
          description: 'Описание 1',
          _count: { tariffs: 5 }
        },
        { 
          id: '2', 
          name: 'Группа 2', 
          description: 'Описание 2',
          _count: { tariffs: 3 }
        },
      ];

      mockPrisma.tariffGroup.findMany.mockResolvedValue(mockGroups as any);
      mockPrisma.tariffGroup.count.mockResolvedValue(2);

      const result = await tariffGroupsService.getTariffGroups({}, { page: 1, limit: 10 });

      expect(result).toEqual({
        data: mockGroups,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('должен применить поисковый фильтр', async () => {
      const filters = {
        search: 'базовые',
      };

      mockPrisma.tariffGroup.findMany.mockResolvedValue([]);
      mockPrisma.tariffGroup.count.mockResolvedValue(0);

      await tariffGroupsService.getTariffGroups(filters);

      expect(mockPrisma.tariffGroup.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'базовые', mode: 'insensitive' } },
            { description: { contains: 'базовые', mode: 'insensitive' } }
          ]
        },
        skip: 0,
        take: 20,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { tariffs: true }
          }
        }
      });
    });

    it('должен корректно обработать пагинацию', async () => {
      mockPrisma.tariffGroup.findMany.mockResolvedValue([]);
      mockPrisma.tariffGroup.count.mockResolvedValue(0);

      await tariffGroupsService.getTariffGroups({}, { page: 2, limit: 5 });

      expect(mockPrisma.tariffGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );
    });
  });

  describe('getTariffGroupById', () => {
    it('должен вернуть группу тарифов по ID', async () => {
      const mockGroup = { id: '507f1f77bcf86cd799439011', name: 'Группа тарифов' };
      mockPrisma.tariffGroup.findUnique.mockResolvedValue(mockGroup as any);

      const result = await tariffGroupsService.getTariffGroupById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockGroup);
    });

    it('должен выбросить NotFoundError если группа не найдена', async () => {
      mockPrisma.tariffGroup.findUnique.mockResolvedValue(null);

      await expect(tariffGroupsService.getTariffGroupById('507f1f77bcf86cd799439011')).rejects.toThrow(NotFoundError);
    });

    it('должен выбросить ValidationError при невалидном ID', async () => {
      await expect(tariffGroupsService.getTariffGroupById('invalid-id')).rejects.toThrow(ValidationError);
    });
  });

  describe('getTariffGroupWithTariffs', () => {
    it('должен вернуть группу с тарифами', async () => {
      const mockGroupWithTariffs = {
        id: '507f1f77bcf86cd799439011',
        name: 'Группа тарифов',
        description: 'Описание',
        tariffs: [
          { 
            id: 'tariff1', 
            name: 'Тариф 1',
            _count: { accounts: 10 }
          },
          { 
            id: 'tariff2', 
            name: 'Тариф 2',
            _count: { accounts: 5 }
          }
        ]
      };

      mockPrisma.tariffGroup.findUnique.mockResolvedValue(mockGroupWithTariffs as any);

      const result = await tariffGroupsService.getTariffGroupWithTariffs('507f1f77bcf86cd799439011');

      expect(mockPrisma.tariffGroup.findUnique).toHaveBeenCalledWith({
        where: { id: '507f1f77bcf86cd799439011' },
        include: {
          tariffs: {
            orderBy: { name: 'asc' },
            include: {
              _count: {
                select: { accounts: true }
              }
            }
          }
        }
      });
      expect(result).toEqual(mockGroupWithTariffs);
    });

    it('должен выбросить NotFoundError если группа не найдена', async () => {
      mockPrisma.tariffGroup.findUnique.mockResolvedValue(null);

      await expect(tariffGroupsService.getTariffGroupWithTariffs('507f1f77bcf86cd799439011')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateTariffGroup', () => {
    const groupId = '507f1f77bcf86cd799439011';
    const updateData = {
      name: 'Обновленное название',
      description: 'Обновленное описание',
    };

    it('должен обновить группу тарифов', async () => {
      const existingGroup = { id: groupId, name: 'Старое название' };
      const updatedGroup = { ...existingGroup, ...updateData };

      mockPrisma.tariffGroup.findUnique.mockResolvedValue(existingGroup as any);
      mockPrisma.tariffGroup.findFirst.mockResolvedValue(null);
      mockPrisma.tariffGroup.update.mockResolvedValue(updatedGroup as any);

      const result = await tariffGroupsService.updateTariffGroup(groupId, updateData);

      expect(result).toEqual(updatedGroup);
    });

    it('должен обновить только переданные поля', async () => {
      const existingGroup = { id: groupId, name: 'Старое название' };
      const partialUpdateData = { name: 'Новое название' };

      mockPrisma.tariffGroup.findUnique.mockResolvedValue(existingGroup as any);
      mockPrisma.tariffGroup.findFirst.mockResolvedValue(null);
      mockPrisma.tariffGroup.update.mockResolvedValue({ ...existingGroup, ...partialUpdateData } as any);

      await tariffGroupsService.updateTariffGroup(groupId, partialUpdateData);

      expect(mockPrisma.tariffGroup.update).toHaveBeenCalledWith({
        where: { id: groupId },
        data: {
          name: partialUpdateData.name,
        }
      });
    });

    it('должен выбросить ConflictError при дублировании названия', async () => {
      const existingGroup = { id: groupId, name: 'Старое название' };
      const conflictGroup = { id: 'other-id', name: updateData.name };

      mockPrisma.tariffGroup.findUnique.mockResolvedValue(existingGroup as any);
      mockPrisma.tariffGroup.findFirst.mockResolvedValue(conflictGroup as any);

      await expect(tariffGroupsService.updateTariffGroup(groupId, updateData)).rejects.toThrow(ConflictError);
    });

    it('должен выбросить NotFoundError если группа не найдена', async () => {
      mockPrisma.tariffGroup.findUnique.mockResolvedValue(null);

      await expect(tariffGroupsService.updateTariffGroup(groupId, updateData)).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteTariffGroup', () => {
    const groupId = '507f1f77bcf86cd799439011';

    it('должен удалить группу тарифов', async () => {
      const existingGroup = { id: groupId, name: 'Группа' };

      mockPrisma.tariffGroup.findUnique.mockResolvedValue(existingGroup as any);
      mockPrisma.tariff.findMany.mockResolvedValue([]);
      mockPrisma.tariffGroup.delete.mockResolvedValue(existingGroup as any);

      await tariffGroupsService.deleteTariffGroup(groupId);

      expect(mockPrisma.tariffGroup.delete).toHaveBeenCalledWith({
        where: { id: groupId }
      });
    });

    it('должен выбросить ConflictError если в группе есть тарифы', async () => {
      const existingGroup = { id: groupId, name: 'Группа' };
      const tariffsInGroup = [{ id: 'tariff1', name: 'Тариф 1' }];

      mockPrisma.tariffGroup.findUnique.mockResolvedValue(existingGroup as any);
      mockPrisma.tariff.findMany.mockResolvedValue(tariffsInGroup as any);

      await expect(tariffGroupsService.deleteTariffGroup(groupId)).rejects.toThrow(ConflictError);
    });

    it('должен выбросить NotFoundError если группа не найдена', async () => {
      mockPrisma.tariffGroup.findUnique.mockResolvedValue(null);

      await expect(tariffGroupsService.deleteTariffGroup(groupId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAllTariffGroups', () => {
    it('должен вернуть все группы тарифов', async () => {
      const mockGroups = [
        { id: '1', name: 'Группа 1' },
        { id: '2', name: 'Группа 2' },
      ];

      mockPrisma.tariffGroup.findMany.mockResolvedValue(mockGroups as any);

      const result = await tariffGroupsService.getAllTariffGroups();

      expect(mockPrisma.tariffGroup.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' }
      });
      expect(result).toEqual(mockGroups);
    });
  });

  describe('moveTariffsToGroup', () => {
    const fromGroupId = '507f1f77bcf86cd799439011';
    const toGroupId = '507f1f77bcf86cd799439012';

    it('должен переместить тарифы в другую группу', async () => {
      const fromGroup = { id: fromGroupId, name: 'Исходная группа' };
      const toGroup = { id: toGroupId, name: 'Целевая группа' };

      mockPrisma.tariffGroup.findUnique
        .mockResolvedValueOnce(fromGroup as any)
        .mockResolvedValueOnce(toGroup as any);
      mockPrisma.tariff.updateMany.mockResolvedValue({ count: 3 } as any);

      await tariffGroupsService.moveTariffsToGroup(fromGroupId, toGroupId);

      expect(mockPrisma.tariff.updateMany).toHaveBeenCalledWith({
        where: { groupId: fromGroupId },
        data: { groupId: toGroupId }
      });
    });

    it('должен переместить тарифы в null (убрать из группы)', async () => {
      const fromGroup = { id: fromGroupId, name: 'Исходная группа' };

      mockPrisma.tariffGroup.findUnique.mockResolvedValue(fromGroup as any);
      mockPrisma.tariff.updateMany.mockResolvedValue({ count: 3 } as any);

      await tariffGroupsService.moveTariffsToGroup(fromGroupId, null);

      expect(mockPrisma.tariff.updateMany).toHaveBeenCalledWith({
        where: { groupId: fromGroupId },
        data: { groupId: null }
      });
    });

    it('должен выбросить NotFoundError если исходная группа не найдена', async () => {
      mockPrisma.tariffGroup.findUnique.mockResolvedValue(null);

      await expect(tariffGroupsService.moveTariffsToGroup(fromGroupId, toGroupId)).rejects.toThrow(NotFoundError);
    });

    it('должен выбросить NotFoundError если целевая группа не найдена', async () => {
      const fromGroup = { id: fromGroupId, name: 'Исходная группа' };

      mockPrisma.tariffGroup.findUnique
        .mockResolvedValueOnce(fromGroup as any)
        .mockResolvedValueOnce(null);

      await expect(tariffGroupsService.moveTariffsToGroup(fromGroupId, toGroupId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getTariffGroupStats', () => {
    const groupId = '507f1f77bcf86cd799439011';

    it('должен вернуть статистику по группе', async () => {
      const mockGroupWithTariffs = {
        id: groupId,
        name: 'Группа тарифов',
        description: 'Описание',
        createdAt: new Date(),
        updatedAt: new Date(),
        tariffs: [
          { 
            id: 'tariff1', 
            name: 'Тариф 1',
            price: 500,
            isActive: true,
            _count: { accounts: 10 }
          },
          { 
            id: 'tariff2', 
            name: 'Тариф 2',
            price: 800,
            isActive: true,
            _count: { accounts: 5 }
          },
          { 
            id: 'tariff3', 
            name: 'Тариф 3',
            price: 300,
            isActive: false,
            _count: { accounts: 0 }
          }
        ]
      };

      mockPrisma.tariffGroup.findUnique.mockResolvedValue(mockGroupWithTariffs as any);

      const result = await tariffGroupsService.getTariffGroupStats(groupId);

      expect(result.stats).toEqual({
        totalTariffs: 3,
        activeTariffs: 2,
        totalAccounts: 15,
        averagePrice: expect.closeTo(533.33, 2), // (500 + 800 + 300) / 3
        priceRange: {
          min: 300,
          max: 800
        }
      });
    });

    it('должен корректно обработать пустую группу', async () => {
      const mockEmptyGroup = {
        id: groupId,
        name: 'Пустая группа',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tariffs: []
      };

      mockPrisma.tariffGroup.findUnique.mockResolvedValue(mockEmptyGroup as any);

      const result = await tariffGroupsService.getTariffGroupStats(groupId);

      expect(result.stats).toEqual({
        totalTariffs: 0,
        activeTariffs: 0,
        totalAccounts: 0,
        averagePrice: 0,
        priceRange: {
          min: 0,
          max: 0
        }
      });
    });

    it('должен выбросить NotFoundError если группа не найдена', async () => {
      mockPrisma.tariffGroup.findUnique.mockResolvedValue(null);

      await expect(tariffGroupsService.getTariffGroupStats(groupId)).rejects.toThrow(NotFoundError);
    });
  });
});