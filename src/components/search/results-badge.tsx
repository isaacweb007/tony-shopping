'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Bot, Radio, Settings2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

interface StatusResponse {
  adapters: Array<{ name: string; label: string; real: boolean; reason: string }>;
  overall: {
    anyRealSearch: boolean;
    liveSearchLabels: string[];
    mockSearchLabels: string[];
    llmReady: boolean;
    visionReady: boolean;
  };
}

/**
 * Renders a small badge telling the user whether the result set they're
 * looking at is real merchant data or deterministic mock. Honest UX > silent
 * fallback. Links to /disclosure (which already explains the data model).
 */
export function ResultsBadge() {
  const t = useTranslations('search.statusBadge');
  const { data } = useQuery({
    queryKey: ['adapter-status'],
    queryFn: async (): Promise<StatusResponse> => {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (!res.ok) throw new Error('status fetch failed');
      return (await res.json()) as StatusResponse;
    },
    staleTime: 60_000,
  });

  if (!data) return null;
  const { overall } = data;

  if (overall.anyRealSearch) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-50/60 px-2.5 py-1 text-[11px] font-bold tracking-tight text-emerald-700',
          'dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300',
        )}
        title={t('liveTitle', { stores: overall.liveSearchLabels.join(', ') })}
      >
        <Radio className="h-3 w-3" strokeWidth={2.4} />
        {t('live', { stores: overall.liveSearchLabels.slice(0, 3).join(' + ') })}
        {overall.llmReady && (
          <span className="ml-1 inline-flex items-center gap-0.5">
            <Bot className="h-3 w-3" strokeWidth={2.4} />
            AI
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      href="/disclosure"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50/60 px-2.5 py-1 text-[11px] font-bold tracking-tight text-amber-800 transition hover:bg-amber-100',
        'dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50',
      )}
      title={t('mockTitle')}
    >
      <Settings2 className="h-3 w-3" strokeWidth={2.4} />
      {t('mock')}
    </Link>
  );
}
