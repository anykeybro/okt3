// Сервис аутентификации
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config/config';
import { 
  LoginRequest, 
  LoginResponse, 
  JwtPayload, 
  CreateUserRequest, 
  UpdateUserRequest,
  CreateRoleRequest,
  UpdateRoleRequest,
  DEFAULT_ROLES
} from './auth.types';

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Аутентификация пользователя
   */
  async login(loginData: LoginRequest): Promise<LoginResponse> {
    const { username, password } = loginData;

    // Поиск пользователя с ролью и правами
    const user = await this.prisma.systemUser.findUnique({
      where: { username },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      throw new Error('Неверные учетные данные или пользователь заблокирован');
    }

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Неверные учетные данные');
    }

    // Создание JWT токенов
    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      roleId: user.roleId,
      permissions: user.role.permissions
    };

    // @ts-ignore - временное решение для проблемы с типами JWT
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });

    // @ts-ignore - временное решение для проблемы с типами JWT
    const refreshToken = jwt.sign(
      { userId: user.id }, 
      config.jwt.secret, 
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    return {
      user: {
        id: user.id,
        username: user.username,
        role: {
          id: user.role.id,
          name: user.role.name,
          permissions: user.role.permissions
        }
      },
      tokens: {
        accessToken,
        refreshToken
      }
    };
  }

  /**
   * Обновление токена доступа
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // @ts-ignore - временное решение для проблемы с типами JWT
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as { userId: string };
      
      const user = await this.prisma.systemUser.findUnique({
        where: { id: decoded.userId },
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      });

      if (!user || !user.isActive) {
        throw new Error('Пользователь не найден или заблокирован');
      }

      const payload: JwtPayload = {
        userId: user.id,
        username: user.username,
        roleId: user.roleId,
        permissions: user.role.permissions
      };

      // @ts-ignore - временное решение для проблемы с типами JWT
      const accessToken = jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn
      });

      return { accessToken };
    } catch (error) {
      throw new Error('Недействительный refresh token');
    }
  }

  /**
   * Проверка JWT токена
   */
  verifyToken(token: string): JwtPayload {
    try {
      // @ts-ignore - временное решение для проблемы с типами JWT
      return jwt.verify(token, config.jwt.secret) as JwtPayload;
    } catch (error) {
      throw new Error('Недействительный токен');
    }
  }

  /**
   * Создание пользователя
   */
  async createUser(userData: CreateUserRequest) {
    const { username, password, roleId } = userData;

    // Проверка существования пользователя
    const existingUser = await this.prisma.systemUser.findUnique({
      where: { username }
    });

    if (existingUser) {
      throw new Error('Пользователь с таким именем уже существует');
    }

    // Проверка существования роли
    const role = await this.prisma.role.findUnique({
      where: { id: roleId }
    });

    if (!role) {
      throw new Error('Роль не найдена');
    }

    // Хеширование пароля
    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

    // Создание пользователя
    const user = await this.prisma.systemUser.create({
      data: {
        username,
        passwordHash,
        roleId
      },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    };
  }

  /**
   * Обновление пользователя
   */
  async updateUser(userId: string, updateData: UpdateUserRequest) {
    const { password, ...otherData } = updateData;

    let updatePayload: any = { ...otherData };

    // Если обновляется пароль, хешируем его
    if (password) {
      updatePayload.passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);
    }

    const user = await this.prisma.systemUser.update({
      where: { id: userId },
      data: updatePayload,
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      updatedAt: user.updatedAt
    };
  }

  /**
   * Получение всех пользователей
   */
  async getUsers() {
    const users = await this.prisma.systemUser.findMany({
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return users.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
  }

  /**
   * Получение пользователя по ID
   */
  async getUserById(userId: string) {
    const user = await this.prisma.systemUser.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('Пользователь не найден');
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  /**
   * Удаление пользователя
   */
  async deleteUser(userId: string) {
    await this.prisma.systemUser.delete({
      where: { id: userId }
    });
  }

  /**
   * Создание роли
   */
  async createRole(roleData: CreateRoleRequest) {
    const { name, description, permissions } = roleData;

    // Проверка существования роли
    const existingRole = await this.prisma.role.findUnique({
      where: { name }
    });

    if (existingRole) {
      throw new Error('Роль с таким именем уже существует');
    }

    // Создание роли с правами
    const role = await this.prisma.role.create({
      data: {
        name,
        description,
        permissions: {
          create: permissions
        }
      },
      include: {
        permissions: true
      }
    });

    return role;
  }

  /**
   * Обновление роли
   */
  async updateRole(roleId: string, updateData: UpdateRoleRequest) {
    const { permissions, ...otherData } = updateData;

    // Обновляем основные данные роли
    const role = await this.prisma.role.update({
      where: { id: roleId },
      data: otherData
    });

    // Если переданы новые права, обновляем их
    if (permissions) {
      // Удаляем старые права
      await this.prisma.permission.deleteMany({
        where: { roleId }
      });

      // Создаем новые права
      await this.prisma.permission.createMany({
        data: permissions.map(permission => ({
          ...permission,
          roleId
        }))
      });
    }

    // Возвращаем обновленную роль с правами
    return await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: true
      }
    });
  }

  /**
   * Получение всех ролей
   */
  async getRoles() {
    return await this.prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Получение роли по ID
   */
  async getRoleById(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: true,
        users: {
          select: {
            id: true,
            username: true,
            isActive: true
          }
        }
      }
    });

    if (!role) {
      throw new Error('Роль не найдена');
    }

    return role;
  }

  /**
   * Удаление роли
   */
  async deleteRole(roleId: string) {
    // Проверяем, есть ли пользователи с этой ролью
    const usersCount = await this.prisma.systemUser.count({
      where: { roleId }
    });

    if (usersCount > 0) {
      throw new Error('Нельзя удалить роль, которая назначена пользователям');
    }

    await this.prisma.role.delete({
      where: { id: roleId }
    });
  }

  /**
   * Проверка наличия администраторов в системе
   */
  async hasAdministrators(): Promise<boolean> {
    const count = await this.prisma.systemUser.count();
    return count > 0;
  }

  /**
   * Инициализация системы - создание первого администратора
   */
  async initializeSystem(adminData: { username: string; password: string }) {
    // Проверяем, что в системе нет администраторов
    const hasAdmins = await this.hasAdministrators();
    if (hasAdmins) {
      throw new Error('Система уже инициализирована');
    }

    // Создаем роль суперадмина, если её нет
    let superAdminRole = await this.prisma.role.findUnique({
      where: { name: DEFAULT_ROLES.SUPERADMIN.name }
    });

    if (!superAdminRole) {
      superAdminRole = await this.createRole(DEFAULT_ROLES.SUPERADMIN);
    }

    // Создаем первого администратора
    const admin = await this.createUser({
      username: adminData.username,
      password: adminData.password,
      roleId: superAdminRole.id
    });

    return admin;
  }

  /**
   * Создание стандартных ролей
   */
  async createDefaultRoles() {
    const roles = Object.values(DEFAULT_ROLES);
    
    for (const roleData of roles) {
      const existingRole = await this.prisma.role.findUnique({
        where: { name: roleData.name }
      });

      if (!existingRole) {
        await this.createRole(roleData);
      }
    }
  }
}