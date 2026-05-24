'use client';

/**
 * Per-device price watch ledger.
 *
 * For every product in the user's compare list we keep:
 *   - the most recent observed final price (amount + currency)
 *   - the timestamp of that observation
 *
 * On every fresh search, the store reconciles results against this ledger. If
 * a watched product's price dropped meaningfully (default 5%), the UI surfaces
 * a toast + the compare drawer shows a ▼-N% indicator.
 *
 * Phase 5 (Supabase) will mirror this to a server so the watch survives
 * cross-device. For now it's purely local + best-effort.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/types/product';

export interface PriceSnapshot {
  productId: string;
  amount: number;
  currency: 'KRW' | 'USD' | 'VND' | 'JPY';
  /** ms since epoch. */
  at: number;
  /** Last *previous* recorded amount (or null). Used to render ▼ deltas. */
  prevAmount: number | null;
}

interface PriceWatchState {
  snapshots: Record<string, PriceSnapshot>;
  /** Threshold ratio: a drop ≥ DROP_THRESHOLD triggers a toast. */
  threshold: number;
  /** Returns the delta vs prevAmount as a signed ratio (-0.08 = down 8%). */
  delta: (productId: string) => number | null;
  /**
   * Take a fresh observation for the given products.
   * Returns the list of products whose price dropped past the threshold.
   */
  observe: (products: Product[]) => Product[];
  setThreshold: (t: number) => void;
  reset: () => void;
}

const DEFAULT_THRESHOLD = 0.05;

export const usePriceWatchStore = create<PriceWatchState>()(
  persist(
    (set, get) => ({
      snapshots: {},
      threshold: DEFAULT_THRESHOLD,

      delta: (productId) => {
        const snap = get().snapshots[productId];
        if (!snap || snap.prevAmount === null || snap.prevAmount === 0) return null;
        return (snap.amount - snap.prevAmount) / snap.prevAmount;
      },

      observe: (products) => {
        const { snapshots, threshold } = get();
        const next = { ...snapshots };
        const dropped: Product[] = [];

        for (const p of products) {
          const prev = next[p.id];
          const newAmount = p.finalPrice.amount;
          if (!prev) {
            next[p.id] = {
              productId: p.id,
              amount: newAmount,
              currency: p.finalPrice.currency,
              at: Date.now(),
              prevAmount: null,
            };
            continue;
          }
          // Same currency required; if currency changed, reset baseline.
          if (prev.currency !== p.finalPrice.currency) {
            next[p.id] = {
              productId: p.id,
              amount: newAmount,
              currency: p.finalPrice.currency,
              at: Date.now(),
              prevAmount: null,
            };
            continue;
          }
          if (prev.amount === newAmount) continue;

          const ratio = (newAmount - prev.amount) / prev.amount;
          next[p.id] = {
            productId: p.id,
            amount: newAmount,
            currency: p.finalPrice.currency,
            at: Date.now(),
            prevAmount: prev.amount,
          };
          if (ratio <= -threshold) dropped.push(p);
        }
        set({ snapshots: next });
        return dropped;
      },

      setThreshold: (t) => set({ threshold: Math.max(0, Math.min(0.5, t)) }),
      reset: () => set({ snapshots: {} }),
    }),
    {
      name: 'tony.price-watch',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
