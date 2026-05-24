'use client';

import { create } from 'zustand';
import type { Product } from '@/types/product';
import type { SearchQuery, SearchResult, SortKey, StoreFilter } from '@/types/search';
import { runMockSearch } from '@/lib/mock/products';

interface SearchState {
  result: SearchResult | null;
  sort: SortKey;
  store: StoreFilter;
  loading: boolean;

  /** Local-only fallback (Phase 2). Phase 4+ uses /api/search via React Query. */
  run: (query: SearchQuery) => SearchResult;
  /** Set the result from an external source (e.g. React Query data). */
  setResult: (result: SearchResult) => void;
  setSort: (key: SortKey) => void;
  setStore: (s: StoreFilter) => void;
  /** Computed: sorted+filtered list. Pure function on state. */
  selectVisible: () => Product[];
  reset: () => void;
}

const SORTERS: Record<SortKey, (a: Product, b: Product) => number> = {
  tony: (a, b) => b.score.total - a.score.total,
  price: (a, b) => a.finalPrice.amount - b.finalPrice.amount,
  ship: (a, b) => a.shipDays - b.shipDays,
  review: (a, b) => b.reviewCount - a.reviewCount,
  authentic: (a, b) => b.authenticityPct - a.authenticityPct,
};

export const useSearchStore = create<SearchState>((set, get) => ({
  result: null,
  sort: 'tony',
  store: 'all',
  loading: false,

  run: (query) => {
    set({ loading: true });
    const result = runMockSearch(query);
    set({ result, sort: 'tony', store: 'all', loading: false });
    return result;
  },

  setResult: (result) =>
    set((s) => (s.result?.id === result.id ? s : { result, sort: 'tony', store: 'all' })),

  setSort: (key) => set({ sort: key }),
  setStore: (s) => set({ store: s }),

  selectVisible: () => {
    const { result, sort, store } = get();
    if (!result) return [];
    const arr =
      store === 'all'
        ? [...result.products]
        : result.products.filter((p) => p.store === store);
    arr.sort(SORTERS[sort]);
    return arr;
  },

  reset: () => set({ result: null, sort: 'tony', store: 'all' }),
}));
