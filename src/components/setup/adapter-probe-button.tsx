'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Play } from 'lucide-react';

/**
 * Per-adapter probe — fires /api/search?q=…&only=<storeId> so just one
 * adapter runs through the runner. Stats land in the per-process map;
 * we router.refresh() so the /setup card paints the fresh numbers
 * without a full page reload.
 *
 * Generic sample query "shoes" — same shape as the global probe, just
 * narrowed via the only= filter.
 */
const SAMPLE_QUERY = 'shoes';

interface Props {
  /** The exact StoreId — passed to ?only=. */
  storeId: string;
}

type Status = 'idle' | 'running' | 'ok' | 'error';

export function AdapterProbeButton({ storeId }: Props) {
  const t = useTranslations('setup.probe');
  const router = useRouter();
  const [status, setStatus] = React.useState<Status>('idle');

  async function run() {
    setStatus('running');
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(SAMPLE_QUERY)}&only=${encodeURIComponent(storeId)}`,
        { cache: 'no-store' },
      );
      if (!res.ok) throw new Error('failed');
      await res.json();
      setStatus('ok');
      router.refresh();
    } catch {
      setStatus('error');
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={status === 'running'}
      className="inline-flex h-7 items-center gap-1 rounded-md border border-ink-200 bg-white px-2 text-[10.5px] font-bold tracking-tight text-ink-700 transition hover:border-accent-300 hover:text-accent-700 disabled:cursor-wait disabled:opacity-60 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-accent-500 dark:hover:text-accent-300"
      title={t('button')}
    >
      {status === 'running' ? (
        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.2} />
      ) : (
        <Play className="h-2.5 w-2.5" strokeWidth={2.4} />
      )}
      {t('button')}
    </button>
  );
}
