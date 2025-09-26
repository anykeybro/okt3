// Unit тесты для AuthService
import { AuthService } from '../auth.service';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../../config/config';
import { DEFAULT_ROLES } from '../auth.types';

// Мокаем Prisma Client
jest.mock('@prisma/client');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const mockPrisma = {
  systemUser: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  permission: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
} as unknown as PrismaClient;

describe('AuthService', () => {
  let authService: AuthService;
  const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
  const mockJwt = jwt as jest.Mocked<typeof jwt>;

  beforeEach(() => {
    authService = new AuthService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('login', () => {
    const mockUser = {
      id: '507f1f77bcf86cd799439011',
      username: 'testuser',
      passwordHash: 'hashedpassword',
      isActive: true,
      roleId: '507f1f77bcf86cd799439012',
      role: {
        id: '507f1f77bcf86cd799439012',
        name: 'Суперадмин',
        permissions: [
          { resource: 'users', actions: ['manage'] }
        ]
      }
    };

    it('должен успешно авторизовать пользователя с правильными учетными данными', async () => {
      // Arrange
      const loginData = { username: 'testuser', password: 'password123' };
      mockPrisma.systemUser.findUnique = jest.fn().mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockJwt.sign as jest.Mock).mockReturnValueOnce('access_token').mockReturnValueOnce('refresh_token');

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(mockPrisma.systemUser.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(result).toEqual({
        user: {
          id: mockUser.id,
          username: mockUser.username,
          role: mockUser.role
        },
        tokens: {
          accessToken: 'access_token',
          refreshToken: 'refresh_token'
        }
      });
    });

    it('должен выбросить ошибку при неверном пароле', async () => {
      // Arrange
      const loginData = { username: 'testuser', password: 'wrongpassword' };
      mockPrisma.systemUser.findUnique = jest.fn().mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow('Неверные учетные данные');
    });

    it('должен выбросить ошибку если пользователь не найден', async () => {
      // Arrange
      const loginData = { username: 'nonexistent', password: 'password123' };
      mockPrisma.systemUser.findUnique = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow('Неверные учетные данные или пользователь заблокирован');
    });

    it('должен выбросить ошибку если пользователь заблокирован', async () => {
      // Arrange
      const loginData = { username: 'testuser', password: 'password123' };
      const blockedUser = { ...mockUser, isActive: false };
      mockPrisma.systemUser.findUnique = jest.fn().mockResolvedValue(blockedUser);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow('Неверные учетные данные или пользователь заблокирован');
    });
  });

  describe('refreshToken', () => {
    it('должен успешно обновить токен доступа', async () => {
      // Arrange
      const refreshToken = 'valid_refresh_token';
      const mockUser = {
        id: '507f1f77bcf86cd799439011',
        username: 'testuser',
        isActive: true,
        roleId: '507f1f77bcf86cd799439012',
        role: {
          id: '507f1f77bcf86cd799439012',
          name: 'Суперадмин',
          permissions: [{ resource: 'users', actions: ['manage'] }]
        }
      };

      (mockJwt.verify as jest.Mock).mockReturnValue({ userId: mockUser.id });
      mockPrisma.systemUser.findUnique = jest.fn().mockResolvedValue(mockUser);
      (mockJwt.sign as jest.Mock).mockReturnValue('new_access_token');

      // Act
      const result = await authService.refreshToken(refreshToken);

      // Assert
      expect(mockJwt.verify).toHaveBeenCalledWith(refreshToken, config.jwt.secret);
      expect(result).toEqual({ accessToken: 'new_access_token' });
    });

    it('должен выбросить ошибку при недействительном refresh token', async () => {
      // Arrange
      const refreshToken = 'invalid_refresh_token';
      (mockJwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('Недействительный refresh token');
    });
  });

  describe('createUser', () => {
    it('должен успешно создать нового пользователя', async () => {
      // Arrange
      const userData = {
        username: 'newuser',
        password: 'password123',
        roleId: '507f1f77bcf86cd799439012'
      };

      const mockRole = {
        id: '507f1f77bcf86cd799439012',
        name: 'Кассир'
      };

      const mockCreatedUser = {
        id: '507f1f77bcf86cd799439013',
        username: 'newuser',
        passwordHash: 'hashedpassword',
        roleId: '507f1f77bcf86cd799439012',
        isActive: true,
        createdAt: new Date(),
        role: {
          ...mockRole,
          permissions: []
        }
      };

      mockPrisma.systemUser.findUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.role.findUnique = jest.fn().mockResolvedValue(mockRole);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      mockPrisma.systemUser.create = jest.fn().mockResolvedValue(mockCreatedUser);

      // Act
      const result = await authService.createUser(userData);

      // Assert
      expect(mockPrisma.systemUser.findUnique).toHaveBeenCalledWith({
        where: { username: 'newuser' }
      });
      expect(mockPrisma.role.findUnique).toHaveBeenCalledWith({
        where: { id: userData.roleId }
      });
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', config.security.bcryptRounds);
      expect(result.username).toBe('newuser');
    });

    it('должен выбросить ошибку если пользователь уже существует', async () => {
      // Arrange
      const userData = {
        username: 'existinguser',
        password: 'password123',
        roleId: '507f1f77bcf86cd799439012'
      };

      mockPrisma.systemUser.findUnique = jest.fn().mockResolvedValue({ id: 'existing' });

      // Act & Assert
      await expect(authService.createUser(userData)).rejects.toThrow('Пользователь с таким именем уже существует');
    });

    it('должен выбросить ошибку если роль не найдена', async () => {
      // Arrange
      const userData = {
        username: 'newuser',
        password: 'password123',
        roleId: 'nonexistent'
      };

      mockPrisma.systemUser.findUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.role.findUnique = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(authService.createUser(userData)).rejects.toThrow('Роль не найдена');
    });
  });

  describe('hasAdministrators', () => {
    it('должен вернуть true если есть администраторы', async () => {
      // Arrange
      mockPrisma.systemUser.count = jest.fn().mockResolvedValue(1);

      // Act
      const result = await authService.hasAdministrators();

      // Assert
      expect(result).toBe(true);
      expect(mockPrisma.systemUser.count).toHaveBeenCalled();
    });

    it('должен вернуть false если нет администраторов', async () => {
      // Arrange
      mockPrisma.systemUser.count = jest.fn().mockResolvedValue(0);

      // Act
      const result = await authService.hasAdministrators();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('initializeSystem', () => {
    it('должен успешно инициализировать систему', async () => {
      // Arrange
      const adminData = { username: 'admin', password: 'password123' };
      
      mockPrisma.systemUser.count = jest.fn().mockResolvedValue(0);
      mockPrisma.role.findUnique = jest.fn().mockResolvedValue(null);
      
      const mockRole = {
        id: '507f1f77bcf86cd799439012',
        name: DEFAULT_ROLES.SUPERADMIN.name,
        description: DEFAULT_ROLES.SUPERADMIN.description,
        permissions: DEFAULT_ROLES.SUPERADMIN.permissions.map(p => ({
          id: '507f1f77bcf86cd799439014',
          roleId: '507f1f77bcf86cd799439012',
          resource: p.resource,
          actions: p.actions
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockPrisma.role.create = jest.fn().mockResolvedValue(mockRole);
      
      const mockUser = {
        id: '507f1f77bcf86cd799439013',
        username: 'admin',
        role: mockRole,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Мокаем методы createRole и createUser
      jest.spyOn(authService, 'createRole').mockResolvedValue(mockRole as any);
      jest.spyOn(authService, 'createUser').mockResolvedValue(mockUser as any);

      // Act
      const result = await authService.initializeSystem(adminData);

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('должен выбросить ошибку если система уже инициализирована', async () => {
      // Arrange
      const adminData = { username: 'admin', password: 'password123' };
      mockPrisma.systemUser.count = jest.fn().mockResolvedValue(1);

      // Act & Assert
      await expect(authService.initializeSystem(adminData)).rejects.toThrow('Система уже инициализирована');
    });
  });

  describe('verifyToken', () => {
    it('должен успешно верифицировать валидный токен', () => {
      // Arrange
      const token = 'valid_token';
      const payload = { userId: '123', username: 'test' };
      (mockJwt.verify as jest.Mock).mockReturnValue(payload);

      // Act
      const result = authService.verifyToken(token);

      // Assert
      expect(mockJwt.verify).toHaveBeenCalledWith(token, config.jwt.secret);
      expect(result).toEqual(payload);
    });

    it('должен выбросить ошибку при недействительном токене', () => {
      // Arrange
      const token = 'invalid_token';
      (mockJwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      expect(() => authService.verifyToken(token)).toThrow('Недействительный токен');
    });
  });
});