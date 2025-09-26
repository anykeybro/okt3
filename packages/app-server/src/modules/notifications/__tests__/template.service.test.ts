// Тесты для TemplateService
import { TemplateService } from '../services/template.service';
import { NotificationType, NotificationChannel } from '../types';

// Мок для Prisma
const mockPrisma = {
  notificationTemplate: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  },
} as any;

describe('TemplateService', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = new TemplateService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('getTemplate', () => {
    it('должен возвращать активный шаблон', async () => {
      const mockTemplate = {
        id: '1',
        type: NotificationType.WELCOME,
        channel: NotificationChannel.TELEGRAM,
        template: 'Добро пожаловать, {{firstName}}!',
        isActive: true,
      };

      mockPrisma.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await templateService.getTemplate(
        NotificationType.WELCOME,
        NotificationChannel.TELEGRAM
      );

      expect(result).toBe(mockTemplate.template);
      expect(mockPrisma.notificationTemplate.findUnique).toHaveBeenCalledWith({
        where: {
          type_channel: {
            type: NotificationType.WELCOME,
            channel: NotificationChannel.TELEGRAM,
          },
        },
      });
    });

    it('должен возвращать null для неактивного шаблона', async () => {
      const mockTemplate = {
        id: '1',
        type: NotificationType.WELCOME,
        channel: NotificationChannel.TELEGRAM,
        template: 'Добро пожаловать, {{firstName}}!',
        isActive: false,
      };

      mockPrisma.notificationTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await templateService.getTemplate(
        NotificationType.WELCOME,
        NotificationChannel.TELEGRAM
      );

      expect(result).toBeNull();
    });

    it('должен возвращать null если шаблон не найден', async () => {
      mockPrisma.notificationTemplate.findUnique.mockResolvedValue(null);

      const result = await templateService.getTemplate(
        NotificationType.WELCOME,
        NotificationChannel.TELEGRAM
      );

      expect(result).toBeNull();
    });
  });

  describe('processTemplate', () => {
    it('должен заменять плейсхолдеры на значения', () => {
      const template = 'Привет, {{firstName}} {{lastName}}! Ваш баланс: {{balance}} руб.';
      const variables = {
        firstName: 'Иван',
        lastName: 'Петров',
        balance: 100,
      };

      const result = templateService.processTemplate(template, variables);

      expect(result.message).toBe('Привет, Иван Петров! Ваш баланс: 100 руб.');
      expect(result.variables).toEqual(variables);
    });

    it('должен оставлять плейсхолдеры если переменная не найдена', () => {
      const template = 'Привет, {{firstName}}! Ваш ID: {{userId}}';
      const variables = {
        firstName: 'Иван',
      };

      const result = templateService.processTemplate(template, variables);

      expect(result.message).toBe('Привет, Иван! Ваш ID: {{userId}}');
      expect(result.variables).toEqual({ firstName: 'Иван' });
    });

    it('должен обрабатывать пустой шаблон', () => {
      const template = '';
      const variables = { test: 'value' };

      const result = templateService.processTemplate(template, variables);

      expect(result.message).toBe('');
      expect(result.variables).toEqual({});
    });
  });

  describe('validateTemplate', () => {
    it('должен валидировать корректный шаблон', () => {
      const template = 'Привет, {{firstName}}! Баланс: {{balance}}';

      const result = templateService.validateTemplate(template);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('должен находить ошибки в плейсхолдерах', () => {
      const template = 'Привет, {{firstName! Баланс: {{balance';

      const result = templateService.validateTemplate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Несоответствие открывающих и закрывающих скобок в плейсхолдерах');
    });

    it('должен находить пустые плейсхолдеры', () => {
      const template = 'Привет, {{}}!';

      const result = templateService.validateTemplate(template);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Найдены пустые плейсхолдеры');
    });

    it('должен проверять длину SMS шаблона', () => {
      const longTemplate = 'A'.repeat(200);

      const result = templateService.validateTemplate(longTemplate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Шаблон SMS слишком длинный (более 160 символов без учета переменных)');
    });
  });

  describe('upsertTemplate', () => {
    it('должен создавать или обновлять шаблон', async () => {
      mockPrisma.notificationTemplate.upsert.mockResolvedValue({});

      await templateService.upsertTemplate(
        NotificationType.WELCOME,
        NotificationChannel.TELEGRAM,
        'Добро пожаловать!',
        true
      );

      expect(mockPrisma.notificationTemplate.upsert).toHaveBeenCalledWith({
        where: {
          type_channel: {
            type: NotificationType.WELCOME,
            channel: NotificationChannel.TELEGRAM,
          },
        },
        update: {
          template: 'Добро пожаловать!',
          isActive: true,
        },
        create: {
          type: NotificationType.WELCOME,
          channel: NotificationChannel.TELEGRAM,
          template: 'Добро пожаловать!',
          isActive: true,
        },
      });
    });
  });

  describe('getAllTemplates', () => {
    it('должен возвращать все шаблоны', async () => {
      const mockTemplates = [
        {
          id: '1',
          type: NotificationType.WELCOME,
          channel: NotificationChannel.TELEGRAM,
          template: 'Добро пожаловать!',
          isActive: true,
        },
      ];

      mockPrisma.notificationTemplate.findMany.mockResolvedValue(mockTemplates);

      const result = await templateService.getAllTemplates();

      expect(result).toEqual(mockTemplates);
      expect(mockPrisma.notificationTemplate.findMany).toHaveBeenCalledWith({
        orderBy: [
          { type: 'asc' },
          { channel: 'asc' },
        ],
      });
    });
  });

  describe('deleteTemplate', () => {
    it('должен удалять шаблон', async () => {
      mockPrisma.notificationTemplate.delete.mockResolvedValue({});

      await templateService.deleteTemplate(
        NotificationType.WELCOME,
        NotificationChannel.TELEGRAM
      );

      expect(mockPrisma.notificationTemplate.delete).toHaveBeenCalledWith({
        where: {
          type_channel: {
            type: NotificationType.WELCOME,
            channel: NotificationChannel.TELEGRAM,
          },
        },
      });
    });
  });
});