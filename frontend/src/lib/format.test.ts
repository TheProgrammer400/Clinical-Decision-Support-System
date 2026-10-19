import { describe, expect, it } from 'vitest';
import { formatNumber, formatPercent } from './format';

describe('format', () => {
  it('keeps zero as zero and marks missing values', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatPercent(0)).toBe('0%');
    expect(formatNumber(null)).toBe('Not available');
    expect(formatPercent(undefined)).toBe('Not available');
    expect(formatNumber(Number.NaN)).toBe('Not available');
  });
});
