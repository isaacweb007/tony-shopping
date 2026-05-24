'use client';

import { create } from 'zustand';
import { nanoid } from 'nanoid';

export type ToastVariant = 'info' | 'success' | 'error' | 'warning';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** ms before auto-dismiss. 0 = persistent. */
  durationMs: number;
}

interface ToastState {
  items: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (t) => {
    const id = nanoid(8);
    set((s) => ({ items: [...s.items, { id, ...t }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
  clear: () => set({ items: [] }),
}));

/** Convenience API — usable from anywhere, including non-React code. */
export const toast = {
  info(title: string, description?: string, durationMs = 4000) {
    return useToastStore.getState().push({ title, description, variant: 'info', durationMs });
  },
  success(title: string, description?: string, durationMs = 3000) {
    return useToastStore.getState().push({ title, description, variant: 'success', durationMs });
  },
  warning(title: string, description?: string, durationMs = 5000) {
    return useToastStore.getState().push({ title, description, variant: 'warning', durationMs });
  },
  error(title: string, description?: string, durationMs = 6000) {
    return useToastStore.getState().push({ title, description, variant: 'error', durationMs });
  },
  dismiss(id: string) {
    useToastStore.getState().dismiss(id);
  },
};
