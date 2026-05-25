import type { SearchResult } from '@/types/search';

export class SearchApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SearchApiError';
  }
}

/**
 * Fetch search results from the server API.
 *
 * `signal` is forwarded so React Query can cancel inflight requests on
 * query change / unmount.
 */
export async function searchProducts(
  q: string,
  signal?: AbortSignal,
  locale?: 'ko' | 'en' | 'vi',
): Promise<SearchResult> {
  const url = new URL('/api/search', window.location.origin);
  url.searchParams.set('q', q);
  if (locale) url.searchParams.set('locale', locale);
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new SearchApiError(res.status, body.error ?? 'http_' + res.status, body.message ?? res.statusText);
  }
  return (await res.json()) as SearchResult;
}
