// Тесты для валидации dashboard
import { 
  validateDashboardFilters, 
  validateLimit, 
  validateChartType, 
  validateDateRange,
  validateStatsRequest 
} from '../validation';
import { ValidationError } from '../../../common/errors';

describe('Dashboard Validation', () => {
  describe('validateDashboardFilters', () => {
    it('должен валидировать корректные фильтры', () => {
      const filters = {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        period: 'month'
      };

      const result = validateDashboardFilters(filters);

      expect(result.dateFrom).toEqual(new Date('2024-01-01'));
      expect(result.dateTo).toEqual(new Date('2024-01-31'));
      expect(result.period).toBe('month');
    });

    it('должен принимать объекты Date', () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');
      
      const filters = {
        dateFrom,
        dateTo,
        period: 'custom'
      };

      const result = validateDashboardFilters(filters);

      expect(result.dateFrom).toEqual(dateFrom);
      expect(result.dateTo).toEqual(dateTo);
      expect(result.period).toBe('custom');
    });

    it('должен выбрасывать ошибку для невалидной даты', () => {
      const filters = {
        dateFrom: 'invalid-date'
      };

      expect(() => validateDashboardFilters(filters)).toThrow(ValidationError);
    });

    it('должен выбрасывать ошибку для невалидного периода', () => {
      const filters = {
        period: 'invalid-period'
      };

      expect(() => validateDashboardFilters(filters)).toThrow(ValidationError);
    });

    it('должен выбрасывать ошибку если dateFrom больше dateTo', () => {
      const filters = {
        dateFrom: '2024-01-31',
        dateTo: '2024-01-01'
      };

      expect(() => validateDashboardFilters(filters)).toThrow(ValidationError);
    });

    it('должен выбрасывать ошибку для слишком большого диапазона', () => {
      const filters = {
        dateFrom: '2023-01-01',
        dateTo: '2025-01-01' // Больше года
      };

      expect(() => validateDashboardFilters(filters)).toThrow(ValidationError);
    });

    it('должен возвращать пустой объект для пустых фильтров', () => {
      const result = validateDashboardFilters({});
      expect(result).toEqual({});
    });
  });

  describe('validateLimit', () => {
    it('должен возвращать значение по умолчанию для undefined', () => {
      const result = validateLimit(undefined);
      expect(result).toBe(10);
    });

    it('должен валидировать корректный лимит', () => {
      const result = validateLimit(25);
      expect(result).toBe(25);
    });

    it('должен парсить строковый лимит', () => {
      const result = validateLimit('15');
      expect(result).toBe(15);
    });

    it('должен выбрасывать ошибку для невалидного числа', () => {
      expect(() => validateLimit('abc')).toThrow(ValidationError);
    });

    it('должен выбрасывать ошибку для лимита меньше минимума', () => {
      expect(() => validateLimit(0)).toThrow(ValidationError);
    });

    it('должен выбрасывать ошибку для лимита больше максимума', () => {
      expect(() => validateLimit(100)).toThrow(ValidationError);
    });

    it('должен использовать кастомные границы', () => {
      const result = validateLimit(75, 50, 100);
      expect(result).toBe(75);

      expect(() => validateLimit(25, 50, 100)).toThrow(ValidationError);
      expect(() => validateLimit(150, 50, 100)).toThrow(ValidationError);
    });
  });

  describe('validateChartType', () => {
    it('должен валидировать корректные типы', () => {
      expect(validateChartType('payments')).toBe('payments');
      expect(validateChartType('clients')).toBe('clients');
      expect(validateChartType('requests')).toBe('requests');
    });

    it('должен выбрасывать ошибку для невалидного типа', () => {
      expect(() => validateChartType('invalid')).toThrow(ValidationError);
    });

    it('должен выбрасывать ошибку для пустого типа', () => {
      expect(() => validateChartType('')).toThrow(ValidationError);
      expect(() => validateChartType(null)).toThrow(ValidationError);
      expect(() => validateChartType(undefined)).toThrow(ValidationError);
    });

    it('должен выбрасывать ошибку для не-строки', () => {
      expect(() => validateChartType(123)).toThrow(ValidationError);
      expect(() => validateChartType({})).toThrow(ValidationError);
    });
  });

  describe('validateDateRange', () => {
    it('должен возвращать диапазон по умолчанию для пустых дат', () => {
      const result = validateDateRange();
      
      expect(result.dateTo).toBeInstanceOf(Date);
      expect(result.dateFrom).toBeInstanceOf(Date);
      expect(result.dateFrom.getTime()).toBeLessThan(result.dateTo.getTime());
    });

    it('должен использовать переданные даты', () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-01-31');
      
      const result = validateDateRange(dateFrom, dateTo);
      
      expect(result.dateFrom).toEqual(dateFrom);
      expect(result.dateTo).toEqual(dateTo);
    });

    it('должен выбрасывать ошибку если dateFrom больше dateTo', () => {
      const dateFrom = new Date('2024-01-31');
      const dateTo = new Date('2024-01-01');
      
      expect(() => validateDateRange(dateFrom, dateTo)).toThrow(ValidationError);
    });

    it('должен дополнять недостающие даты', () => {
      const dateFrom = new Date('2024-01-01');
      
      const result1 = validateDateRange(dateFrom, undefined);
      expect(result1.dateFrom).toEqual(dateFrom);
      expect(result1.dateTo).toBeInstanceOf(Date);
      
      const dateTo = new Date('2024-01-31');
      const result2 = validateDateRange(undefined, dateTo);
      expect(result2.dateTo).toEqual(dateTo);
      expect(result2.dateFrom).toBeInstanceOf(Date);
    });
  });

  describe('validateStatsRequest', () => {
    it('должен валидировать полный запрос статистики', () => {
      const query = {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        period: 'month',
        limit: '20'
      };

      const result = validateStatsRequest(query);

      expect(result.filters.dateFrom).toEqual(new Date('2024-01-01'));
      expect(result.filters.dateTo).toEqual(new Date('2024-01-31'));
      expect(result.filters.period).toBe('month');
      expect(result.limit).toBe(20);
    });

    it('должен игнорировать неразрешенные параметры', () => {
      const query = {
        dateFrom: '2024-01-01',
        maliciousParam: 'hack',
        unknownParam: 'test'
      };

      const result = validateStatsRequest(query);

      expect(result.filters.dateFrom).toEqual(new Date('2024-01-01'));
      expect((result.filters as any).maliciousParam).toBeUndefined();
      expect((result.filters as any).unknownParam).toBeUndefined();
    });

    it('должен работать с пустым запросом', () => {
      const result = validateStatsRequest({});

      expect(result.filters).toEqual({});
      expect(result.limit).toBeUndefined();
    });
  });
});