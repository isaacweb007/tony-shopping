'use client';

import { create } from 'zustand';

interface UIState {
  historyOpen: boolean;
  shortlistOpen: boolean;
  chatOpen: boolean;
  setHistoryOpen: (v: boolean) => void;
  setShortlistOpen: (v: boolean) => void;
  setChatOpen: (v: boolean) => void;
  toggleChat: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  historyOpen: false,
  shortlistOpen: false,
  chatOpen: false,
  setHistoryOpen: (v) => set({ historyOpen: v }),
  setShortlistOpen: (v) => set({ shortlistOpen: v }),
  setChatOpen: (v) => set({ chatOpen: v }),
  toggleChat: () => set({ chatOpen: !get().chatOpen }),
}));
