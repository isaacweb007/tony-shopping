import { describe, it, expect } from 'vitest';
import { buildAlerts, countByStatus } from '@/lib/alerts/build-alerts';
import type { ShortlistSnap } from '@/types/shortlist';
import type { PriceSnapshot } from '@/stores/price-watch-store';

function snap(id: string, addedAt: number, name = id): ShortlistSnap {
  return {
    id,
    name,
    store: 'Coupang',
    finalPrice: { amount: 100_000, currency: 'KRW' },
    addedAt,
  };
}

function ts(prev: number, curr: number, atOffset = 0): PriceSnapshot {
  const now = Date.now();
  return {
    productId: 'x',
    currency: 'KRW',
    entries: [
      { at: now - 24 * 60 * 60 * 1000 - atOffset, amount: prev },
      { at: now - atOffset, amount: curr },
    ],
  };
}

describe('buildAlerts', () => {
  it('classifies a 10% drop as "drop"', () => {
    const rows = buildAlerts({
      snaps: [snap('a', 1)],
      snapshots: { a: ts(100_000, 90_000) },
      threshold: 0.05,
    });
    expect(rows[0]!.status).toBe('drop');
    expect(rows[0]!.delta).toBeCloseTo(-0.1, 5);
  });

  it('classifies a small move under threshold as "flat"', () => {
    const rows = buildAlerts({
      snaps: [snap('a', 1)],
      snapshots: { a: ts(100_000, 102_000) },
      threshold: 0.05,
    });
    expect(rows[0]!.status).toBe('flat');
  });

  it('classifies a 10% rise as "rise"', () => {
    const rows = buildAlerts({
      snaps: [snap('a', 1)],
      snapshots: { a: ts(100_000, 110_000) },
      threshold: 0.05,
    });
    expect(rows[0]!.status).toBe('rise');
  });

  it('marks unobserved snaps when no price-watch entry exists', () => {
    const rows = buildAlerts({
      snaps: [snap('a', 1)],
      snapshots: {},
      threshold: 0.05,
    });
    expect(rows[0]!.status).toBe('unobserved');
    expect(rows[0]!.delta).toBeNull();
  });

  it('sorts by absolute delta (biggest moves first); unobserved sink', () => {
    const rows = buildAlerts({
      snaps: [snap('a', 100), snap('b', 200), snap('c', 300)],
      snapshots: {
        a: ts(100_000, 102_000), // +2% — small
        b: ts(100_000, 80_000),  // -20% — biggest
        // c missing → unobserved
      },
      threshold: 0.05,
    });
    expect(rows.map((r) => r.snap.id)).toEqual(['b', 'a', 'c']);
  });

  it('skips snoozed snaps whose untilMs is still in the future', () => {
    const now = Date.now();
    const rows = buildAlerts({
      snaps: [snap('a', 1), snap('b', 2)],
      snapshots: {
        a: ts(100_000, 80_000),
        b: ts(100_000, 90_000),
      },
      threshold: 0.05,
      snoozes: { a: now + 60 * 60 * 1000 },
      now,
    });
    expect(rows.map((r) => r.snap.id)).toEqual(['b']);
  });

  it('treats expired snoozes as not snoozed', () => {
    const now = Date.now();
    const rows = buildAlerts({
      snaps: [snap('a', 1)],
      snapshots: { a: ts(100_000, 80_000) },
      threshold: 0.05,
      snoozes: { a: now - 1000 }, // expired
      now,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe('drop');
  });

  it('countByStatus tallies correctly', () => {
    const rows = buildAlerts({
      snaps: [snap('a', 1), snap('b', 2), snap('c', 3), snap('d', 4)],
      snapshots: {
        a: ts(100, 80),   // drop
        b: ts(100, 120),  // rise
        c: ts(100, 101),  // flat
        // d unobserved
      },
      threshold: 0.05,
    });
    const counts = countByStatus(rows);
    expect(counts.total).toBe(4);
    expect(counts.drop).toBe(1);
    expect(counts.rise).toBe(1);
    expect(counts.flat).toBe(1);
    expect(counts.unobserved).toBe(1);
  });
});
