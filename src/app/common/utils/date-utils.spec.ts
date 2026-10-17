import {
  formatDate,
  formatDateMDYYYY,
  formatDateToMMDDYYYY,
  getCurrentTimezone,
  formatDateLocal,
} from './date-utils';

describe('date-utils', () => {
  describe('formatDate', () => {
    it('should format date as MM/DD/YYYY HH:mm:ss with zero-padding', () => {
      const dt = new Date(2025, 6, 4, 5, 6, 7);
      expect(formatDate(dt)).toBe('07/04/2025 05:06:07');
    });

    it('should pad single-digit components', () => {
      const dt = new Date(2021, 0, 2, 3, 4, 5);
      expect(formatDate(dt)).toBe('01/02/2021 03:04:05');
    });

    it('should handle midnight correctly', () => {
      const dt = new Date(2023, 11, 31, 0, 0, 0);
      expect(formatDate(dt)).toBe('12/31/2023 00:00:00');
    });

    it('should handle edge of month transition', () => {
      const dt = new Date(2024, 0, 1, 23, 59, 59);
      expect(formatDate(dt)).toBe('01/01/2024 23:59:59');
    });

  });

  describe('formatDateLocal', () => {
    it('should format single-digit month and day with leading zeros', () => {
      const date = new Date(2025, 0, 5); // Jan 5
      expect(formatDateLocal(date)).toBe('2025-01-05');
    });

    it('should format double-digit month and day correctly', () => {
      const date = new Date(2025, 10, 15); // Nov 15
      expect(formatDateLocal(date)).toBe('2025-11-15');
    });

    it('should return correct string for end of month', () => {
      const date = new Date(2025, 8, 30); // Sep 30
      expect(formatDateLocal(date)).toBe('2025-09-30');
    });

    it('should handle leap year date', () => {
      const date = new Date(2024, 1, 29); // Feb 29
      expect(formatDateLocal(date)).toBe('2024-02-29');
    });

    it('should handle December 31st correctly', () => {
      const date = new Date(2023, 11, 31);
      expect(formatDateLocal(date)).toBe('2023-12-31');
    });
 });

  describe('formatDateMDYYYY', () => {
    it('should format date as M/D/YYYY without leading zeros', () => {
      expect(formatDateMDYYYY(new Date(2025, 6, 4))).toBe('7/4/2025');
      expect(formatDateMDYYYY(new Date(2021, 0, 2))).toBe('1/2/2021');
    });

    it('should handle December correctly', () => {
      expect(formatDateMDYYYY(new Date(2023, 11, 31))).toBe('12/31/2023');
    });

    it('should handle single-digit month with double-digit day', () => {
      expect(formatDateMDYYYY(new Date(2023, 0, 15))).toBe('1/15/2023');
    });

  });

  describe('formatDateToMMDDYYYY', () => {
    it('should format ISO date to MM/DD/YYYY', () => {
      expect(formatDateToMMDDYYYY('2025-07-04T12:34:56Z')).toBe('07/04/2025');
      expect(formatDateToMMDDYYYY('2021-01-02T00:00:00')).toBe('01/02/2021');
      expect(formatDateToMMDDYYYY('2025-04-07')).toBe('04/07/2025');
    });

    it('should return NaN/NaN/NaN for invalid date string', () => {
      expect(formatDateToMMDDYYYY('bad-date')).toBe('NaN/NaN/NaN');
    });

    it('should return NaN/NaN/NaN for undefined input', () => {
      expect(formatDateToMMDDYYYY(undefined as any)).toBe('NaN/NaN/NaN');
    });

    it('should return NaN/NaN/NaN for empty string', () => {
      expect(formatDateToMMDDYYYY('')).toBe('NaN/NaN/NaN');
    });

    it('should correctly handle input without time portion', () => {
      expect(formatDateToMMDDYYYY('2025-12-31')).toBe('12/31/2025');
    });

    it('should correctly handle time-only string', () => {
      expect(formatDateToMMDDYYYY('T12:34:56')).toBe('NaN/NaN/NaN');
    });

    it('should handle dates with timezone offsets', () => {
      expect(formatDateToMMDDYYYY('2025-07-04T12:34:56-05:00')).toBe('07/04/2025');
    });

    it('should handle dates with Z timezone', () => {
      expect(formatDateToMMDDYYYY('2025-07-04T12:34:56Z')).toBe('07/04/2025');
    });
  });

  describe('getCurrentTimezone', () => {
    it('should return a string in ±HHMM format', () => {
      const tz = getCurrentTimezone();
      expect(tz).toMatch(/^[+-]\d{4}$/);
    });
    it('should handle negative timezone offsets', () => {
      // Mock the timezone offset to -8:00
      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(480);
      expect(getCurrentTimezone()).toMatch(/^-0800$/);
      jest.restoreAllMocks();
    });

    it('should handle zero timezone offset', () => {
      // Mock the timezone offset to 0
      jest.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(0);
      expect(getCurrentTimezone()).toMatch(/^\+0000$/);
      jest.restoreAllMocks();
    });

  });
});