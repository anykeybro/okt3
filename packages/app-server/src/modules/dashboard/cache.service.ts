// Сервис кеширования для dashboard
import { config } from '../../config/config';

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

export class CacheService {
  private cache = new Map<string, CacheItem<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Запускаем очистку кеша с интервалом из конфигурации
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, config.dashboard.cacheCleanupInterval);
  }

  // Получение данных из кеша
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Проверяем срок действия
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  // Сохранение данных в кеш
  async set<T>(key: string, data: T, ttlSeconds: number = config.dashboard.cacheDefaultTtl): Promise<void> {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    
    this.cache.set(key, {
      data,
      expiresAt
    });
  }

  // Удаление из кеша
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  // Очистка всего кеша
  async clear(): Promise<void> {
    this.cache.clear();
  }

  // Получение размера кеша
  getSize(): number {
    return this.cache.size;
  }

  // Получение всех ключей
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Проверка существования ключа
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // Проверяем срок действия
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Получение статистики кеша
  getStats(): {
    size: number;
    keys: string[];
    memoryUsage: string;
  } {
    const size = this.cache.size;
    const keys = Array.from(this.cache.keys());
    
    // Примерная оценка использования памяти
    const memoryUsageBytes = JSON.stringify(Array.from(this.cache.entries())).length;
    const memoryUsage = this.formatBytes(memoryUsageBytes);

    return {
      size,
      keys,
      memoryUsage
    };
  }

  // Очистка просроченных элементов
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });

    if (keysToDelete.length > 0) {
      console.log(`🧹 Очищено ${keysToDelete.length} просроченных элементов кеша`);
    }
  }

  // Форматирование размера в байтах
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Остановка сервиса
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}