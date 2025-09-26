// Unit тесты для валидации модуля абонентов
import {
  validateClient,
  validateAccount,
  validatePhoneNumber,
  normalizePhoneNumber,
  validateEmail,
  validateMacAddress,
  normalizeMacAddress,
  validateObjectId,
  validatePagination,
  validateClientFilters
} from '../validation';
import { ValidationError } from '../../../common/errors';
import { AccountStatus } from '@prisma/client';

describe('Validation', () => {
  describe('validatePhoneNumber', () => {
    it('должен валидировать корректные российские номера', () => {
      expect(validatePhoneNumber('+79001234567')).toBe(true);
      expect(validatePhoneNumber('89001234567')).toBe(true);
      expect(validatePhoneNumber('79001234567')).toBe(true);
      expect(validatePhoneNumber('9001234567')).toBe(true);
      expect(validatePhoneNumber('+7 900 123 45 67')).toBe(true);
      expect(validatePhoneNumber('8 (900) 123-45-67')).toBe(true);
    });

    it('должен отклонять некорректные номера', () => {
      expect(validatePhoneNumber('123')).toBe(false);
      expect(validatePhoneNumber('+1234567890')).toBe(false);
      expect(validatePhoneNumber('abcdefghij')).toBe(false);
      expect(validatePhoneNumber('')).toBe(false);
    });
  });

  describe('normalizePhoneNumber', () => {
    it('должен нормализовать различные форматы номеров', () => {
      expect(normalizePhoneNumber('+79001234567')).toBe('+79001234567');
      expect(normalizePhoneNumber('89001234567')).toBe('+79001234567');
      expect(normalizePhoneNumber('79001234567')).toBe('+79001234567');
      expect(normalizePhoneNumber('9001234567')).toBe('+79001234567');
      expect(normalizePhoneNumber('+7 900 123 45 67')).toBe('+79001234567');
      expect(normalizePhoneNumber('8 (900) 123-45-67')).toBe('+79001234567');
    });
  });

  describe('validateEmail', () => {
    it('должен валидировать корректные email адреса', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('test+tag@example.org')).toBe(true);
    });

    it('должен отклонять некорректные email адреса', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validateMacAddress', () => {
    it('должен валидировать корректные MAC-адреса', () => {
      expect(validateMacAddress('00:11:22:33:44:55')).toBe(true);
      expect(validateMacAddress('AA:BB:CC:DD:EE:FF')).toBe(true);
      expect(validateMacAddress('00-11-22-33-44-55')).toBe(true);
    });

    it('должен отклонять некорректные MAC-адреса', () => {
      expect(validateMacAddress('00:11:22:33:44')).toBe(false);
      expect(validateMacAddress('00:11:22:33:44:GG')).toBe(false);
      expect(validateMacAddress('invalid-mac')).toBe(false);
      expect(validateMacAddress('')).toBe(false);
    });
  });

  describe('normalizeMacAddress', () => {
    it('должен нормализовать MAC-адреса', () => {
      expect(normalizeMacAddress('00:11:22:33:44:55')).toBe('00:11:22:33:44:55');
      expect(normalizeMacAddress('aa:bb:cc:dd:ee:ff')).toBe('AA:BB:CC:DD:EE:FF');
      expect(normalizeMacAddress('00-11-22-33-44-55')).toBe('00:11:22:33:44:55');
    });
  });

  describe('validateClient', () => {
    const validClientData = {
      firstName: 'Иван',
      lastName: 'Иванов',
      middleName: 'Иванович',
      phones: ['+79001234567'],
      email: 'ivan@example.com',
      address: 'Москва, ул. Тестовая, 1'
    };

    it('должен валидировать корректные данные абонента', () => {
      expect(() => validateClient(validClientData)).not.toThrow();
    });

    it('должен требовать обязательные поля', () => {
      expect(() => validateClient({})).toThrow(ValidationError);
      expect(() => validateClient({ firstName: 'Иван' })).toThrow(ValidationError);
      expect(() => validateClient({ firstName: 'Иван', lastName: 'Иванов' })).toThrow(ValidationError);
    });

    it('должен валидировать имя', () => {
      expect(() => validateClient({
        ...validClientData,
        firstName: ''
      })).toThrow(ValidationError);

      expect(() => validateClient({
        ...validClientData,
        firstName: 'И'
      })).toThrow(ValidationError);

      expect(() => validateClient({
        ...validClientData,
        firstName: 'A'.repeat(51)
      })).toThrow(ValidationError);

      expect(() => validateClient({
        ...validClientData,
        firstName: 'Иван123'
      })).toThrow(ValidationError);
    });

    it('должен валидировать телефоны', () => {
      expect(() => validateClient({
        ...validClientData,
        phones: []
      })).toThrow(ValidationError);

      expect(() => validateClient({
        ...validClientData,
        phones: ['invalid-phone']
      })).toThrow(ValidationError);

      expect(() => validateClient({
        ...validClientData,
        phones: Array(6).fill('+79001234567')
      })).toThrow(ValidationError);

      expect(() => validateClient({
        ...validClientData,
        phones: ['+79001234567', '+79001234567']
      })).toThrow(ValidationError);
    });

    it('должен валидировать email', () => {
      expect(() => validateClient({
        ...validClientData,
        email: 'invalid-email'
      })).toThrow(ValidationError);

      expect(() => validateClient({
        ...validClientData,
        email: 'a'.repeat(100) + '@example.com'
      })).toThrow(ValidationError);
    });

    it('должен валидировать Telegram ID', () => {
      expect(() => validateClient({
        ...validClientData,
        telegramId: 'abc'
      })).toThrow(ValidationError);

      expect(() => validateClient({
        ...validClientData,
        telegramId: 'a'.repeat(33)
      })).toThrow(ValidationError);
    });

    it('должен валидировать координаты', () => {
      expect(() => validateClient({
        ...validClientData,
        coordinates: { latitude: 'invalid', longitude: 37.6176 }
      })).toThrow(ValidationError);

      expect(() => validateClient({
        ...validClientData,
        coordinates: { latitude: 91, longitude: 37.6176 }
      })).toThrow(ValidationError);

      expect(() => validateClient({
        ...validClientData,
        coordinates: { latitude: 55.7558, longitude: 181 }
      })).toThrow(ValidationError);
    });
  });

  describe('validateAccount', () => {
    const validAccountData = {
      clientId: '507f1f77bcf86cd799439011',
      tariffId: '507f1f77bcf86cd799439012',
      macAddress: '00:11:22:33:44:55',
      poolName: 'default',
      blockThreshold: 0
    };

    it('должен валидировать корректные данные лицевого счета', () => {
      expect(() => validateAccount(validAccountData)).not.toThrow();
    });

    it('должен требовать обязательные поля', () => {
      expect(() => validateAccount({})).toThrow(ValidationError);
      expect(() => validateAccount({ clientId: '507f1f77bcf86cd799439011' })).toThrow(ValidationError);
    });

    it('должен валидировать ObjectId', () => {
      expect(() => validateAccount({
        ...validAccountData,
        clientId: 'invalid-id'
      })).toThrow(ValidationError);

      expect(() => validateAccount({
        ...validAccountData,
        tariffId: 'invalid-id'
      })).toThrow(ValidationError);
    });

    it('должен валидировать MAC-адрес', () => {
      expect(() => validateAccount({
        ...validAccountData,
        macAddress: 'invalid-mac'
      })).toThrow(ValidationError);
    });

    it('должен валидировать pool name', () => {
      expect(() => validateAccount({
        ...validAccountData,
        poolName: 'invalid pool name!'
      })).toThrow(ValidationError);

      expect(() => validateAccount({
        ...validAccountData,
        poolName: 'a'.repeat(51)
      })).toThrow(ValidationError);
    });

    it('должен валидировать порог блокировки', () => {
      expect(() => validateAccount({
        ...validAccountData,
        blockThreshold: -10
      })).toThrow(ValidationError);

      expect(() => validateAccount({
        ...validAccountData,
        blockThreshold: 10001
      })).toThrow(ValidationError);
    });
  });

  describe('validateObjectId', () => {
    it('должен валидировать корректные ObjectId', () => {
      expect(() => validateObjectId('507f1f77bcf86cd799439011')).not.toThrow();
      expect(() => validateObjectId('000000000000000000000000')).not.toThrow();
    });

    it('должен отклонять некорректные ObjectId', () => {
      expect(() => validateObjectId('invalid-id')).toThrow(ValidationError);
      expect(() => validateObjectId('507f1f77bcf86cd79943901')).toThrow(ValidationError);
      expect(() => validateObjectId('')).toThrow(ValidationError);
    });
  });

  describe('validatePagination', () => {
    it('должен валидировать корректные параметры пагинации', () => {
      expect(() => validatePagination(1, 20)).not.toThrow();
      expect(() => validatePagination('1', '20')).not.toThrow();
    });

    it('должен отклонять некорректные параметры', () => {
      expect(() => validatePagination(0, 20)).toThrow(ValidationError);
      expect(() => validatePagination(1, 0)).toThrow(ValidationError);
      expect(() => validatePagination(1, 101)).toThrow(ValidationError);
      expect(() => validatePagination('invalid', 20)).toThrow(ValidationError);
    });
  });

  describe('validateClientFilters', () => {
    it('должен валидировать корректные фильтры', () => {
      const validFilters = {
        search: 'Иван',
        status: AccountStatus.ACTIVE,
        tariffId: '507f1f77bcf86cd799439011',
        balanceMin: 0,
        balanceMax: 1000
      };

      expect(() => validateClientFilters(validFilters)).not.toThrow();
    });

    it('должен отклонять некорректные фильтры', () => {
      expect(() => validateClientFilters({
        status: 'INVALID_STATUS'
      })).toThrow(ValidationError);

      expect(() => validateClientFilters({
        tariffId: 'invalid-id'
      })).toThrow(ValidationError);

      expect(() => validateClientFilters({
        balanceMin: 'invalid'
      })).toThrow(ValidationError);

      expect(() => validateClientFilters({
        createdFrom: 'invalid-date'
      })).toThrow(ValidationError);
    });
  });
});