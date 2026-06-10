import { describe, it, expect } from 'vitest';
import {
  mergeEntries,
  mergeServerIntoSnapshots,
  type WatchSnapshot,
} from '@/lib/alerts/merge-observations';

const MAX = 30;

describe('mergeEntries', () => {
  it('orders by timestamp and keeps moves', () => {
    const out = mergeEntries(
      [{ at: 100, amount: 1000 }],
      [{ at: 200, amount: 900 }],
      MAX,
    );
    expect(out).toEqual([
      { at: 100, amount: 1000 },
      { at: 200, amount: 900 },
    ]);
  });

  it('drops exact duplicate points', () => {
    const out = mergeEntries(
      [{ at: 100, amount: 1000 }],
      [{ at: 100, amount: 1000 }],
      MAX,
    );
    expect(out).toEqual([{ at: 100, amount: 1000 }]);
  });

  it('collapses consecutive equal amounts to the earlier point', () => {
    const out = mergeEntries(
      [{ at: 100, amount: 1000 }],
      [{ at: 200, amount: 1000 }, { at: 300, amount: 800 }],
      MAX,
    );
    expect(out).toEqual([
      { at: 100, amount: 1000 },
      { at: 300, amount: 800 },
    ]);
  });

  it('caps to the last maxEntries', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ at: i, amount: i }));
    const out = mergeEntries(many, [], 30);
    expect(out).toHaveLength(30);
    expect(out[0]).toEqual({ at: 10, amount: 10 });
  });
});

describe('mergeServerIntoSnapshots', () => {
  it('creates a snapshot when none exists', () => {
    const { snapshots, changed } = mergeServerIntoSnapshots(
      {},
      [{ productId: 'a', currency: 'KRW', entries: [{ at: 1, amount: 100 }] }],
      MAX,
    );
    expect(changed).toBe(true);
    expect(snapshots.a?.entries).toEqual([{ at: 1, amount: 100 }]);
  });

  it('merges into an existing same-currency snapshot', () => {
    const start: Record<string, WatchSnapshot> = {
      a: { productId: 'a', currency: 'KRW', entries: [{ at: 1, amount: 100 }] },
    };
    const { snapshots } = mergeServerIntoSnapshots(
      start,
      [{ productId: 'a', currency: 'KRW', entries: [{ at: 2, amount: 90 }] }],
      MAX,
    );
    expect(snapshots.a?.entries).toEqual([
      { at: 1, amount: 100 },
      { at: 2, amount: 90 },
    ]);
  });

  it('leaves a currency-mismatched snapshot untouched', () => {
    const start: Record<string, WatchSnapshot> = {
      a: { productId: 'a', currency: 'KRW', entries: [{ at: 1, amount: 100 }] },
    };
    const { snapshots, changed } = mergeServerIntoSnapshots(
      start,
      [{ productId: 'a', currency: 'USD', entries: [{ at: 2, amount: 90 }] }],
      MAX,
    );
    expect(changed).toBe(false);
    expect(snapshots.a?.entries).toEqual([{ at: 1, amount: 100 }]);
  });

  it('skips unknown currencies and empty series', () => {
    const { changed } = mergeServerIntoSnapshots(
      {},
      [
        { productId: 'a', currency: 'BTC', entries: [{ at: 1, amount: 100 }] },
        { productId: 'b', currency: 'KRW', entries: [] },
      ],
      MAX,
    );
    expect(changed).toBe(false);
  });
});
