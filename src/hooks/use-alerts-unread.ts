'use client';

/**
 * useAlertsUnread — derives the number of price-drop alerts whose latest
 * observation timestamp is newer than the user's last visit to /alerts.
 *
 * The "last seen" timestamp lives in localStorage under tony.alerts.lastSeen
 * (single integer, ms since epoch). We use a synthetic `storage` event to
 * notify *same-tab* listeners when markAlertsSeen() updates it — the native
 * storage event only fires across tabs.
 *
 * SSR-safe: lastSeen starts at 0 server-side, so the badge mounts to 0
 * before the client effect reads localStorage. That matches the header's
 * existing hydration pattern (shortlistCount).
 */
import * as React from 'react';
import { useShortlistStore } from '@/stores/shortlist-store';
import { usePriceWatchStore } from '@/stores/price-watch-store';
import { buildAlerts } from '@/lib/alerts/build-alerts';

const KEY = 'tony.alerts.lastSeen';

function readLastSeen(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function useAlertsUnread(): number {
  const items = useShortlistStore((s) => s.items);
  const snapshots = usePriceWatchStore((s) => s.snapshots);
  const threshold = usePriceWatchStore((s) => s.threshold);

  const [lastSeen, setLastSeen] = React.useState<number>(0);
  React.useEffect(() => {
    setLastSeen(readLastSeen());
    function onUpdate(e: StorageEvent) {
      if (e.key === KEY) setLastSeen(Number(e.newValue) || 0);
    }
    window.addEventListener('storage', onUpdate);
    return () => window.removeEventListener('storage', onUpdate);
  }, []);

  return React.useMemo(() => {
    const rows = buildAlerts({
      snaps: Object.values(items),
      snapshots,
      threshold,
    });
    let count = 0;
    for (const r of rows) {
      if (r.status !== 'drop') continue;
      const last = r.watch?.entries[r.watch.entries.length - 1];
      if (!last) continue;
      if (last.at > lastSeen) count += 1;
    }
    return count;
  }, [items, snapshots, threshold, lastSeen]);
}

/**
 * Stamp localStorage with the current time so the unread count drops back
 * to zero. Called from AlertsView on mount.
 *
 * Dispatches a synthetic StorageEvent so the same-tab header badge
 * updates without waiting for the next remount.
 */
export function markAlertsSeen(): void {
  if (typeof window === 'undefined') return;
  const value = String(Date.now());
  try {
    window.localStorage.setItem(KEY, value);
    window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: value }));
  } catch {
    /* private mode — accept that the badge will keep showing */
  }
}
