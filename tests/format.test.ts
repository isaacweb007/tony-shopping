import { describe, it, expect } from 'vitest';
import { formatMoneyDual } from '@/lib/format';

describe('formatMoneyDual', () => {
  it('returns null secondary when the money is already in the locale currency', () => {
    const out = formatMoneyDual({ amount: 329_000, currency: 'KRW' }, 'ko');
    expect(out.primary).toContain('329,000');
    expect(out.secondary).toBeNull();
  });

  it('returns the source-currency string only when conversion cache is cold', () => {
    // Vitest node env has no FX cache → convertMoneySync returns the input.
    // Behaviour spec: render the original; do NOT invent a secondary line.
    const out = formatMoneyDual({ amount: 218, currency: 'USD' }, 'ko');
    expect(out.primary.length).toBeGreaterThan(0);
    expect(out.secondary).toBeNull();
  });

  it('formats VND for vi locale', () => {
    const out = formatMoneyDual({ amount: 1_500_000, currency: 'VND' }, 'vi');
    // Intl varies the spacing/symbol by Node version; just check the digits land.
    expect(out.primary.replace(/[^\d]/g, '')).toContain('1500000');
    expect(out.secondary).toBeNull();
  });
});
