// Контроллер аутентификации
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { 
  LoginRequest, 
  RefreshTokenRequest, 
  CreateUserRequest, 
  UpdateUserRequest,
  CreateRoleRequest,
  UpdateRoleRequest
} from './auth.types';
import prisma from '../../common/database';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService(prisma);
  }

  /**
   * Вход в систему
   */
  login = async (req: Request, res: Response) => {
    try {
      const loginData: LoginRequest = req.body;
      const result = await this.authService.login(loginData);
      
      res.json({
        success: true,
        message: 'Успешная авторизация',
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка авторизации'
      });
    }
  };

  /**
   * Обновление токена доступа
   */
  refreshToken = async (req: Request, res: Response) => {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;
      const result = await this.authService.refreshToken(refreshToken);
      
      res.json({
        success: true,
        message: 'Токен успешно обновлен',
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка обновления токена'
      });
    }
  };

  /**
   * Получение информации о текущем пользователе
   */
  getProfile = async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Пользователь не аутентифицирован'
        });
      }

      const user = await this.authService.getUserById(req.user.userId);
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Пользователь не найден'
      });
    }
  };

  /**
   * Выход из системы
   */
  logout = async (req: Request, res: Response) => {
    // В текущей реализации JWT токены stateless, 
    // поэтому просто возвращаем успешный ответ
    // В будущем можно добавить blacklist токенов
    res.json({
      success: true,
      message: 'Успешный выход из системы'
    });
  };

  /**
   * Проверка инициализации системы
   */
  checkInitialization = async (req: Request, res: Response) => {
    try {
      const hasAdministrators = await this.authService.hasAdministrators();
      
      res.json({
        success: true,
        data: {
          isInitialized: hasAdministrators
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Ошибка проверки инициализации системы'
      });
    }
  };

  /**
   * Инициализация системы - создание первого администратора
   */
  initializeSystem = async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Необходимо указать имя пользователя и пароль'
        });
      }

      // Создаем стандартные роли
      await this.authService.createDefaultRoles();
      
      // Создаем первого администратора
      const admin = await this.authService.initializeSystem({ username, password });
      
      res.json({
        success: true,
        message: 'Система успешно инициализирована',
        data: admin
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка инициализации системы'
      });
    }
  };

  // === Управление пользователями ===

  /**
   * Получение списка пользователей
   */
  getUsers = async (req: Request, res: Response) => {
    try {
      const users = await this.authService.getUsers();
      
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Ошибка получения списка пользователей'
      });
    }
  };

  /**
   * Получение пользователя по ID
   */
  getUserById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await this.authService.getUserById(id);
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Пользователь не найден'
      });
    }
  };

  /**
   * Создание нового пользователя
   */
  createUser = async (req: Request, res: Response) => {
    try {
      const userData: CreateUserRequest = req.body;
      const user = await this.authService.createUser(userData);
      
      res.status(201).json({
        success: true,
        message: 'Пользователь успешно создан',
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка создания пользователя'
      });
    }
  };

  /**
   * Обновление пользователя
   */
  updateUser = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData: UpdateUserRequest = req.body;
      
      const user = await this.authService.updateUser(id, updateData);
      
      res.json({
        success: true,
        message: 'Пользователь успешно обновлен',
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка обновления пользователя'
      });
    }
  };

  /**
   * Удаление пользователя
   */
  deleteUser = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Проверяем, что пользователь не удаляет сам себя
      if (req.user?.userId === id) {
        return res.status(400).json({
          success: false,
          error: 'Нельзя удалить свою собственную учетную запись'
        });
      }
      
      await this.authService.deleteUser(id);
      
      res.json({
        success: true,
        message: 'Пользователь успешно удален'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка удаления пользователя'
      });
    }
  };

  // === Управление ролями ===

  /**
   * Получение списка ролей
   */
  getRoles = async (req: Request, res: Response) => {
    try {
      const roles = await this.authService.getRoles();
      
      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Ошибка получения списка ролей'
      });
    }
  };

  /**
   * Получение роли по ID
   */
  getRoleById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const role = await this.authService.getRoleById(id);
      
      res.json({
        success: true,
        data: role
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : 'Роль не найдена'
      });
    }
  };

  /**
   * Создание новой роли
   */
  createRole = async (req: Request, res: Response) => {
    try {
      const roleData: CreateRoleRequest = req.body;
      const role = await this.authService.createRole(roleData);
      
      res.status(201).json({
        success: true,
        message: 'Роль успешно создана',
        data: role
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка создания роли'
      });
    }
  };

  /**
   * Обновление роли
   */
  updateRole = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData: UpdateRoleRequest = req.body;
      
      const role = await this.authService.updateRole(id, updateData);
      
      res.json({
        success: true,
        message: 'Роль успешно обновлена',
        data: role
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка обновления роли'
      });
    }
  };

  /**
   * Удаление роли
   */
  deleteRole = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.authService.deleteRole(id);
      
      res.json({
        success: true,
        message: 'Роль успешно удалена'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка удаления роли'
      });
    }
  };
}