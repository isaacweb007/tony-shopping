'use client';

import type { ServerWatch } from '@/stores/price-watch-store';

interface ObsResponse {
  observations?: Array<{
    productId: string;
    currency: string;
    entries: Array<{ at: number; amount: number }>;
  }>;
}

/**
 * Pull the signed-in user's server-recorded price observations (Tony's cron).
 * Returns null when not signed in / Supabase off, so the caller keeps the
 * LocalStorage-only timeline.
 */
export async function fetchServerObservations(): Promise<ServerWatch[] | null> {
  try {
    const res = await fetch('/api/alerts', { cache: 'no-store' });
    if (!res.ok) return null;
    const j = (await res.json()) as ObsResponse;
    return (j.observations ?? []).map((o) => ({
      productId: o.productId,
      currency: o.currency,
      entries: o.entries,
    }));
  } catch {
    return null;
  }
}
