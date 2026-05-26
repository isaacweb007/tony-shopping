'use client';

/**
 * Per-device price-watch timeline.
 *
 * For every product the user has shortlisted we keep a capped time series of
 * observed prices (up to MAX_ENTRIES per product). Every fresh search adds an
 * entry — but only when the price actually changed, so the series is a clean
 * record of *moves*, not a noisy "we re-saw this listing" log.
 *
 * Derived helpers:
 *   - delta(id)       — signed ratio between the two most recent entries
 *   - dismiss(id)     — forget the series entirely
 *   - acknowledge(id) — keep the most recent entry, drop everything older
 *                       (resets the comparison baseline)
 *
 * The store is a v1 → v2 schema bump. v1 stored a single { amount, prevAmount,
 * at } per product; v2 stores { currency, entries: [{at, amount}] }. The
 * persist migrate function converts the v1 record into a one-entry timeline.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/types/product';

export interface PriceObservation {
  /** ms since epoch. */
  at: number;
  amount: number;
}

export interface PriceSnapshot {
  productId: string;
  currency: 'KRW' | 'USD' | 'VND' | 'JPY';
  /** Oldest → newest. Capped at MAX_ENTRIES via observe(). */
  entries: PriceObservation[];
}

interface PriceWatchState {
  snapshots: Record<string, PriceSnapshot>;
  threshold: number;
  /** productId → ms-since-epoch when the snooze expires. Cleared automatically when reading. */
  snoozes: Record<string, number>;
  /** Signed ratio between the two most recent entries (newest vs previous). */
  delta: (productId: string) => number | null;
  /**
   * Take a fresh observation for each product. Returns products whose latest
   * change was a drop past the threshold (used by the search hook to toast).
   */
  observe: (products: Product[]) => Product[];
  /** Convenience: observe a single product. Used by the standalone watch UI. */
  track: (product: Product) => void;
  /** Whether the product currently has at least one snapshot entry. */
  isTracked: (productId: string) => boolean;
  setThreshold: (t: number) => void;
  /** Drop the product from the ledger entirely. */
  dismiss: (productId: string) => void;
  /** Collapse the series to the latest entry — baseline reset. */
  acknowledge: (productId: string) => void;
  /** Hide alerts for this product until `untilMs`. Passing 0 clears the snooze. */
  snooze: (productId: string, untilMs: number) => void;
  /** Read the unexpired snooze timestamp; null when not snoozed or already past. */
  snoozeUntil: (productId: string, now?: number) => number | null;
  reset: () => void;
}

const DEFAULT_THRESHOLD = 0.05;
const MAX_ENTRIES = 30;

function lastTwo(entries: PriceObservation[]): [PriceObservation | null, PriceObservation | null] {
  const n = entries.length;
  return [entries[n - 2] ?? null, entries[n - 1] ?? null];
}

export const usePriceWatchStore = create<PriceWatchState>()(
  persist(
    (set, get) => ({
      snapshots: {},
      threshold: DEFAULT_THRESHOLD,
      snoozes: {},

      delta: (productId) => {
        const snap = get().snapshots[productId];
        if (!snap) return null;
        const [prev, curr] = lastTwo(snap.entries);
        if (!prev || !curr || prev.amount === 0) return null;
        return (curr.amount - prev.amount) / prev.amount;
      },

      observe: (products) => {
        const { snapshots, threshold } = get();
        const next: Record<string, PriceSnapshot> = { ...snapshots };
        const dropped: Product[] = [];

        for (const p of products) {
          const prev = next[p.id];
          const newAmount = p.finalPrice.amount;
          if (!prev) {
            next[p.id] = {
              productId: p.id,
              currency: p.finalPrice.currency,
              entries: [{ at: Date.now(), amount: newAmount }],
            };
            continue;
          }
          // Currency drift = reset series.
          if (prev.currency !== p.finalPrice.currency) {
            next[p.id] = {
              productId: p.id,
              currency: p.finalPrice.currency,
              entries: [{ at: Date.now(), amount: newAmount }],
            };
            continue;
          }
          const lastEntry = prev.entries[prev.entries.length - 1];
          // Skip noise: if the price didn't move, don't add a redundant point.
          if (lastEntry && lastEntry.amount === newAmount) continue;

          const updatedEntries = [
            ...prev.entries.slice(-MAX_ENTRIES + 1),
            { at: Date.now(), amount: newAmount },
          ];
          next[p.id] = {
            ...prev,
            entries: updatedEntries,
          };
          if (lastEntry) {
            const ratio = (newAmount - lastEntry.amount) / lastEntry.amount;
            if (ratio <= -threshold) dropped.push(p);
          }
        }
        set({ snapshots: next });
        return dropped;
      },

      track: (product) => {
        // Single-product variant of observe(). Discards the drop-list return
        // value because the standalone UI shows the sparkline directly rather
        // than firing a toast.
        get().observe([product]);
      },
      isTracked: (productId) => productId in get().snapshots,
      setThreshold: (t) => set({ threshold: Math.max(0, Math.min(0.5, t)) }),
      dismiss: (productId) =>
        set((s) => {
          if (!(productId in s.snapshots)) return s;
          const nextSnaps = { ...s.snapshots };
          delete nextSnaps[productId];
          return { snapshots: nextSnaps };
        }),
      acknowledge: (productId) =>
        set((s) => {
          const snap = s.snapshots[productId];
          if (!snap) return s;
          const last = snap.entries[snap.entries.length - 1];
          if (!last) return s;
          return {
            snapshots: {
              ...s.snapshots,
              [productId]: { ...snap, entries: [last] },
            },
          };
        }),
      snooze: (productId, untilMs) =>
        set((s) => {
          const next = { ...s.snoozes };
          if (untilMs <= Date.now()) delete next[productId];
          else next[productId] = untilMs;
          return { snoozes: next };
        }),
      snoozeUntil: (productId, now = Date.now()) => {
        const t = get().snoozes[productId];
        if (!t || t <= now) return null;
        return t;
      },
      reset: () => set({ snapshots: {}, snoozes: {} }),
    }),
    {
      name: 'tony.price-watch',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted, fromVersion) => {
        if (fromVersion < 2 && persisted && typeof persisted === 'object') {
          const legacy = persisted as {
            snapshots?: Record<
              string,
              { productId: string; amount: number; currency: PriceSnapshot['currency']; at: number; prevAmount: number | null }
            >;
            threshold?: number;
          };
          const oldSnaps = legacy.snapshots ?? {};
          const next: Record<string, PriceSnapshot> = {};
          for (const [id, s] of Object.entries(oldSnaps)) {
            const entries: PriceObservation[] = [];
            if (s.prevAmount != null) {
              // Approximate: place prev a few hours before current.
              entries.push({ at: Math.max(0, s.at - 60 * 60 * 1000), amount: s.prevAmount });
            }
            entries.push({ at: s.at, amount: s.amount });
            next[id] = { productId: s.productId, currency: s.currency, entries };
          }
          return { snapshots: next, threshold: legacy.threshold ?? DEFAULT_THRESHOLD } as Partial<PriceWatchState>;
        }
        return persisted as Partial<PriceWatchState>;
      },
    },
  ),
);
