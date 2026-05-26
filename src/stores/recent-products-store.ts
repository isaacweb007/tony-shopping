'use client';

/**
 * Per-device recently-viewed product feed. Lightweight: we only persist
 * what the home-page row needs to paint a card and link back to the full
 * detail view (id, name, store, finalPrice, imageUrl, query, viewedAt).
 *
 * The query is kept so the regenerated /product/[id]?q={query} link can
 * recover the full product on demand — Tony's product page re-runs the
 * search server-side rather than caching individual products.
 *
 * Cap MAX_ENTRIES — when overflowed we drop the oldest. Re-viewing an
 * existing product bumps its viewedAt and moves it to the head.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Money, StoreId, Product } from '@/types/product';

export interface RecentProductSnap {
  id: string;
  name: string;
  store: StoreId;
  finalPrice: Money;
  imageUrl: string;
  /** Query that originally surfaced this product — used to rebuild the URL. */
  query: string;
  viewedAt: number;
}

interface RecentProductsState {
  items: RecentProductSnap[];
  record: (product: Product, query: string) => void;
  clear: () => void;
}

const MAX_ENTRIES = 8;

export const useRecentProductsStore = create<RecentProductsState>()(
  persist(
    (set) => ({
      items: [],
      record: (product, query) =>
        set((state) => {
          // Move-to-head semantics: if the product is already in the list,
          // drop the old entry and let the new one slot in at index 0.
          const trimmed = state.items.filter((it) => it.id !== product.id);
          const snap: RecentProductSnap = {
            id: product.id,
            name: product.name,
            store: product.store,
            finalPrice: product.finalPrice,
            imageUrl: product.imageUrl,
            query,
            viewedAt: Date.now(),
          };
          const next = [snap, ...trimmed].slice(0, MAX_ENTRIES);
          return { items: next };
        }),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'tony.recent-products',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
