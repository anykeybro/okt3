// Тесты для CacheService
import { CacheService } from '../cache.service';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
  });

  afterEach(() => {
    cacheService.destroy();
  });

  describe('set и get', () => {
    it('должен сохранять и получать данные', async () => {
      const testData = { test: 'value' };
      
      await cacheService.set('test-key', testData, 60);
      const result = await cacheService.get('test-key');
      
      expect(result).toEqual(testData);
    });

    it('должен возвращать null для несуществующего ключа', async () => {
      const result = await cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('должен возвращать null для просроченного ключа', async () => {
      const testData = { test: 'value' };
      
      await cacheService.set('test-key', testData, 0.001); // 1ms TTL
      
      // Ждем истечения TTL
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await cacheService.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('должен удалять ключ из кеша', async () => {
      const testData = { test: 'value' };
      
      await cacheService.set('test-key', testData, 60);
      await cacheService.delete('test-key');
      
      const result = await cacheService.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('clear', () => {
    it('должен очищать весь кеш', async () => {
      await cacheService.set('key1', 'value1', 60);
      await cacheService.set('key2', 'value2', 60);
      
      await cacheService.clear();
      
      const result1 = await cacheService.get('key1');
      const result2 = await cacheService.get('key2');
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('has', () => {
    it('должен возвращать true для существующего ключа', async () => {
      await cacheService.set('test-key', 'value', 60);
      
      const exists = cacheService.has('test-key');
      expect(exists).toBe(true);
    });

    it('должен возвращать false для несуществующего ключа', () => {
      const exists = cacheService.has('non-existent-key');
      expect(exists).toBe(false);
    });

    it('должен возвращать false для просроченного ключа', async () => {
      await cacheService.set('test-key', 'value', 0.001); // 1ms TTL
      
      // Ждем истечения TTL
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const exists = cacheService.has('test-key');
      expect(exists).toBe(false);
    });
  });

  describe('getSize', () => {
    it('должен возвращать размер кеша', async () => {
      expect(cacheService.getSize()).toBe(0);
      
      await cacheService.set('key1', 'value1', 60);
      expect(cacheService.getSize()).toBe(1);
      
      await cacheService.set('key2', 'value2', 60);
      expect(cacheService.getSize()).toBe(2);
      
      await cacheService.delete('key1');
      expect(cacheService.getSize()).toBe(1);
    });
  });

  describe('getKeys', () => {
    it('должен возвращать все ключи', async () => {
      await cacheService.set('key1', 'value1', 60);
      await cacheService.set('key2', 'value2', 60);
      
      const keys = cacheService.getKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });
  });

  describe('getStats', () => {
    it('должен возвращать статистику кеша', async () => {
      await cacheService.set('key1', 'value1', 60);
      await cacheService.set('key2', { complex: 'object' }, 60);
      
      const stats = cacheService.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
      expect(stats.memoryUsage).toMatch(/\d+(\.\d+)?\s+(Bytes|KB|MB|GB)/);
    });
  });

  describe('типизация', () => {
    it('должен корректно работать с типизированными данными', async () => {
      interface TestData {
        id: number;
        name: string;
        active: boolean;
      }

      const testData: TestData = {
        id: 1,
        name: 'Test',
        active: true
      };

      await cacheService.set<TestData>('typed-key', testData, 60);
      const result = await cacheService.get<TestData>('typed-key');
      
      expect(result).toEqual(testData);
      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Test');
      expect(result?.active).toBe(true);
    });
  });
});