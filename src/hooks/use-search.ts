'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { searchProductsStream } from '@/lib/api/search-client';
import { useSearchStore } from '@/stores/search-store';
import { useShortlistStore } from '@/stores/shortlist-store';
import { usePriceWatchStore } from '@/stores/price-watch-store';
import { toast } from '@/stores/toast-store';
import type { SearchResult } from '@/types/search';
import type { AppLocale } from '@/i18n/routing';

interface UseSearchReturn {
  data: SearchResult | undefined;
  /** True until the FIRST (fast) result lands — drives the skeleton. */
  isFetching: boolean;
  /** True while the LLM-refined phase is still in flight (fast already shown). */
  isRefining: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * useSearch — streams results from `/api/search/stream` in two phases:
 *   1. fast Jaccard-clustered results (paints the page ~1 s in)
 *   2. LLM-refined results (swaps in seamlessly ~2-3 s later)
 *
 * Mirrors each phase into the Zustand search store so the chat panel and
 * filter UI stay in sync, and reconciles watched-item prices on the final
 * result. Return shape stays compatible with the previous React Query
 * version (data / isFetching / isError / refetch) plus an `isRefining` flag
 * the view can use for a subtle "정밀 분석 중" hint.
 *
 * Empty `q` disables the search.
 */
export function useSearch(q: string): UseSearchReturn {
  const setResult = useSearchStore((s) => s.setResult);
  const watchedItems = useShortlistStore((s) => s.items);
  const observe = usePriceWatchStore((s) => s.observe);
  const tw = useTranslations('watch');
  const locale = useLocale() as AppLocale;

  const [data, setData] = React.useState<SearchResult | undefined>(undefined);
  const [isFetching, setIsFetching] = React.useState(false);
  const [isRefining, setIsRefining] = React.useState(false);
  const [isError, setIsError] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);

  // Keep latest store/reconcile fns in refs so the effect deps stay minimal
  // (q / locale / nonce) and don't re-fire on unrelated store updates.
  const reconcileRef = React.useRef<(r: SearchResult) => void>(() => {});
  reconcileRef.current = (result: SearchResult) => {
    setResult(result);
    const watched = result.products.filter((p) => p.id in watchedItems);
    if (watched.length === 0) return;
    const dropped = observe(watched);
    for (const p of dropped) {
      toast.success(tw('dropTitle'), tw('dropDesc', { name: p.name }));
    }
  };

  React.useEffect(() => {
    if (q.length === 0) {
      setData(undefined);
      setIsFetching(false);
      setIsRefining(false);
      setIsError(false);
      return;
    }

    const ctrl = new AbortController();
    setIsFetching(true);
    setIsRefining(false);
    setIsError(false);
    let gotFast = false;

    searchProductsStream(
      q,
      (result, phase) => {
        if (ctrl.signal.aborted) return;
        setData(result);
        reconcileRef.current(result);
        if (phase === 'fast') {
          gotFast = true;
          setIsFetching(false); // results visible; refining continues
          setIsRefining(true);
        } else {
          setIsRefining(false);
        }
      },
      ctrl.signal,
      locale,
    )
      .then(() => {
        if (ctrl.signal.aborted) return;
        setIsFetching(false);
        setIsRefining(false);
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        // AbortError from a superseded query isn't a real error.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (!gotFast) {
          setIsError(true);
          setIsFetching(false);
        }
        setIsRefining(false);
      });

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, locale, nonce]);

  const refetch = React.useCallback(() => setNonce((n) => n + 1), []);

  return { data, isFetching, isRefining, isError, refetch };
}
