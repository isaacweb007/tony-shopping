/**
 * Alerts inbox — joins shortlist snapshots with the per-product price-watch
 * ledger and produces a ranked, status-tagged list ready for the UI.
 *
 * Pure function, no React, no IO. The page wires it to live store data via
 * useShortlistStore + usePriceWatchStore.
 */
import type { ShortlistSnap } from '@/types/shortlist';
import type { PriceSnapshot } from '@/stores/price-watch-store';

export type AlertStatus = 'drop' | 'rise' | 'flat' | 'unobserved';

export interface AlertRow {
  snap: ShortlistSnap;
  watch: PriceSnapshot | null;
  /** Signed delta ratio (-0.08 = down 8%) or null when unobserved / no baseline. */
  delta: number | null;
  status: AlertStatus;
}

interface BuildArgs {
  snaps: readonly ShortlistSnap[];
  snapshots: Record<string, PriceSnapshot>;
  /** Drop threshold ratio: a delta <= -threshold is classified as "drop". */
  threshold: number;
}

function classify(delta: number | null, threshold: number): AlertStatus {
  if (delta === null) return 'flat';
  if (delta <= -threshold) return 'drop';
  if (delta >= threshold) return 'rise';
  return 'flat';
}

export function buildAlerts({ snaps, snapshots, threshold }: BuildArgs): AlertRow[] {
  const rows: AlertRow[] = snaps.map((snap) => {
    const watch = snapshots[snap.id] ?? null;
    let delta: number | null = null;
    if (watch) {
      const n = watch.entries.length;
      const prev = watch.entries[n - 2];
      const curr = watch.entries[n - 1];
      if (prev && curr && prev.amount !== 0) {
        delta = (curr.amount - prev.amount) / prev.amount;
      }
    }
    const status: AlertStatus = watch ? classify(delta, threshold) : 'unobserved';
    return { snap, watch, delta, status };
  });

  // Sort: biggest absolute delta first; unobserved sink to the bottom;
  // among unobserved, most-recently-added first (matches addedAt sort).
  rows.sort((a, b) => {
    if (a.status === 'unobserved' && b.status !== 'unobserved') return 1;
    if (b.status === 'unobserved' && a.status !== 'unobserved') return -1;
    if (a.status === 'unobserved' && b.status === 'unobserved') {
      return b.snap.addedAt - a.snap.addedAt;
    }
    const ad = Math.abs(a.delta ?? 0);
    const bd = Math.abs(b.delta ?? 0);
    if (ad === bd) return b.snap.addedAt - a.snap.addedAt;
    return bd - ad;
  });
  return rows;
}

export interface AlertCounts {
  total: number;
  drop: number;
  rise: number;
  flat: number;
  unobserved: number;
}

export function countByStatus(rows: readonly AlertRow[]): AlertCounts {
  const out: AlertCounts = { total: rows.length, drop: 0, rise: 0, flat: 0, unobserved: 0 };
  for (const r of rows) out[r.status] += 1;
  return out;
}
