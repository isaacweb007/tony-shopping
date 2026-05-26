'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { nanoid } from 'nanoid';
import { haptic } from '@/lib/haptic';
import { cn } from '@/lib/utils';

interface Props {
  slug: string;
}

type Kind = 'up' | 'down';

interface Tally {
  up: number;
  down: number;
  you: Kind | null;
}

const VOTER_KEY = 'tony.cohort.voter';

function getVoterHash(): string {
  if (typeof window === 'undefined') return '';
  let v = window.localStorage.getItem(VOTER_KEY);
  if (!v) {
    v = nanoid(16);
    try {
      window.localStorage.setItem(VOTER_KEY, v);
    } catch {
      /* private mode */
    }
  }
  return v;
}

/**
 * Anonymous 👍 / 👎 row on a publicly-shared compare cohort page.
 * Reads the tally + the visitor's own vote (when present); flipping the
 * vote upserts, tapping again retracts.
 */
export function CohortReactions({ slug }: Props) {
  const t = useTranslations('cohortReactions');
  const qc = useQueryClient();
  const [voterHash, setVoterHash] = React.useState('');
  React.useEffect(() => setVoterHash(getVoterHash()), []);

  const tally = useQuery({
    queryKey: ['cohort-reactions', slug, voterHash],
    enabled: !!voterHash,
    staleTime: 30_000,
    queryFn: async (): Promise<Tally> => {
      const u = new URL(`/api/cohort/${slug}/react`, window.location.origin);
      if (voterHash) u.searchParams.set('voterHash', voterHash);
      const res = await fetch(u.toString(), { cache: 'no-store' });
      if (!res.ok) {
        // 503 = supabase unconfigured; degrade silently
        return { up: 0, down: 0, you: null };
      }
      return (await res.json()) as Tally;
    },
  });

  const mut = useMutation({
    mutationFn: async (kind: Kind | null) => {
      const res = await fetch(`/api/cohort/${slug}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterHash, kind }),
      });
      if (!res.ok && res.status !== 503) throw new Error('react failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cohort-reactions', slug] }),
  });

  if (!voterHash || (tally.isError && !tally.data)) return null;

  const t1 = tally.data ?? { up: 0, down: 0, you: null };

  function toggle(kind: Kind) {
    haptic('tap');
    const next = t1.you === kind ? null : kind;
    mut.mutate(next);
  }

  return (
    <div
      className="mt-6 flex items-center gap-3 rounded-2xl border border-ink-200 bg-white/60 px-4 py-3 dark:border-ink-800 dark:bg-ink-900/60"
      role="group"
      aria-label={t('aria')}
    >
      <span className="text-[11.5px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
        {t('label')}
      </span>
      <ReactBtn
        active={t1.you === 'up'}
        kind="up"
        count={t1.up}
        onClick={() => toggle('up')}
        label={t('up')}
      />
      <ReactBtn
        active={t1.you === 'down'}
        kind="down"
        count={t1.down}
        onClick={() => toggle('down')}
        label={t('down')}
      />
    </div>
  );
}

function ReactBtn({
  active,
  kind,
  count,
  onClick,
  label,
}: {
  active: boolean;
  kind: Kind;
  count: number;
  onClick: () => void;
  label: string;
}) {
  const Icon = kind === 'up' ? ThumbsUp : ThumbsDown;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-bold tracking-tight transition',
        active
          ? kind === 'up'
            ? 'border-emerald-400 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-500'
            : 'border-red-400 bg-red-500 text-white dark:border-red-400 dark:bg-red-500'
          : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-ink-600',
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {count}
    </button>
  );
}
