// Unit тесты для AuthController
import { Request, Response } from 'express';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../auth.types';

// Мокаем AuthService и database
jest.mock('../auth.service');
jest.mock('../../../common/database');

describe('AuthController', () => {
  let authController: AuthController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      user: undefined
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Мокаем AuthService
    mockAuthService = {
      login: jest.fn(),
      refreshToken: jest.fn(),
      getUserById: jest.fn(),
      hasAdministrators: jest.fn(),
      initializeSystem: jest.fn(),
      createDefaultRoles: jest.fn(),
      getUsers: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      getRoles: jest.fn(),
      getRoleById: jest.fn(),
      createRole: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
    } as any;

    // Мокаем конструктор AuthService
    (AuthService as jest.MockedClass<typeof AuthService>).mockImplementation(() => mockAuthService);

    authController = new AuthController();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('должен успешно авторизовать пользователя', async () => {
      // Arrange
      const loginData = { username: 'testuser', password: 'password123' };
      const loginResult = {
        user: {
          id: '507f1f77bcf86cd799439011',
          username: 'testuser',
          role: { id: 'role1', name: 'Admin', permissions: [] }
        },
        tokens: {
          accessToken: 'access_token',
          refreshToken: 'refresh_token'
        }
      };

      mockRequest.body = loginData;
      mockAuthService.login.mockResolvedValue(loginResult);

      // Act
      await authController.login(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockAuthService.login).toHaveBeenCalledWith(loginData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Успешная авторизация',
        data: loginResult
      });
    });

    it('должен вернуть 401 при ошибке авторизации', async () => {
      // Arrange
      const loginData = { username: 'testuser', password: 'wrongpassword' };
      mockRequest.body = loginData;
      mockAuthService.login.mockRejectedValue(new Error('Неверные учетные данные'));

      // Act
      await authController.login(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Неверные учетные данные'
      });
    });
  });

  describe('refreshToken', () => {
    it('должен успешно обновить токен', async () => {
      // Arrange
      const refreshTokenData = { refreshToken: 'valid_refresh_token' };
      const result = { accessToken: 'new_access_token' };

      mockRequest.body = refreshTokenData;
      mockAuthService.refreshToken.mockResolvedValue(result);

      // Act
      await authController.refreshToken(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid_refresh_token');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Токен успешно обновлен',
        data: result
      });
    });

    it('должен вернуть 401 при недействительном refresh token', async () => {
      // Arrange
      const refreshTokenData = { refreshToken: 'invalid_refresh_token' };
      mockRequest.body = refreshTokenData;
      mockAuthService.refreshToken.mockRejectedValue(new Error('Недействительный refresh token'));

      // Act
      await authController.refreshToken(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Недействительный refresh token'
      });
    });
  });

  describe('getProfile', () => {
    it('должен вернуть профиль текущего пользователя', async () => {
      // Arrange
      const mockUser: JwtPayload = {
        userId: '507f1f77bcf86cd799439011',
        username: 'testuser',
        roleId: 'role1',
        permissions: []
      };

      const userProfile = {
        id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        role: { 
          id: 'role1', 
          name: 'Admin', 
          permissions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRequest.user = mockUser;
      mockAuthService.getUserById.mockResolvedValue(userProfile);

      // Act
      await authController.getProfile(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockAuthService.getUserById).toHaveBeenCalledWith(mockUser.userId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: userProfile
      });
    });

    it('должен вернуть 401 если пользователь не аутентифицирован', async () => {
      // Arrange
      mockRequest.user = undefined;

      // Act
      await authController.getProfile(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Пользователь не аутентифицирован'
      });
    });
  });

  describe('checkInitialization', () => {
    it('должен вернуть статус инициализации системы', async () => {
      // Arrange
      mockAuthService.hasAdministrators.mockResolvedValue(true);

      // Act
      await authController.checkInitialization(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockAuthService.hasAdministrators).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { isInitialized: true }
      });
    });

    it('должен вернуть 500 при ошибке проверки', async () => {
      // Arrange
      mockAuthService.hasAdministrators.mockRejectedValue(new Error('Database error'));

      // Act
      await authController.checkInitialization(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Ошибка проверки инициализации системы'
      });
    });
  });

  describe('initializeSystem', () => {
    it('должен успешно инициализировать систему', async () => {
      // Arrange
      const initData = { username: 'admin', password: 'password123' };
      const adminUser = {
        id: '507f1f77bcf86cd799439011',
        username: 'admin',
        role: { 
          id: 'role1', 
          name: 'Суперадмин', 
          permissions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null
        },
        isActive: true,
        createdAt: new Date()
      };

      mockRequest.body = initData;
      mockAuthService.createDefaultRoles.mockResolvedValue(undefined);
      mockAuthService.initializeSystem.mockResolvedValue(adminUser);

      // Act
      await authController.initializeSystem(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockAuthService.createDefaultRoles).toHaveBeenCalled();
      expect(mockAuthService.initializeSystem).toHaveBeenCalledWith(initData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Система успешно инициализирована',
        data: adminUser
      });
    });

    it('должен вернуть 400 если не указаны обязательные поля', async () => {
      // Arrange
      mockRequest.body = { username: 'admin' }; // Отсутствует пароль

      // Act
      await authController.initializeSystem(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Необходимо указать имя пользователя и пароль'
      });
    });
  });

  describe('createUser', () => {
    it('должен успешно создать пользователя', async () => {
      // Arrange
      const userData = {
        username: 'newuser',
        password: 'password123',
        roleId: '507f1f77bcf86cd799439012'
      };

      const createdUser = {
        id: '507f1f77bcf86cd799439013',
        username: 'newuser',
        role: { 
          id: '507f1f77bcf86cd799439012', 
          name: 'Кассир', 
          permissions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          description: null
        },
        isActive: true,
        createdAt: new Date()
      };

      mockRequest.body = userData;
      mockAuthService.createUser.mockResolvedValue(createdUser);

      // Act
      await authController.createUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockAuthService.createUser).toHaveBeenCalledWith(userData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Пользователь успешно создан',
        data: createdUser
      });
    });

    it('должен вернуть 400 при ошибке создания', async () => {
      // Arrange
      const userData = {
        username: 'existinguser',
        password: 'password123',
        roleId: '507f1f77bcf86cd799439012'
      };

      mockRequest.body = userData;
      mockAuthService.createUser.mockRejectedValue(new Error('Пользователь уже существует'));

      // Act
      await authController.createUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Пользователь уже существует'
      });
    });
  });

  describe('deleteUser', () => {
    it('должен успешно удалить пользователя', async () => {
      // Arrange
      const userId = '507f1f77bcf86cd799439013';
      mockRequest.params = { id: userId };
      mockRequest.user = { userId: 'different_user_id' } as JwtPayload;
      mockAuthService.deleteUser.mockResolvedValue(undefined);

      // Act
      await authController.deleteUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockAuthService.deleteUser).toHaveBeenCalledWith(userId);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Пользователь успешно удален'
      });
    });

    it('должен запретить удаление собственной учетной записи', async () => {
      // Arrange
      const userId = '507f1f77bcf86cd799439013';
      mockRequest.params = { id: userId };
      mockRequest.user = { userId } as JwtPayload; // Тот же ID

      // Act
      await authController.deleteUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Нельзя удалить свою собственную учетную запись'
      });
      expect(mockAuthService.deleteUser).not.toHaveBeenCalled();
    });
  });
});