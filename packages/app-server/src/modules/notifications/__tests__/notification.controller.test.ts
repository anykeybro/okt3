// Тесты для NotificationController
import { Request, Response } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { NotificationType, NotificationChannel } from '../types';

// Мокаем сервисы
const mockNotificationService = {
  sendNotification: jest.fn(),
  sendBulkNotifications: jest.fn(),
  getNotificationHistory: jest.fn(),
  getNotificationStats: jest.fn(),
  checkServicesStatus: jest.fn(),
};

const mockTemplateService = {
  getAllTemplates: jest.fn(),
  upsertTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
  validateTemplate: jest.fn(),
};

describe('NotificationController', () => {
  let controller: NotificationController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    controller = new NotificationController(
      mockNotificationService as any,
      mockTemplateService as any
    );

    mockRequest = {
      body: {},
      query: {},
      params: {},
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('должен отправлять уведомление успешно', async () => {
      mockRequest.body = {
        clientId: 'client1',
        type: NotificationType.WELCOME,
        variables: { firstName: 'Иван' },
      };

      mockNotificationService.sendNotification.mockResolvedValue({
        success: true,
        channel: NotificationChannel.TELEGRAM,
        messageId: '123',
      });

      await controller.sendNotification(mockRequest as Request, mockResponse as Response);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
        clientId: 'client1',
        type: NotificationType.WELCOME,
        variables: { firstName: 'Иван' },
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        channel: NotificationChannel.TELEGRAM,
        messageId: '123',
        error: undefined,
      });
    });

    it('должен возвращать ошибку при отсутствии обязательных полей', async () => {
      mockRequest.body = { clientId: 'client1' }; // Нет type

      await controller.sendNotification(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Обязательные поля: clientId, type',
      });
    });

    it('должен валидировать тип уведомления', async () => {
      mockRequest.body = {
        clientId: 'client1',
        type: 'INVALID_TYPE',
      };

      await controller.sendNotification(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Недопустимый тип уведомления',
        allowedTypes: Object.values(NotificationType),
      });
    });

    it('должен обрабатывать ошибки сервиса', async () => {
      mockRequest.body = {
        clientId: 'client1',
        type: NotificationType.WELCOME,
      };

      mockNotificationService.sendNotification.mockRejectedValue(new Error('Service error'));

      await controller.sendNotification(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Внутренняя ошибка сервера',
        details: 'Service error',
      });
    });
  });

  describe('sendBulkNotifications', () => {
    it('должен отправлять массовые уведомления', async () => {
      const notifications = [
        { clientId: 'client1', type: NotificationType.WELCOME },
        { clientId: 'client2', type: NotificationType.PAYMENT },
      ];

      mockRequest.body = { notifications };

      mockNotificationService.sendBulkNotifications.mockResolvedValue([
        { success: true, channel: NotificationChannel.TELEGRAM },
        { success: false, channel: NotificationChannel.SMS, error: 'Failed' },
      ]);

      await controller.sendBulkNotifications(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        total: 2,
        success: 1,
        failed: 1,
        results: expect.any(Array),
      });
    });

    it('должен валидировать массив уведомлений', async () => {
      mockRequest.body = { notifications: [] };

      await controller.sendBulkNotifications(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Поле notifications должно быть непустым массивом',
      });
    });

    it('должен валидировать каждое уведомление в массиве', async () => {
      mockRequest.body = {
        notifications: [
          { clientId: 'client1' }, // Нет type
        ],
      };

      await controller.sendBulkNotifications(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Каждое уведомление должно содержать clientId и type',
      });
    });
  });

  describe('getNotificationHistory', () => {
    it('должен получать историю уведомлений', async () => {
      mockRequest.query = {
        clientId: 'client1',
        limit: '50',
        offset: '10',
      };

      const mockHistory = [
        { id: '1', type: NotificationType.WELCOME },
      ];

      mockNotificationService.getNotificationHistory.mockResolvedValue(mockHistory);

      await controller.getNotificationHistory(mockRequest as Request, mockResponse as Response);

      expect(mockNotificationService.getNotificationHistory).toHaveBeenCalledWith(
        'client1',
        undefined,
        undefined,
        50,
        10
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        notifications: mockHistory,
        pagination: {
          limit: 50,
          offset: 10,
          total: 1,
        },
      });
    });

    it('должен ограничивать максимальный лимит', async () => {
      mockRequest.query = { limit: '2000' };

      mockNotificationService.getNotificationHistory.mockResolvedValue([]);

      await controller.getNotificationHistory(mockRequest as Request, mockResponse as Response);

      expect(mockNotificationService.getNotificationHistory).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        1000, // Максимальный лимит
        0
      );
    });
  });

  describe('getNotificationStats', () => {
    it('должен получать статистику уведомлений', async () => {
      mockRequest.query = {
        dateFrom: '2023-01-01',
        dateTo: '2023-12-31',
      };

      const mockStats = {
        total: 100,
        byStatus: { SENT: 80, FAILED: 20 },
      };

      mockNotificationService.getNotificationStats.mockResolvedValue(mockStats);

      await controller.getNotificationStats(mockRequest as Request, mockResponse as Response);

      expect(mockNotificationService.getNotificationStats).toHaveBeenCalledWith(
        new Date('2023-01-01'),
        new Date('2023-12-31')
      );

      expect(mockResponse.json).toHaveBeenCalledWith(mockStats);
    });
  });

  describe('upsertTemplate', () => {
    it('должен создавать/обновлять шаблон', async () => {
      mockRequest.body = {
        type: NotificationType.WELCOME,
        channel: NotificationChannel.TELEGRAM,
        template: 'Привет, {{firstName}}!',
        isActive: true,
      };

      mockTemplateService.validateTemplate.mockReturnValue({
        isValid: true,
        errors: [],
      });

      await controller.upsertTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockTemplateService.validateTemplate).toHaveBeenCalledWith('Привет, {{firstName}}!');
      expect(mockTemplateService.upsertTemplate).toHaveBeenCalledWith(
        NotificationType.WELCOME,
        NotificationChannel.TELEGRAM,
        'Привет, {{firstName}}!',
        true
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Шаблон успешно сохранен',
      });
    });

    it('должен валидировать обязательные поля', async () => {
      mockRequest.body = { type: NotificationType.WELCOME }; // Нет channel и template

      await controller.upsertTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Обязательные поля: type, channel, template',
      });
    });

    it('должен валидировать шаблон', async () => {
      mockRequest.body = {
        type: NotificationType.WELCOME,
        channel: NotificationChannel.TELEGRAM,
        template: 'Неверный {{шаблон',
      };

      mockTemplateService.validateTemplate.mockReturnValue({
        isValid: false,
        errors: ['Несоответствие скобок'],
      });

      await controller.upsertTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Ошибки в шаблоне',
        details: ['Несоответствие скобок'],
      });
    });
  });

  describe('deleteTemplate', () => {
    it('должен удалять шаблон', async () => {
      mockRequest.params = {
        type: NotificationType.WELCOME,
        channel: NotificationChannel.TELEGRAM,
      };

      await controller.deleteTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockTemplateService.deleteTemplate).toHaveBeenCalledWith(
        NotificationType.WELCOME,
        NotificationChannel.TELEGRAM
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Шаблон успешно удален',
      });
    });

    it('должен валидировать параметры', async () => {
      mockRequest.params = {
        type: 'INVALID_TYPE',
        channel: NotificationChannel.TELEGRAM,
      };

      await controller.deleteTemplate(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Недопустимый тип уведомления',
        allowedTypes: Object.values(NotificationType),
      });
    });
  });

  describe('getServicesStatus', () => {
    it('должен получать статус сервисов', async () => {
      const mockStatus = {
        telegram: true,
        sms: false,
      };

      mockNotificationService.checkServicesStatus.mockResolvedValue(mockStatus);

      await controller.getServicesStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        services: mockStatus,
        overall: 'healthy',
        timestamp: expect.any(String),
      });
    });

    it('должен показывать unhealthy если все сервисы недоступны', async () => {
      const mockStatus = {
        telegram: false,
        sms: false,
      };

      mockNotificationService.checkServicesStatus.mockResolvedValue(mockStatus);

      await controller.getServicesStatus(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        services: mockStatus,
        overall: 'unhealthy',
        timestamp: expect.any(String),
      });
    });
  });
});