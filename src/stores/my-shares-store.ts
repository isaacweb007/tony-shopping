'use client';

/**
 * Per-device ledger of cohort slugs the user created via /api/cohort/create.
 *
 * Cohort shares are anonymous server-side, so this is the only way to
 * give the user a "my shares" view without inventing auth coupling.
 * Capped at MAX_ENTRIES so a power user's localStorage doesn't grow
 * unbounded; oldest entries fall off the end.
 *
 * Used by the /dashboard MySharesCard and (eventually) a "my shares"
 * filter chip on /cohorts.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const MAX_ENTRIES = 50;

interface MySharesState {
  /** Newest first. */
  slugs: string[];
  add: (slug: string) => void;
  clear: () => void;
}

export const useMySharesStore = create<MySharesState>()(
  persist(
    (set) => ({
      slugs: [],
      add: (slug) =>
        set((s) => {
          if (s.slugs.includes(slug)) return s;
          return { slugs: [slug, ...s.slugs].slice(0, MAX_ENTRIES) };
        }),
      clear: () => set({ slugs: [] }),
    }),
    {
      name: 'tony.my-shares',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
