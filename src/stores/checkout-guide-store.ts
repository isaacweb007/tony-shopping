'use client';

import { create } from 'zustand';
import type { Product } from '@/types/product';

interface PendingCheckout {
  product: Product;
  href: string;
  /** Fired once the user confirms — typically opens the affiliate URL + records the click. */
  onProceed: () => void;
}

interface CheckoutGuideState {
  pending: PendingCheckout | null;
  open: (next: PendingCheckout) => void;
  dismiss: () => void;
}

/**
 * Single-pending store so any "Buy" button anywhere on the page can ask Tony
 * to vet the checkout. The CheckoutGuideModal mounted once at app root
 * subscribes here.
 */
export const useCheckoutGuideStore = create<CheckoutGuideState>((set) => ({
  pending: null,
  open: (next) => set({ pending: next }),
  dismiss: () => set({ pending: null }),
}));
