'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { SearchQuery } from '@/types/search';

export interface HistoryEntry {
  id: string;
  q: string;
  attachmentLabels: string[];
  createdAt: number;
}

interface HistoryState {
  entries: HistoryEntry[];
  add: (query: SearchQuery) => HistoryEntry;
  remove: (id: string) => void;
  clear: () => void;
}

const MAX_ENTRIES = 30;

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      add: (query) => {
        const entry: HistoryEntry = {
          id: nanoid(8),
          q: query.q,
          attachmentLabels: query.attachments.map((a) => a.label),
          createdAt: Date.now(),
        };
        set((s) => ({
          entries: [entry, ...s.entries.filter((e) => e.q !== entry.q)].slice(0, MAX_ENTRIES),
        }));
        return entry;
      },
      remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: 'tony.history',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
