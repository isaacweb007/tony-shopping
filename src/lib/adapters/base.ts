/**
 * Search adapter contract.
 *
 * Every storefront (Coupang, Amazon, Shopee, Lazada, Naver, ...) exposes a
 * different API surface. We normalise everything to {@link Product}.
 *
 * Phase 4: all implementations are mocks. Phase 5+ swaps these with real HTTPS
 * calls using affiliate/partner keys from `process.env`.
 */
import type { Product, StoreId, CountryCode } from '@/types/product';

export interface SearchInput {
  q: string;
  /** Optional image dataURL or remote URL. Phase 4 ignores; Phase 5 uses vision API. */
  imageUrl?: string;
  /** Optional external link (SNS / shop). Phase 4 ignores; Phase 5 fetches OG meta. */
  link?: string;
  /** Limit per adapter. */
  limit?: number;
  /** Country preference (affects which adapters/items are prioritised). */
  country?: CountryCode;
  /** Per-request abort signal. */
  signal?: AbortSignal;
}

export interface SearchAdapter {
  readonly id: StoreId;
  /** Whether this adapter is active under the current env. */
  isEnabled(): boolean;
  /** Return normalised products. Must not throw on empty result — return `[]`. */
  search(input: SearchInput): Promise<Product[]>;
}

/** Helper: convert ms duration into AbortError honoring callsite signal. */
export function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) ctrl.abort(signal.reason);
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  const id = setTimeout(() => ctrl.abort(new Error('adapter timeout')), ms);
  // Clean up if either signal aborts first.
  ctrl.signal.addEventListener('abort', () => clearTimeout(id), { once: true });
  return ctrl.signal;
}
