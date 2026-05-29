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

type StreamPhase =
  | { phase: 'fast'; result: SearchResult }
  | { phase: 'refined'; result: SearchResult }
  | { phase: 'error'; message: string };

/**
 * Stream search results as two phases (fast Jaccard → LLM-refined). Calls
 * `onResult` for each successful phase as it arrives, then resolves with
 * the final (refined) result. Reads the NDJSON body chunk-by-chunk so the
 * UI can paint the fast phase ~2-3 s before the refined phase lands.
 *
 * Falls back to the non-streaming endpoint if the stream errors before any
 * result arrives (e.g. a proxy that buffers / strips the stream).
 */
export async function searchProductsStream(
  q: string,
  onResult: (result: SearchResult, phase: 'fast' | 'refined') => void,
  signal?: AbortSignal,
  locale?: 'ko' | 'en' | 'vi',
): Promise<SearchResult> {
  const url = new URL('/api/search/stream', window.location.origin);
  url.searchParams.set('q', q);
  if (locale) url.searchParams.set('locale', locale);

  const res = await fetch(url.toString(), { signal });
  if (!res.ok || !res.body) {
    // Stream unavailable — fall back to the one-shot endpoint.
    const result = await searchProducts(q, signal, locale);
    onResult(result, 'refined');
    return result;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let last: SearchResult | null = null;
  let sawAny = false;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let msg: StreamPhase;
      try {
        msg = JSON.parse(line) as StreamPhase;
      } catch {
        continue;
      }
      if (msg.phase === 'error') {
        if (!sawAny) {
          // Nothing rendered yet — fall back to one-shot.
          const result = await searchProducts(q, signal, locale);
          onResult(result, 'refined');
          return result;
        }
        // Already have a fast result; keep it.
        break;
      }
      sawAny = true;
      last = msg.result;
      onResult(msg.result, msg.phase);
    }
  }

  if (!last) {
    const result = await searchProducts(q, signal, locale);
    onResult(result, 'refined');
    return result;
  }
  return last;
}
