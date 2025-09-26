// Типы для модуля системы заявок (CRM)
import { RequestStatus } from '@prisma/client';

// DTO для создания заявки
export interface CreateRequestDto {
  address: string;
  firstName: string;
  lastName: string;
  phone: string;
  desiredServices: string[];
  notes?: string;
}

// DTO для обновления заявки
export interface UpdateRequestDto {
  address?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  desiredServices?: string[];
  status?: RequestStatus;
  assignedToId?: string;
  notes?: string;
}

// Фильтры для поиска заявок
export interface RequestFilters {
  search?: string; // Поиск по ФИО, телефону, адресу
  status?: RequestStatus;
  assignedToId?: string;
  createdFrom?: Date;
  createdTo?: Date;
  hasClient?: boolean; // Есть ли привязанный клиент
}

// Параметры пагинации
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Результат с пагинацией
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Расширенная заявка с деталями
export interface RequestWithDetails {
  id: string;
  clientId?: string | null;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    phones: string[];
    email?: string | null;
    address?: string | null;
  } | null;
  address: string;
  firstName: string;
  lastName: string;
  phone: string;
  desiredServices: string[];
  status: RequestStatus;
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    username: string;
    role: {
      name: string;
    };
  } | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Статистика по заявкам
export interface RequestStats {
  totalRequests: number;
  newRequests: number;
  inProgressRequests: number;
  completedRequests: number;
  cancelledRequests: number;
  todayRequests: number;
  weekRequests: number;
  monthRequests: number;
  averageProcessingTime: number; // в часах
  completionRate: number; // процент выполненных заявок
}

// Данные для создания клиента из заявки
export interface CreateClientFromRequestDto {
  requestId: string;
  middleName?: string;
  email?: string;
  telegramId?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Результат поиска заявок
export interface RequestSearchResult {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  status: RequestStatus;
  createdAt: Date;
  hasClient: boolean;
  assignedTo?: string;
}

// История изменений заявки
export interface RequestHistory {
  id: string;
  requestId: string;
  action: 'created' | 'updated' | 'status_changed' | 'assigned' | 'client_created';
  oldValue?: any;
  newValue?: any;
  performedBy?: string;
  performedAt: Date;
  description: string;
}

// Экспорт заявок
export interface RequestExportData {
  fullName: string;
  phone: string;
  address: string;
  desiredServices: string;
  status: string;
  assignedTo?: string;
  hasClient: boolean;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

// Группировка заявок по статусам
export interface RequestsByStatus {
  [RequestStatus.NEW]: RequestWithDetails[];
  [RequestStatus.IN_PROGRESS]: RequestWithDetails[];
  [RequestStatus.COMPLETED]: RequestWithDetails[];
  [RequestStatus.CANCELLED]: RequestWithDetails[];
}

// Данные для назначения заявки
export interface AssignRequestDto {
  requestId: string;
  assignedToId: string;
  notes?: string;
}

// Данные для изменения статуса заявки
export interface ChangeRequestStatusDto {
  requestId: string;
  status: RequestStatus;
  notes?: string;
}

// Автоматическое создание клиента
export interface AutoCreateClientResult {
  clientId: string;
  accountId?: string;
  message: string;
}