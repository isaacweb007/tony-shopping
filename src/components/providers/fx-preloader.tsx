'use client';

import * as React from 'react';
import { preloadFx } from '@/lib/currency';

/** Fires off the FX rate fetch once per session, after first paint. */
export function FxPreloader() {
  React.useEffect(() => {
    void preloadFx();
  }, []);
  return null;
}
