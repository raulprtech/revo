import { describe, it, expect } from 'vitest';
import { cn, getDefaultTournamentImage } from '@/lib/utils';

describe('cn (class merge utility)', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra');
  });

  it('deduplicates Tailwind conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('handles undefined and null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b');
  });
});

describe('getDefaultTournamentImage', () => {
  it('returns a gradient string', () => {
    const result = getDefaultTournamentImage('FIFA');
    expect(result).toMatch(/^from-\w+-\d+ to-\w+-\d+$/);
  });

  it('returns consistent result for same input', () => {
    const a = getDefaultTournamentImage('Smash Bros');
    const b = getDefaultTournamentImage('Smash Bros');
    expect(a).toBe(b);
  });

  it('may return different results for different games', () => {
    const colors = new Set(
      ['A', 'BB', 'CCC', 'DDDD', 'EEEEE', 'FFFFFF'].map(
        getDefaultTournamentImage
      )
    );
    // At least 2 different gradients among 6 varied-length names
    expect(colors.size).toBeGreaterThanOrEqual(2);
  });
});
