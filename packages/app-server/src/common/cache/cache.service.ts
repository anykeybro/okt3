import Redis from 'ioredis';
import { config } from '../../config/config';

export class CacheService {
  private redis: Redis;
  private isConnected = false;

  constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on('connect', () => {
      this.isConnected = true;
      console.log('Redis подключен');
    });

    this.redis.on('error', (error) => {
      this.isConnected = false;
      console.error('Ошибка Redis:', error);
    });
  }

  /**
   * Получить значение из кеша
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) {
        return null;
      }

      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Ошибка получения из кеша:', error);
      return null;
    }
  }

  /**
   * Установить значение в кеш
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const serialized = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка записи в кеш:', error);
      return false;
    }
  }

  /**
   * Удалить значение из кеша
   */
  async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Ошибка удаления из кеша:', error);
      return false;
    }
  }

  /**
   * Удалить все ключи по паттерну
   */
  async delPattern(pattern: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Ошибка удаления по паттерну:', error);
      return false;
    }
  }

  /**
   * Проверить существование ключа
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Ошибка проверки существования:', error);
      return false;
    }
  }

  /**
   * Получить или установить значение (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    try {
      // Попытаться получить из кеша
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Если нет в кеше, получить из источника
      const value = await fetcher();
      
      // Сохранить в кеш
      await this.set(key, value, ttlSeconds);
      
      return value;
    } catch (error) {
      console.error('Ошибка getOrSet:', error);
      // В случае ошибки кеша, все равно получить данные
      return await fetcher();
    }
  }

  /**
   * Инкремент значения
   */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      if (!this.isConnected) {
        return 0;
      }

      const value = await this.redis.incr(key);
      
      if (ttlSeconds && value === 1) {
        await this.redis.expire(key, ttlSeconds);
      }
      
      return value;
    } catch (error) {
      console.error('Ошибка инкремента:', error);
      return 0;
    }
  }

  /**
   * Закрыть соединение
   */
  async disconnect(): Promise<void> {
    await this.redis.disconnect();
    this.isConnected = false;
  }
}

// Синглтон экземпляр
export const cacheService = new CacheService();