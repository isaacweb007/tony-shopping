'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ShortlistState {
  ids: string[];
  /** Bulk hydrate from a server response (called once after sign-in). */
  hydrateFromServer: (ids: string[]) => void;
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
}

export const useShortlistStore = create<ShortlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      hydrateFromServer: (incoming) =>
        set((s) => {
          // Union: keep local additions made offline + everything from the server.
          const set2 = new Set([...incoming, ...s.ids]);
          return { ids: Array.from(set2) };
        }),
      toggle: (id) =>
        set((s) => ({
          ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id],
        })),
      has: (id) => get().ids.includes(id),
      clear: () => set({ ids: [] }),
    }),
    {
      name: 'tony.shortlist',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
