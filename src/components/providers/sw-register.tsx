'use client';

import * as React from 'react';

/**
 * Registers /sw.js in production builds. Silent no-op in dev (Next's
 * webpack/hmr already owns the cache layer and a SW would fight it).
 *
 * Registration is fire-and-forget — if it fails, the app still works,
 * just without offline support. We never block render on it.
 */
export function SwRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* nothing useful to do here; surface via DevTools if needed */
      });
    };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    return () => window.removeEventListener('load', onLoad);
  }, []);
  return null;
}
