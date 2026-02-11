import { describe, it, expect } from 'vitest';
import { requiresParentalConsent, getConsentRegulation } from '@/lib/consent-regulations';

describe('Consent Regulations', () => {
  describe('requiresParentalConsent', () => {
    it('returns true for minors in the US (under 13)', () => {
      expect(requiresParentalConsent('US', 12)).toBe(true);
      expect(requiresParentalConsent('US', 10)).toBe(true);
    });

    it('returns false for adults in the US (13 and over)', () => {
      expect(requiresParentalConsent('US', 13)).toBe(false);
      expect(requiresParentalConsent('US', 18)).toBe(false);
    });

    it('returns true for minors in Spain (under 14)', () => {
      expect(requiresParentalConsent('ES', 13)).toBe(true);
    });

    it('returns false for 14 year olds in Spain', () => {
      expect(requiresParentalConsent('ES', 14)).toBe(false);
    });

    it('returns true for minors in Germany (under 16)', () => {
      expect(requiresParentalConsent('DE', 15)).toBe(true);
    });

    it('returns false for unknown countries (default to no consent required)', () => {
      expect(requiresParentalConsent('XX', 5)).toBe(false);
    });

    it('handles lowercase country codes', () => {
      expect(requiresParentalConsent('us', 12)).toBe(true);
    });
  });

  describe('getConsentRegulation', () => {
    it('returns regulation data for valid country', () => {
      const reg = getConsentRegulation('BR');
      expect(reg).not.toBeNull();
      expect(reg?.consentAge).toBe(12);
      expect(reg?.law).toBe('LGPD');
    });

    it('returns null for Mexico (not in the restricted list)', () => {
      expect(getConsentRegulation('MX')).toBeNull();
    });
  });
});
