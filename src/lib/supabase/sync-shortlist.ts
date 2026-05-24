'use client';

import type { Product } from '@/types/product';

interface ServerRow {
  product_id: string;
  name: string;
  store: string;
  price_amount: number;
  price_currency: string;
  image_url: string | null;
  buy_url: string | null;
  tony_score: number | null;
}

/** Pull the user's server-side shortlist; returns null when not signed in. */
export async function fetchServerShortlist(): Promise<ServerRow[] | null> {
  try {
    const res = await fetch('/api/shortlist', { cache: 'no-store' });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    const j = (await res.json()) as { items?: ServerRow[] };
    return j.items ?? [];
  } catch {
    return null;
  }
}

/** Upsert one product. Silent on failure / not signed in. */
export async function pushShortlistItem(product: Product): Promise<void> {
  try {
    await fetch('/api/shortlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: product.id,
        name: product.name,
        store: product.store,
        priceAmount: product.finalPrice.amount,
        priceCurrency: product.finalPrice.currency,
        imageUrl: product.imageUrl,
        buyUrl: product.buyUrl,
        tonyScore: product.score.total,
      }),
      keepalive: true,
    });
  } catch {
    /* offline → LocalStorage continues to act as source of truth */
  }
}

/** Delete one item. Silent on failure. */
export async function deleteShortlistItem(productId: string): Promise<void> {
  try {
    await fetch(`/api/shortlist?id=${encodeURIComponent(productId)}`, {
      method: 'DELETE',
      keepalive: true,
    });
  } catch {
    /* noop */
  }
}
