import { describe, it, expect } from 'vitest';
import { paginateArray } from '@/components/ui/pagination';

describe('paginateArray', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1); // [1..25]

  it('returns correct first page', () => {
    const result = paginateArray(items, 1, 10);
    expect(result.data).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.totalPages).toBe(3);
    expect(result.totalItems).toBe(25);
  });

  it('returns correct last page with partial data', () => {
    const result = paginateArray(items, 3, 10);
    expect(result.data).toEqual([21, 22, 23, 24, 25]);
    expect(result.totalPages).toBe(3);
  });

  it('returns correct middle page', () => {
    const result = paginateArray(items, 2, 10);
    expect(result.data).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('clamps page to 1 when page < 1', () => {
    const result = paginateArray(items, 0, 10);
    expect(result.data).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('clamps page to totalPages when page exceeds max', () => {
    const result = paginateArray(items, 999, 10);
    expect(result.data).toEqual([21, 22, 23, 24, 25]);
    expect(result.totalPages).toBe(3);
  });

  it('handles empty array', () => {
    const result = paginateArray([], 1, 10);
    expect(result.data).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.totalItems).toBe(0);
  });

  it('handles single item', () => {
    const result = paginateArray(['only'], 1, 10);
    expect(result.data).toEqual(['only']);
    expect(result.totalPages).toBe(1);
    expect(result.totalItems).toBe(1);
  });

  it('handles pageSize = 1', () => {
    const result = paginateArray(items, 5, 1);
    expect(result.data).toEqual([5]);
    expect(result.totalPages).toBe(25);
  });

  it('handles pageSize larger than array', () => {
    const result = paginateArray(items, 1, 100);
    expect(result.data).toEqual(items);
    expect(result.totalPages).toBe(1);
  });

  it('preserves object types', () => {
    const objects = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = paginateArray(objects, 1, 2);
    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.totalPages).toBe(2);
  });

  it('returns correct totalPages for exact divisions', () => {
    const exact = Array.from({ length: 20 }, (_, i) => i);
    const result = paginateArray(exact, 1, 10);
    expect(result.totalPages).toBe(2);
  });
});
