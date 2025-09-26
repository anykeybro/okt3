// Типы для модуля аутентификации

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    username: string;
    role: {
      id: string;
      name: string;
      permissions: Array<{
        resource: string;
        actions: string[];
      }>;
    };
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface JwtPayload {
  userId: string;
  username: string;
  roleId: string;
  permissions: Array<{
    resource: string;
    actions: string[];
  }>;
  iat?: number;
  exp?: number;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  roleId: string;
}

export interface UpdateUserRequest {
  username?: string;
  password?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissions: Array<{
    resource: string;
    actions: string[];
  }>;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: Array<{
    resource: string;
    actions: string[];
  }>;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// Ресурсы системы для RBAC
export enum Resources {
  USERS = 'users',
  CLIENTS = 'clients',
  ACCOUNTS = 'accounts',
  TARIFFS = 'tariffs',
  SERVICES = 'services',
  DEVICES = 'devices',
  REQUESTS = 'requests',
  PAYMENTS = 'payments',
  NOTIFICATIONS = 'notifications',
  DASHBOARD = 'dashboard',
  SETTINGS = 'settings'
}

// Действия для RBAC
export enum Actions {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage' // Полный доступ
}

// Предустановленные роли
export const DEFAULT_ROLES = {
  SUPERADMIN: {
    name: 'Суперадмин',
    description: 'Полный доступ ко всем функциям системы',
    permissions: Object.values(Resources).map(resource => ({
      resource,
      actions: [Actions.MANAGE]
    }))
  },
  CASHIER: {
    name: 'Кассир',
    description: 'Доступ к операциям с платежами и клиентами',
    permissions: [
      { resource: Resources.CLIENTS, actions: [Actions.READ, Actions.UPDATE] },
      { resource: Resources.ACCOUNTS, actions: [Actions.READ, Actions.UPDATE] },
      { resource: Resources.PAYMENTS, actions: [Actions.CREATE, Actions.READ] },
      { resource: Resources.DASHBOARD, actions: [Actions.READ] }
    ]
  },
  TECHNICIAN: {
    name: 'Монтажник',
    description: 'Доступ к заявкам и техническим операциям',
    permissions: [
      { resource: Resources.REQUESTS, actions: [Actions.READ, Actions.UPDATE] },
      { resource: Resources.CLIENTS, actions: [Actions.CREATE, Actions.READ, Actions.UPDATE] },
      { resource: Resources.ACCOUNTS, actions: [Actions.CREATE, Actions.READ, Actions.UPDATE] },
      { resource: Resources.DEVICES, actions: [Actions.READ] }
    ]
  }
};