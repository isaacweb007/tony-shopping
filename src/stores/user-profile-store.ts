'use client';

/**
 * Persisted, anonymous, per-device user profile.
 *
 * The shop only learns "Tony" patterns locally — no server roundtrip. This is
 * deliberate until Phase 5 introduces authenticated accounts; we want the chat
 * panel and prompt chips to feel personal from minute one without asking the
 * user to sign in.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StoreId, CountryCode } from '@/types/product';

export type PriceBucket = 'low' | 'mid' | 'high';

export interface UserProfile {
  searchCount: number;
  categories: Record<string, number>;
  stores: Partial<Record<StoreId, number>>;
  priceBuckets: Record<PriceBucket, number>;
  countries: Partial<Record<CountryCode, number>>;
  /** Last 20 queries, newest first, deduplicated. */
  recentQueries: string[];
  /** ms since epoch when the profile was last updated. */
  lastUpdated: number;
}

interface UserProfileState {
  profile: UserProfile;
  recordSearch: (input: {
    q: string;
    categories?: string[];
    stores?: StoreId[];
    countries?: CountryCode[];
    priceBucket?: PriceBucket;
  }) => void;
  topCategories: (n?: number) => string[];
  topStores: (n?: number) => StoreId[];
  topPriceBucket: () => PriceBucket | null;
  reset: () => void;
}

const EMPTY_PROFILE: UserProfile = {
  searchCount: 0,
  categories: {},
  stores: {},
  priceBuckets: { low: 0, mid: 0, high: 0 },
  countries: {},
  recentQueries: [],
  lastUpdated: 0,
};

function bumpRecord<K extends string>(rec: Record<K, number>, key: K, by = 1): Record<K, number> {
  return { ...rec, [key]: (rec[key] ?? 0) + by };
}

function bumpPartial<K extends string>(
  rec: Partial<Record<K, number>>,
  keys: K[],
  by = 1,
): Partial<Record<K, number>> {
  const next = { ...rec };
  for (const k of keys) next[k] = (next[k] ?? 0) + by;
  return next;
}

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set, get) => ({
      profile: EMPTY_PROFILE,
      recordSearch: ({ q, categories = [], stores = [], countries = [], priceBucket }) =>
        set((s) => {
          const p = s.profile;
          let cats = p.categories;
          for (const c of categories) cats = bumpRecord(cats, c, 1);
          return {
            profile: {
              searchCount: p.searchCount + 1,
              categories: cats,
              stores: bumpPartial(p.stores, stores, 1),
              countries: bumpPartial(p.countries, countries, 1),
              priceBuckets: priceBucket
                ? { ...p.priceBuckets, [priceBucket]: p.priceBuckets[priceBucket] + 1 }
                : p.priceBuckets,
              recentQueries: [q, ...p.recentQueries.filter((x) => x !== q)].slice(0, 20),
              lastUpdated: Date.now(),
            },
          };
        }),
      topCategories: (n = 3) =>
        Object.entries(get().profile.categories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, n)
          .map(([k]) => k),
      topStores: (n = 3) =>
        Object.entries(get().profile.stores)
          .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
          .slice(0, n)
          .map(([k]) => k as StoreId),
      topPriceBucket: () => {
        const buckets = Object.entries(get().profile.priceBuckets) as Array<[PriceBucket, number]>;
        buckets.sort((a, b) => b[1] - a[1]);
        const winner = buckets[0];
        return winner && winner[1] > 0 ? winner[0] : null;
      },
      reset: () => set({ profile: EMPTY_PROFILE }),
    }),
    {
      name: 'tony.profile',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
