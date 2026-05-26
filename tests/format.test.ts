import { describe, it, expect } from 'vitest';
import { formatMoneyDual, formatRelativeTime } from '@/lib/format';

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

describe('formatRelativeTime', () => {
  const now = Date.UTC(2026, 4, 26, 9, 0, 0); // 2026-05-26 09:00 UTC

  it('returns seconds when delta < 60s', () => {
    const out = formatRelativeTime(now - 30_000, 'en', now);
    expect(out.toLowerCase()).toMatch(/second|now/);
  });

  it('rolls up to minutes between 60s and 1h', () => {
    const out = formatRelativeTime(now - 5 * 60_000, 'en', now);
    expect(out.toLowerCase()).toContain('minute');
  });

  it('rolls up to hours between 1h and 24h', () => {
    const out = formatRelativeTime(now - 3 * 60 * 60_000, 'en', now);
    expect(out.toLowerCase()).toContain('hour');
  });

  it('returns "yesterday"-style copy for ~1 day delta in en', () => {
    // numeric:auto turns "-1 day" into "yesterday" in en-US.
    const out = formatRelativeTime(now - 24 * 60 * 60_000, 'en', now);
    expect(out.toLowerCase()).toContain('yesterday');
  });

  it('handles ko locale without throwing', () => {
    const out = formatRelativeTime(now - 2 * 60 * 60_000, 'ko', now);
    expect(out.length).toBeGreaterThan(0);
  });
});
