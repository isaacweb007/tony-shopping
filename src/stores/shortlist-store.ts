'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product } from '@/types/product';
import type { ShortlistSnap } from '@/types/shortlist';

interface ShortlistState {
  /** Full product snapshots keyed by id so the compare UI survives reloads. */
  items: Record<string, ShortlistSnap>;
  /** Bulk hydrate from a server response (called once after sign-in). */
  hydrateFromServer: (snaps: ShortlistSnap[]) => void;
  /** Insert or overwrite a snapshot. */
  add: (snap: ShortlistSnap) => void;
  /** Add or remove based on current presence. */
  toggle: (product: Product) => boolean;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  list: () => ShortlistSnap[];
  /** Persist a free-text note for an existing snap. No-op if id missing. */
  setNote: (id: string, note: string) => void;
  clear: () => void;
}

function productToSnap(p: Product): ShortlistSnap {
  return {
    id: p.id,
    name: p.name,
    store: p.store,
    imageUrl: p.imageUrl,
    buyUrl: p.buyUrl,
    finalPrice: p.finalPrice,
    shipDays: p.shipDays,
    rating: p.rating,
    reviewCount: p.reviewCount,
    authenticityPct: p.authenticityPct,
    official: p.official,
    tag: p.tag,
    score: p.score,
    addedAt: Date.now(),
  };
}

export const useShortlistStore = create<ShortlistState>()(
  persist(
    (set, get) => ({
      items: {},
      hydrateFromServer: (incoming) =>
        set((s) => {
          // Union: keep local additions made offline + everything from the server.
          // For ids present on both sides, the richer (local) snap wins because
          // the server schema currently only persists a subset of fields.
          const next: Record<string, ShortlistSnap> = {};
          for (const snap of incoming) next[snap.id] = snap;
          for (const [id, snap] of Object.entries(s.items)) next[id] = snap;
          return { items: next };
        }),
      add: (snap) =>
        set((s) => ({ items: { ...s.items, [snap.id]: snap } })),
      toggle: (product) => {
        const present = get().has(product.id);
        if (present) {
          set((s) => {
            const next = { ...s.items };
            delete next[product.id];
            return { items: next };
          });
          return false;
        }
        set((s) => ({ items: { ...s.items, [product.id]: productToSnap(product) } }));
        return true;
      },
      remove: (id) =>
        set((s) => {
          if (!(id in s.items)) return s;
          const next = { ...s.items };
          delete next[id];
          return { items: next };
        }),
      has: (id) => id in get().items,
      list: () =>
        Object.values(get().items).sort((a, b) => b.addedAt - a.addedAt),
      setNote: (id, note) =>
        set((s) => {
          const existing = s.items[id];
          if (!existing) return s;
          const trimmed = note.trim().slice(0, 280);
          // Strip the note entirely when empty so the persist payload stays lean.
          const updated: ShortlistSnap = trimmed
            ? { ...existing, note: trimmed }
            : (() => {
                const { note: _drop, ...rest } = existing;
                return rest;
              })();
          return { items: { ...s.items, [id]: updated } };
        }),
      clear: () => set({ items: {} }),
    }),
    {
      name: 'tony.shortlist',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persisted, fromVersion) => {
        if (fromVersion < 2 && persisted && typeof persisted === 'object') {
          const legacy = persisted as { ids?: string[] };
          // v1 only stored bare ids — we can't reconstruct the snapshots, so
          // drop them. The user re-adds (rare; affects compare drawer only).
          if (Array.isArray(legacy.ids)) {
            return { items: {} } as Partial<ShortlistState>;
          }
        }
        return persisted as Partial<ShortlistState>;
      },
    },
  ),
);
