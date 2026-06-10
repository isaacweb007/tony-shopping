'use client';

import * as React from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useShortlistStore } from '@/stores/shortlist-store';
import { usePriceWatchStore } from '@/stores/price-watch-store';
import { fetchServerShortlist } from '@/lib/supabase/sync-shortlist';
import { fetchServerObservations } from '@/lib/supabase/sync-alerts';

/**
 * Subscribes to Supabase auth state changes and mirrors the user into the
 * Zustand auth store. Also pulls server-side state (shortlist) on sign-in so
 * the compare drawer feels device-agnostic. Silent no-op without Supabase.
 */
export function AuthBridge() {
  const setUser = useAuthStore((s) => s.setUser);
  const hydrateShortlist = useShortlistStore((s) => s.hydrateFromServer);
  const mergeObservations = usePriceWatchStore((s) => s.mergeServerObservations);

  React.useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    let cancelled = false;

    async function pullServerState() {
      const [snaps, observations] = await Promise.all([
        fetchServerShortlist(),
        fetchServerObservations(),
      ]);
      if (cancelled) return;
      if (snaps) hydrateShortlist(snaps);
      if (observations) mergeObservations(observations);
    }

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setUser(data.user ?? null);
      if (data.user) void pullServerState();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' && session?.user) void pullServerState();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
