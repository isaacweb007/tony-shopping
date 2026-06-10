/**
 * Pure merge of server-recorded price observations (Tony's cron) into the
 * per-device price-watch timeline. Extracted from the Zustand store so it can
 * be unit-tested without importing the persisted store (which needs
 * localStorage). The store wires these to its `snapshots` map.
 */

export interface Observation {
  /** ms since epoch. */
  at: number;
  amount: number;
}

export type WatchCurrency = 'KRW' | 'USD' | 'VND' | 'JPY';

export interface WatchSnapshot {
  productId: string;
  currency: WatchCurrency;
  entries: Observation[];
}

/** A server timeline before currency narrowing (currency is raw text). */
export interface ServerObservation {
  productId: string;
  currency: string;
  entries: Observation[];
}

const ALLOWED_CURRENCIES = new Set<WatchCurrency>(['KRW', 'USD', 'VND', 'JPY']);

/**
 * Union two oldest→newest series: sort by timestamp, drop exact (at, amount)
 * duplicates, collapse consecutive equal amounts to the earlier point
 * (moves-only), then keep the last `maxEntries`.
 */
export function mergeEntries(
  a: readonly Observation[],
  b: readonly Observation[],
  maxEntries: number,
): Observation[] {
  const sorted = [...a, ...b].sort((x, y) => x.at - y.at);
  const out: Observation[] = [];
  for (const e of sorted) {
    const last = out[out.length - 1];
    if (last && last.at === e.at && last.amount === e.amount) continue; // exact dup
    if (last && last.amount === e.amount) continue; // no move → skip
    out.push(e);
  }
  return out.slice(-maxEntries);
}

/**
 * Fold server observations into a snapshots map, returning a new map plus
 * whether anything changed. A currency mismatch leaves the local series
 * untouched (don't mix scales); unknown currencies are skipped.
 */
export function mergeServerIntoSnapshots(
  snapshots: Record<string, WatchSnapshot>,
  incoming: readonly ServerObservation[],
  maxEntries: number,
): { snapshots: Record<string, WatchSnapshot>; changed: boolean } {
  const next = { ...snapshots };
  let changed = false;
  for (const w of incoming) {
    if (!ALLOWED_CURRENCIES.has(w.currency as WatchCurrency)) continue;
    const currency = w.currency as WatchCurrency;
    const serverEntries = w.entries.filter(
      (e) => Number.isFinite(e.at) && Number.isFinite(e.amount),
    );
    if (serverEntries.length === 0) continue;
    const existing = next[w.productId];
    if (!existing) {
      next[w.productId] = {
        productId: w.productId,
        currency,
        entries: mergeEntries([], serverEntries, maxEntries),
      };
      changed = true;
      continue;
    }
    if (existing.currency !== currency) continue;
    next[w.productId] = {
      ...existing,
      entries: mergeEntries(existing.entries, serverEntries, maxEntries),
    };
    changed = true;
  }
  return { snapshots: next, changed };
}
