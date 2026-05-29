'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Money } from '@/types/product';

/**
 * Cumulative savings tracker.
 *
 * Each time the user acts on a Tony recommendation (clicks "buy" on a pick
 * that's cheaper than the market median), we bank the difference. The
 * running total is shown on the home page + dashboard as "토니로 지금까지
 * ₩X 아꼈어요" — the retention + value hook that answers "why bother with
 * Tony" with a number that only grows.
 *
 * Per-currency totals so a KR user's won and an EN user's dollars don't
 * get summed nonsensically. The UI shows the total in the user's active
 * locale currency.
 */
export interface SavingsEvent {
  id: string;
  at: number;
  amount: number;
  currency: Money['currency'];
  productName: string;
}

interface SavingsState {
  events: SavingsEvent[];
  /** Record a realized saving. No-op when amount <= 0. */
  record: (input: { amount: number; currency: Money['currency']; productName: string }) => void;
  /** Total saved in a given currency. */
  totalFor: (currency: Money['currency']) => number;
  /** Number of recorded savings events. */
  count: () => number;
  clear: () => void;
}

const MAX_EVENTS = 500;

export const useSavingsStore = create<SavingsState>()(
  persist(
    (set, get) => ({
      events: [],
      record: ({ amount, currency, productName }) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        const evt: SavingsEvent = {
          id: Math.random().toString(36).slice(2, 10),
          at: Date.now(),
          amount: Math.round(amount),
          currency,
          productName: productName.slice(0, 120),
        };
        set((s) => ({ events: [evt, ...s.events].slice(0, MAX_EVENTS) }));
      },
      totalFor: (currency) =>
        get()
          .events.filter((e) => e.currency === currency)
          .reduce((sum, e) => sum + e.amount, 0),
      count: () => get().events.length,
      clear: () => set({ events: [] }),
    }),
    {
      name: 'tony.savings',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

/**
 * Imperative recorder for use from non-hook contexts (click handlers).
 */
export function recordSaving(input: {
  amount: number;
  currency: Money['currency'];
  productName: string;
}) {
  useSavingsStore.getState().record(input);
}
