'use client';

/**
 * Per-device set of cohort slugs the visitor has actually opened
 * (clicked into /c/{slug}). Lets the /cohorts gallery + the /compare
 * "다른 사람들의 비교" footer subtly de-emphasize already-seen cards
 * so unvisited ones stand out.
 *
 * Cap MAX_ENTRIES via FIFO so localStorage doesn't grow without bound
 * for a heavy gallery browser. The order is preservation by insertion;
 * we don't track recency beyond "have I seen this".
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const MAX_ENTRIES = 200;

interface VisitedCohortsState {
  slugs: string[];
  mark: (slug: string) => void;
  has: (slug: string) => boolean;
  clear: () => void;
}

export const useVisitedCohortsStore = create<VisitedCohortsState>()(
  persist(
    (set, get) => ({
      slugs: [],
      mark: (slug) =>
        set((s) => {
          if (s.slugs.includes(slug)) return s;
          // Newest first so the FIFO trim drops the oldest visited slug.
          return { slugs: [slug, ...s.slugs].slice(0, MAX_ENTRIES) };
        }),
      has: (slug) => get().slugs.includes(slug),
      clear: () => set({ slugs: [] }),
    }),
    {
      name: 'tony.visited-cohorts',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
