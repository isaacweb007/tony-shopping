'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface CheckoutPrefsState {
  /** When true, useCheckoutGuide.guard skips the modal entirely. */
  dontShow: boolean;
  setDontShow: (next: boolean) => void;
  reset: () => void;
}

export const useCheckoutPrefsStore = create<CheckoutPrefsState>()(
  persist(
    (set) => ({
      dontShow: false,
      setDontShow: (next) => set({ dontShow: next }),
      reset: () => set({ dontShow: false }),
    }),
    {
      name: 'tony.checkout-prefs',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
