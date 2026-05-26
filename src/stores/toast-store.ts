'use client';

import { create } from 'zustand';
import { nanoid } from 'nanoid';

export type ToastVariant = 'info' | 'success' | 'error' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** ms before auto-dismiss. 0 = persistent. */
  durationMs: number;
  /** Optional inline CTA — rendered as a pill button on the toast. */
  action?: ToastAction;
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

interface ToastOptions {
  description?: string;
  durationMs?: number;
  action?: ToastAction;
}

/**
 * Resolve the (description?, durationMs?, action?) overload into the canonical
 * options shape. Keeps the existing positional call-sites working
 * (toast.success("title")) while letting new call-sites pass an
 * options object: toast.success("title", { action: {…} }).
 */
function resolveOpts(arg2: string | ToastOptions | undefined, arg3?: number): ToastOptions {
  if (arg2 == null) return {};
  if (typeof arg2 === 'string') return { description: arg2, durationMs: arg3 };
  return arg2;
}

/** Convenience API — usable from anywhere, including non-React code. */
export const toast = {
  info(title: string, arg2?: string | ToastOptions, arg3?: number) {
    const o = resolveOpts(arg2, arg3);
    return useToastStore.getState().push({
      title,
      description: o.description,
      action: o.action,
      variant: 'info',
      durationMs: o.durationMs ?? 4000,
    });
  },
  success(title: string, arg2?: string | ToastOptions, arg3?: number) {
    const o = resolveOpts(arg2, arg3);
    return useToastStore.getState().push({
      title,
      description: o.description,
      action: o.action,
      variant: 'success',
      durationMs: o.durationMs ?? 3000,
    });
  },
  warning(title: string, arg2?: string | ToastOptions, arg3?: number) {
    const o = resolveOpts(arg2, arg3);
    return useToastStore.getState().push({
      title,
      description: o.description,
      action: o.action,
      variant: 'warning',
      durationMs: o.durationMs ?? 5000,
    });
  },
  error(title: string, arg2?: string | ToastOptions, arg3?: number) {
    const o = resolveOpts(arg2, arg3);
    return useToastStore.getState().push({
      title,
      description: o.description,
      action: o.action,
      variant: 'error',
      durationMs: o.durationMs ?? 6000,
    });
  },
  dismiss(id: string) {
    useToastStore.getState().dismiss(id);
  },
};
