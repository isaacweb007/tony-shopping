'use client';

import * as React from 'react';
import type { Product } from '@/types/product';
import { useCheckoutGuideStore } from '@/stores/checkout-guide-store';
import { useCheckoutPrefsStore } from '@/stores/checkout-prefs-store';

interface GuardOptions {
  product: Product;
  href: string;
  /**
   * Fires after the user confirms in the modal — typically opens the
   * affiliate URL + records the click. When the user has opted out via
   * "다시 보지 않기", we call this immediately.
   */
  onProceed: () => void;
}

/**
 * Intercept a buy-button click so Tony can show a one-glance checklist
 * before the user leaves the app. When the user has opted out, this is a
 * no-op pass-through.
 */
export function useCheckoutGuide() {
  const open = useCheckoutGuideStore((s) => s.open);
  const dontShow = useCheckoutPrefsStore((s) => s.dontShow);
  const guard = React.useCallback(
    ({ product, href, onProceed }: GuardOptions, e?: React.MouseEvent) => {
      if (dontShow) {
        // Allow the native anchor to navigate / let the caller open the tab.
        onProceed();
        return;
      }
      // Intercept: prevent default so the modal can take over.
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      open({ product, href, onProceed });
    },
    [dontShow, open],
  );
  return { guard };
}
