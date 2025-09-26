// Unit тесты для middleware аутентификации
import { Request, Response, NextFunction } from 'express';
import { 
  authorize, 
  requireSuperAdmin,
  rateLimit
} from '../auth.middleware';
import { Resources, Actions, JwtPayload } from '../auth.types';

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined
    } as Partial<Request>;
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    
    // Очищаем моки
    jest.clearAllMocks();
  });

  describe('authorize', () => {
    it('должен разрешить доступ пользователю с соответствующими правами', () => {
      // Arrange
      const mockUser: JwtPayload = {
        userId: '507f1f77bcf86cd799439011',
        username: 'testuser',
        roleId: '507f1f77bcf86cd799439012',
        permissions: [
          { resource: Resources.USERS, actions: [Actions.READ, Actions.CREATE] }
        ]
      };

      mockRequest.user = mockUser;
      const middleware = authorize(Resources.USERS, Actions.READ);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    it('должен разрешить доступ пользователю с правами MANAGE', () => {
      // Arrange
      const mockUser: JwtPayload = {
        userId: '507f1f77bcf86cd799439011',
        username: 'testuser',
        roleId: '507f1f77bcf86cd799439012',
        permissions: [
          { resource: Resources.USERS, actions: [Actions.MANAGE] }
        ]
      };

      mockRequest.user = mockUser;
      const middleware = authorize(Resources.USERS, Actions.DELETE);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    it('должен вернуть 401 если пользователь не аутентифицирован', () => {
      // Arrange
      mockRequest.user = undefined;
      const middleware = authorize(Resources.USERS, Actions.READ);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Пользователь не аутентифицирован'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('должен вернуть 403 если у пользователя недостаточно прав', () => {
      // Arrange
      const mockUser: JwtPayload = {
        userId: '507f1f77bcf86cd799439011',
        username: 'testuser',
        roleId: '507f1f77bcf86cd799439012',
        permissions: [
          { resource: Resources.CLIENTS, actions: [Actions.READ] }
        ]
      };

      mockRequest.user = mockUser;
      const middleware = authorize(Resources.USERS, Actions.CREATE);

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Недостаточно прав для выполнения этого действия',
        required: { resource: Resources.USERS, action: Actions.CREATE }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireSuperAdmin', () => {
    it('должен разрешить доступ суперадмину', () => {
      // Arrange
      const mockUser: JwtPayload = {
        userId: '507f1f77bcf86cd799439011',
        username: 'admin',
        roleId: '507f1f77bcf86cd799439012',
        permissions: [
          { resource: Resources.USERS, actions: [Actions.MANAGE] }
        ]
      };

      mockRequest.user = mockUser;

      // Act
      requireSuperAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    it('должен вернуть 403 если пользователь не суперадмин', () => {
      // Arrange
      const mockUser: JwtPayload = {
        userId: '507f1f77bcf86cd799439011',
        username: 'user',
        roleId: '507f1f77bcf86cd799439012',
        permissions: [
          { resource: Resources.CLIENTS, actions: [Actions.READ] }
        ]
      };

      mockRequest.user = mockUser;

      // Act
      requireSuperAdmin(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Требуются права суперадминистратора'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('rateLimit', () => {
    it('должен разрешить первый запрос', () => {
      // Arrange
      const middleware = rateLimit(5, 60000); // 5 запросов за минуту
      (mockRequest as any).ip = '127.0.0.1';

      // Act
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    it('должен обрабатывать множественные запросы', () => {
      // Arrange
      const middleware = rateLimit(3, 60000); // 3 запроса за минуту
      (mockRequest as any).ip = '127.0.0.1';

      // Act - делаем 2 запроса (должны пройти)
      middleware(mockRequest as Request, mockResponse as Response, mockNext);
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(2);
    });
  });
});