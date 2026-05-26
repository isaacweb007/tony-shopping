'use client';

/**
 * Per-device preferences for /compare. Currently a single field — the last
 * priority chip the user picked manually — so subsequent visits start there
 * instead of always defaulting to 'balanced'. Kept separate from
 * user-profile-store so we don't have to bump its persist version.
 *
 * The "manually" qualifier matters: the auto-priority engine can override
 * a stale pref on its own, but it does NOT write back here. That's intentional
 * — the pref tracks user intent, not the algorithm's guess.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ComparePriorityKey = 'balanced' | 'value' | 'fast' | 'genuine';

interface ComparePrefsState {
  lastPriority: ComparePriorityKey | null;
  setLastPriority: (next: ComparePriorityKey) => void;
  reset: () => void;
}

export const useComparePrefsStore = create<ComparePrefsState>()(
  persist(
    (set) => ({
      lastPriority: null,
      setLastPriority: (next) => set({ lastPriority: next }),
      reset: () => set({ lastPriority: null }),
    }),
    {
      name: 'tony.compare-prefs',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
