'use client';

import type { Product } from '@/types/product';
import type { ShortlistSnap } from '@/types/shortlist';

interface ServerRow {
  product_id: string;
  name: string;
  store: string;
  price_amount: number;
  price_currency: string;
  image_url: string | null;
  buy_url: string | null;
  tony_score: number | null;
  added_at?: string;
}

const ALLOWED_CURRENCIES = new Set(['KRW', 'USD', 'VND', 'JPY']);

function rowToSnap(row: ServerRow): ShortlistSnap {
  const currency = ALLOWED_CURRENCIES.has(row.price_currency)
    ? (row.price_currency as ShortlistSnap['finalPrice']['currency'])
    : 'USD';
  const addedAt = row.added_at ? Date.parse(row.added_at) : Date.now();
  return {
    id: row.product_id,
    name: row.name,
    store: row.store,
    imageUrl: row.image_url ?? undefined,
    buyUrl: row.buy_url ?? undefined,
    finalPrice: { amount: row.price_amount, currency },
    score: row.tony_score != null
      ? {
          total: row.tony_score,
          similarity: row.tony_score,
          priceEdge: row.tony_score,
          reviewTrust: row.tony_score,
          authenticity: row.tony_score,
        }
      : undefined,
    addedAt: Number.isFinite(addedAt) ? addedAt : Date.now(),
  };
}

/** Pull the user's server-side shortlist as snapshots; returns null when not signed in. */
export async function fetchServerShortlist(): Promise<ShortlistSnap[] | null> {
  try {
    const res = await fetch('/api/shortlist', { cache: 'no-store' });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    const j = (await res.json()) as { items?: ServerRow[] };
    return (j.items ?? []).map(rowToSnap);
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
