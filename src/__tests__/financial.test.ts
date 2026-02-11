import { describe, it, expect } from 'vitest';
import { 
  calculatePlatformFee, 
  calculateNetRevenue, 
  calculatePrizeSplits,
  formatCurrency,
  FINANCIAL_CONFIG 
} from '@/lib/utils';

describe('Financial Utils', () => {
  describe('formatCurrency', () => {
    it('formats MXN correctly', () => {
      // Note: Intl symbols can vary by env but we check the core structure
      const result = formatCurrency(1234.56, 'MXN');
      expect(result).toMatch(/(\$|MXN).?1,234\.56/);
    });

    it('formats USD correctly', () => {
      const result = formatCurrency(50, 'USD');
      // Some environments use $50.00 and others USD 50.00
      expect(result).toMatch(/(\$|USD).?50\.00/);
    });
  });

  describe('calculatePlatformFee', () => {
    it('calculates 10% fee correctly for round numbers', () => {
      expect(calculatePlatformFee(100)).toBe(10);
      expect(calculatePlatformFee(1000)).toBe(100);
    });

    it('handles decimal amounts and rounds to 2 places', () => {
      // 10% of 99.99 is 9.999 -> should be 10 or 9.99 depending on rounding strategy.
      // My implementation uses Math.round(x * 100) / 100
      expect(calculatePlatformFee(99.99)).toBe(10);
      expect(calculatePlatformFee(55.55)).toBe(5.56);
    });

    it('returns 0 for zero gross', () => {
      expect(calculatePlatformFee(0)).toBe(0);
    });
  });

  describe('calculateNetRevenue', () => {
    it('subtracts fee from gross', () => {
      const gross = 500;
      const fee = calculatePlatformFee(gross);
      expect(calculateNetRevenue(gross)).toBe(gross - fee);
      expect(calculateNetRevenue(100)).toBe(90);
    });
  });

  describe('calculatePrizeSplits', () => {
    const distributions = [
      { position: '1', percentage: 60 },
      { position: '2', percentage: 30 },
      { position: '3', percentage: 10 },
    ];

    it('distributes total net according to percentages', () => {
      const net = 900;
      const result = calculatePrizeSplits(net, distributions);
      
      expect(result[0].amount).toBe(540); // 60% of 900
      expect(result[1].amount).toBe(270); // 30% of 900
      expect(result[2].amount).toBe(90);  // 10% of 900
    });

    it('handles floating point percentages and amounts', () => {
      const net = 100;
      const result = calculatePrizeSplits(net, [
        { position: 1, percentage: 33.33 },
        { position: 2, percentage: 33.33 },
        { position: 3, percentage: 33.34 },
      ]);

      expect(result[0].amount).toBe(33.33);
      expect(result[1].amount).toBe(33.33);
      expect(result[2].amount).toBe(33.34);
      expect(result.reduce((sum, r) => sum + r.amount, 0)).toBe(100);
    });

    it('returns empty array for no distributions', () => {
      expect(calculatePrizeSplits(1000, [])).toEqual([]);
    });
  });
});
