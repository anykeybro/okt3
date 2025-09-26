// Типы для модуля тарифов и услуг
import { ServiceType, BillingType } from '@prisma/client';

// DTO для создания услуги
export interface CreateServiceDto {
  name: string;
  description?: string;
  type: ServiceType;
  isActive?: boolean;
}

// DTO для обновления услуги
export interface UpdateServiceDto {
  name?: string;
  description?: string;
  type?: ServiceType;
  isActive?: boolean;
}

// DTO для создания тарифа
export interface CreateTariffDto {
  name: string;
  description?: string;
  price: number;
  billingType: BillingType;
  speedDown: number;
  speedUp: number;
  serviceIds: string[];
  groupId?: string;
  isVisibleInLK?: boolean;
  notificationDays?: number;
  isActive?: boolean;
}

// DTO для обновления тарифа
export interface UpdateTariffDto {
  name?: string;
  description?: string;
  price?: number;
  billingType?: BillingType;
  speedDown?: number;
  speedUp?: number;
  serviceIds?: string[];
  groupId?: string;
  isVisibleInLK?: boolean;
  notificationDays?: number;
  isActive?: boolean;
}

// DTO для создания группы тарифов
export interface CreateTariffGroupDto {
  name: string;
  description?: string;
}

// DTO для обновления группы тарифов
export interface UpdateTariffGroupDto {
  name?: string;
  description?: string;
}

// Фильтры для поиска
export interface ServiceFilters {
  type?: ServiceType;
  isActive?: boolean;
  search?: string;
}

export interface TariffFilters {
  billingType?: BillingType;
  groupId?: string;
  isActive?: boolean;
  isVisibleInLK?: boolean;
  priceMin?: number;
  priceMax?: number;
  search?: string;
}

export interface TariffGroupFilters {
  search?: string;
}

// Параметры пагинации
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Результат с пагинацией
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Расширенный тариф с услугами
export interface TariffWithServices {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  billingType: BillingType;
  speedDown: number;
  speedUp: number;
  serviceIds: string[];
  services: Array<{
    id: string;
    name: string;
    type: ServiceType;
  }>;
  groupId?: string | null;
  group?: {
    id: string;
    name: string;
  } | null;
  isVisibleInLK: boolean;
  notificationDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}