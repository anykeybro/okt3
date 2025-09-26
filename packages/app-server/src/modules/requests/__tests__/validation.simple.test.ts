// Простые unit тесты для валидации заявок
import {
  validatePhoneNumber,
  normalizePhoneNumber,
  validateObjectId
} from '../validation';
import { ValidationError } from '../../../common/errors';

describe('Requests Validation', () => {
  describe('validatePhoneNumber', () => {
    test('должен принимать валидные российские номера', () => {
      expect(validatePhoneNumber('+79001234567')).toBe(true);
      expect(validatePhoneNumber('89001234567')).toBe(true);
      expect(validatePhoneNumber('79001234567')).toBe(true);
      expect(validatePhoneNumber('9001234567')).toBe(true);
    });

    test('должен отклонять невалидные номера', () => {
      expect(validatePhoneNumber('123')).toBe(false);
      expect(validatePhoneNumber('abc')).toBe(false);
      expect(validatePhoneNumber('')).toBe(false);
    });
  });

  describe('normalizePhoneNumber', () => {
    test('должен нормализовать различные форматы номеров', () => {
      expect(normalizePhoneNumber('+79001234567')).toBe('+79001234567');
      expect(normalizePhoneNumber('89001234567')).toBe('+79001234567');
      expect(normalizePhoneNumber('79001234567')).toBe('+79001234567');
      expect(normalizePhoneNumber('9001234567')).toBe('+79001234567');
    });
  });

  describe('validateObjectId', () => {
    test('должен принимать валидные ObjectId', () => {
      expect(() => validateObjectId('507f1f77bcf86cd799439011')).not.toThrow();
      expect(() => validateObjectId('507f191e810c19729de860ea')).not.toThrow();
    });

    test('должен отклонять невалидные ObjectId', () => {
      expect(() => validateObjectId('invalid-id')).toThrow(ValidationError);
      expect(() => validateObjectId('123')).toThrow(ValidationError);
      expect(() => validateObjectId('')).toThrow(ValidationError);
    });
  });
});