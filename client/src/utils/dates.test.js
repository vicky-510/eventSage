import { describe, it, expect } from 'vitest';
import { daysUntil } from './dates.js';

describe('daysUntil', () => {
  it('returns null when no date is given', () => {
    expect(daysUntil(undefined)).toBeNull();
    expect(daysUntil('')).toBeNull();
  });

  it('returns a positive count for a future date', () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysUntil(future)).toBeGreaterThanOrEqual(4);
  });

  it('returns a negative count for a past date', () => {
    const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(daysUntil(past)).toBeLessThan(0);
  });
});
