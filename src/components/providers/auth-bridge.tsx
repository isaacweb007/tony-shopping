'use client';

import * as React from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useShortlistStore } from '@/stores/shortlist-store';
import { fetchServerShortlist } from '@/lib/supabase/sync-shortlist';

/**
 * Subscribes to Supabase auth state changes and mirrors the user into the
 * Zustand auth store. Also pulls server-side state (shortlist) on sign-in so
 * the compare drawer feels device-agnostic. Silent no-op without Supabase.
 */
export function AuthBridge() {
  const setUser = useAuthStore((s) => s.setUser);
  const hydrateShortlist = useShortlistStore((s) => s.hydrateFromServer);

  React.useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    let cancelled = false;

    async function pullServerState() {
      const snaps = await fetchServerShortlist();
      if (!snaps || cancelled) return;
      hydrateShortlist(snaps);
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
