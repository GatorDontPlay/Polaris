/**
 * @jest-environment node
 */

import {
  computeAustralianFY,
  isDateInFY,
  getCurrentAustralianFY,
  formatFYDateRange,
  isValidFYLabel,
  createFYFromLabel,
  FinancialYear,
} from '../financial-year';

describe('Australian Financial Year Utilities', () => {
  describe('computeAustralianFY', () => {
    it('should compute FY correctly for dates in July or later (current year to next year)', () => {
      // Test July 15, 2025
      const julyDate = new Date(2025, 6, 15); // Month 6 = July (0-indexed)
      const fy = computeAustralianFY(julyDate);
      
      expect(fy.label).toBe('2025-2026');
      expect(fy.startDate).toEqual(new Date(2025, 6, 1));
      expect(fy.endDate).toEqual(new Date(2026, 5, 30));
    });

    it('should compute FY correctly for dates in August', () => {
      // Test August 15, 2025
      const augDate = new Date(2025, 7, 15); // Month 7 = August
      const fy = computeAustralianFY(augDate);
      
      expect(fy.label).toBe('2025-2026');
      expect(fy.startDate).toEqual(new Date(2025, 6, 1));
      expect(fy.endDate).toEqual(new Date(2026, 5, 30));
    });

    it('should compute FY correctly for dates in December', () => {
      // Test December 15, 2025
      const decDate = new Date(2025, 11, 15); // Month 11 = December
      const fy = computeAustralianFY(decDate);
      
      expect(fy.label).toBe('2025-2026');
      expect(fy.startDate).toEqual(new Date(2025, 6, 1));
      expect(fy.endDate).toEqual(new Date(2026, 5, 30));
    });

    it('should compute FY correctly for dates in June or earlier (previous year to current year)', () => {
      // Test June 15, 2025
      const juneDate = new Date(2025, 5, 15); // Month 5 = June (0-indexed)
      const fy = computeAustralianFY(juneDate);
      
      expect(fy.label).toBe('2024-2025');
      expect(fy.startDate).toEqual(new Date(2024, 6, 1));
      expect(fy.endDate).toEqual(new Date(2025, 5, 30));
    });

    it('should compute FY correctly for dates in January', () => {
      // Test January 15, 2025
      const janDate = new Date(2025, 0, 15); // Month 0 = January
      const fy = computeAustralianFY(janDate);
      
      expect(fy.label).toBe('2024-2025');
      expect(fy.startDate).toEqual(new Date(2024, 6, 1));
      expect(fy.endDate).toEqual(new Date(2025, 5, 30));
    });

    it('should handle boundary dates correctly', () => {
      // Test July 1 (start of FY)
      const julyFirst = new Date(2025, 6, 1);
      const fyJuly = computeAustralianFY(julyFirst);
      expect(fyJuly.label).toBe('2025-2026');

      // Test June 30 (end of FY)
      const juneLast = new Date(2025, 5, 30);
      const fyJune = computeAustralianFY(juneLast);
      expect(fyJune.label).toBe('2024-2025');
    });
  });

  describe('isDateInFY', () => {
    const fy2025: FinancialYear = {
      label: '2024-2025',
      startDate: new Date(2024, 6, 1),
      endDate: new Date(2025, 5, 30),
    };

    it('should return true for dates within the FY', () => {
      const dateInFY = new Date(2024, 11, 15); // December 15, 2024
      expect(isDateInFY(dateInFY, fy2025)).toBe(true);
    });

    it('should return true for boundary dates', () => {
      expect(isDateInFY(fy2025.startDate, fy2025)).toBe(true);
      expect(isDateInFY(fy2025.endDate, fy2025)).toBe(true);
    });

    it('should return false for dates outside the FY', () => {
      const dateBefore = new Date(2024, 5, 30); // June 30, 2024 (before FY)
      const dateAfter = new Date(2025, 6, 1); // July 1, 2025 (after FY)
      
      expect(isDateInFY(dateBefore, fy2025)).toBe(false);
      expect(isDateInFY(dateAfter, fy2025)).toBe(false);
    });
  });

  describe('getCurrentAustralianFY', () => {
    it('should return a valid FinancialYear object', () => {
      const currentFY = getCurrentAustralianFY();
      
      expect(currentFY).toHaveProperty('label');
      expect(currentFY).toHaveProperty('startDate');
      expect(currentFY).toHaveProperty('endDate');
      expect(isValidFYLabel(currentFY.label)).toBe(true);
    });
  });

  describe('formatFYDateRange', () => {
    const fy: FinancialYear = {
      label: '2024-2025',
      startDate: new Date(2024, 6, 1),
      endDate: new Date(2025, 5, 30),
    };

    it('should format short date range correctly', () => {
      const shortFormat = formatFYDateRange(fy, 'short');
      // Format should be like "1 July - 30 June 2025"
      expect(shortFormat).toMatch(/^\d{1,2} \w+ - \d{1,2} \w+ \d{4}$/);
    });

    it('should format long date range correctly', () => {
      const longFormat = formatFYDateRange(fy, 'long');
      expect(longFormat).toMatch(/^\d{1,2} \w+ \d{4} - \d{1,2} \w+ \d{4}$/);
    });

    it('should default to short format', () => {
      const defaultFormat = formatFYDateRange(fy);
      const shortFormat = formatFYDateRange(fy, 'short');
      expect(defaultFormat).toBe(shortFormat);
    });
  });

  describe('isValidFYLabel', () => {
    it('should return true for valid FY labels', () => {
      expect(isValidFYLabel('2024-2025')).toBe(true);
      expect(isValidFYLabel('2025-2026')).toBe(true);
      expect(isValidFYLabel('1999-2000')).toBe(true);
    });

    it('should return false for invalid FY labels', () => {
      expect(isValidFYLabel('2024-2026')).toBe(false); // Gap year
      expect(isValidFYLabel('2025-2024')).toBe(false); // Reverse order
      expect(isValidFYLabel('24-25')).toBe(false); // Short format
      expect(isValidFYLabel('2024-25')).toBe(false); // Mixed format
      expect(isValidFYLabel('2024/2025')).toBe(false); // Wrong separator
      expect(isValidFYLabel('2024')).toBe(false); // Single year
      expect(isValidFYLabel('')).toBe(false); // Empty string
      expect(isValidFYLabel('invalid')).toBe(false); // Non-numeric
    });
  });

  describe('createFYFromLabel', () => {
    it('should create FinancialYear from valid label', () => {
      const fy = createFYFromLabel('2024-2025');
      
      expect(fy.label).toBe('2024-2025');
      expect(fy.startDate).toEqual(new Date(2024, 6, 1));
      expect(fy.endDate).toEqual(new Date(2025, 5, 30));
    });

    it('should throw error for invalid labels', () => {
      expect(() => createFYFromLabel('2024-2026')).toThrow();
      expect(() => createFYFromLabel('invalid')).toThrow();
      expect(() => createFYFromLabel('')).toThrow();
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle leap years correctly', () => {
      // 2024 is a leap year
      const leapYearDate = new Date(2024, 1, 29); // Feb 29, 2024
      const fy = computeAustralianFY(leapYearDate);
      expect(fy.label).toBe('2023-2024');
    });

    it('should maintain consistency between compute and create functions', () => {
      const testDate = new Date(2025, 8, 15); // September 15, 2025
      const computedFY = computeAustralianFY(testDate);
      const createdFY = createFYFromLabel(computedFY.label);
      
      expect(computedFY.label).toBe(createdFY.label);
      expect(computedFY.startDate.getTime()).toBe(createdFY.startDate.getTime());
      expect(computedFY.endDate.getTime()).toBe(createdFY.endDate.getTime());
    });

    it('should handle different timezone specifications', () => {
      const testDate = new Date(2025, 6, 15);
      const fyAdelaide = computeAustralianFY(testDate, 'Australia/Adelaide');
      const fySydney = computeAustralianFY(testDate, 'Australia/Sydney');
      
      // Should be the same for most dates (unless edge case with timezone boundaries)
      expect(fyAdelaide.label).toBe(fySydney.label);
    });
  });
});
