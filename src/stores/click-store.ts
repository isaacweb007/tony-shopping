'use client';

/**
 * Anonymous outbound-click ledger.
 *
 * When the user clicks "Take this one" / "구매하기" we want to know
 *   - which storefront they ended up on
 *   - which Tony tag (BEST / cheap / fast …) drove the click
 *   - how the result compared to the rest (was it the top? bottom?)
 *
 * No PII, no fingerprint — just the product surface signals. Persisted to
 * LocalStorage and POSTed to /api/track in parallel for server-side stats.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { Product, StoreId, TonyTag } from '@/types/product';

export interface ClickEvent {
  id: string;
  /** ms since epoch. */
  at: number;
  productId: string;
  store: StoreId;
  tag: TonyTag;
  /** 0..100 Tony score. */
  score: number;
  /** True if the user clicked through from the VerdictCard (1순위). */
  fromVerdict: boolean;
  /** Query that produced the click. */
  q: string;
}

interface ClickState {
  events: ClickEvent[];
  recordClick: (input: Omit<ClickEvent, 'id' | 'at'>) => ClickEvent;
  clear: () => void;
}

const MAX_EVENTS = 200;

export const useClickStore = create<ClickState>()(
  persist(
    (set) => ({
      events: [],
      recordClick: (input) => {
        const evt: ClickEvent = { id: nanoid(8), at: Date.now(), ...input };
        set((s) => ({ events: [evt, ...s.events].slice(0, MAX_EVENTS) }));
        // Fire-and-forget server beacon. Non-blocking.
        try {
          if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(evt)], { type: 'application/json' });
            navigator.sendBeacon('/api/track', blob);
          } else if (typeof fetch !== 'undefined') {
            fetch('/api/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(evt),
              keepalive: true,
            }).catch(() => {});
          }
        } catch {
          /* never block the outbound click */
        }
        return evt;
      },
      clear: () => set({ events: [] }),
    }),
    {
      name: 'tony.clicks',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

/** Convenience helper for components that have the full Product. */
export function recordProductClick(
  product: Product,
  q: string,
  fromVerdict = false,
): void {
  useClickStore.getState().recordClick({
    productId: product.id,
    store: product.store,
    tag: product.tag,
    score: product.score.total,
    fromVerdict,
    q,
  });
}
