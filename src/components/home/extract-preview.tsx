'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Eye, Image as ImageIcon, Link2, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ExtractResult {
  suggestedQuery: string;
  /** Additional candidate queries — same shape as `suggestedQuery`, ranked. */
  candidates?: string[];
  source: 'vision' | 'oembed' | 'og' | 'fallback';
  hint?: string;
  tags?: string[];
  image?: string;
}

interface Props {
  result: ExtractResult | null;
  /** Use the primary suggested query and submit. */
  onAccept: () => void;
  /**
   * Pick one of the alternative candidates instead of the primary.
   * Falls back to onAccept-style behavior with the chosen string.
   */
  onSelectCandidate?: (q: string) => void;
  /** Focus the textarea so the user can edit. */
  onEdit: () => void;
  /** Dismiss the preview without submitting. */
  onDismiss: () => void;
  className?: string;
}

const SOURCE_ICON = {
  vision: ImageIcon,
  oembed: Link2,
  og: Link2,
  fallback: Eye,
} as const;

/**
 * "토니가 이렇게 이해했어요" — shown right after a link is pasted or an image
 * is uploaded, before the user commits to a search. Lets them sanity-check
 * the extracted query against the source thumbnail + tags + label so a
 * misread (e.g. Vision called your bag "shoes") gets caught in one glance.
 *
 * When the upstream returned multiple candidates (Claude vision can do this),
 * each alternative renders as a clickable chip below the primary query —
 * one click swaps to that candidate and starts the search.
 */
export function ExtractPreview({
  result,
  onAccept,
  onSelectCandidate,
  onEdit,
  onDismiss,
  className,
}: Props) {
  const t = useTranslations('extract.preview');
  if (!result || !result.suggestedQuery) return null;
  const Icon = SOURCE_ICON[result.source] ?? Eye;

  const candidates = (result.candidates ?? []).filter(
    (c) => c && c !== result.suggestedQuery,
  );

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-accent-200/70 bg-gradient-to-br from-accent-50/70 via-white to-sky-50/40 p-3.5 shadow-sm',
        'dark:border-accent-800/40 dark:from-accent-950/30 dark:via-ink-900 dark:to-sky-950/20',
        className,
      )}
      role="region"
      aria-label={t('aria')}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t('dismissAria')}
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 dark:text-ink-500 dark:hover:bg-ink-800 dark:hover:text-ink-200"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.2} />
      </button>

      <div className="flex items-start gap-3">
        {result.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={result.image}
            alt=""
            className="h-16 w-16 shrink-0 rounded-xl border border-ink-200 bg-ink-50 object-cover dark:border-ink-700 dark:bg-ink-800"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-ink-200 bg-ink-50 text-ink-400 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-500">
            <Icon className="h-6 w-6" strokeWidth={1.6} />
          </div>
        )}

        <div className="min-w-0 flex-1 pr-6">
          <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest text-accent-700 dark:text-accent-300">
            <Icon className="h-3 w-3" strokeWidth={2.4} />
            {t(`source.${result.source}` as 'source.vision')}
          </div>
          <div className="mt-1 line-clamp-2 text-[13.5px] font-semibold leading-snug tracking-tight text-ink-900 dark:text-ink-50">
            {result.suggestedQuery}
          </div>

          {candidates.length > 0 && onSelectCandidate && (
            <div className="mt-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400 dark:text-ink-500">
                {t('candidatesLabel')}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {candidates.slice(0, 3).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onSelectCandidate(c)}
                    className="group/chip max-w-full rounded-md border border-accent-200 bg-white px-2 py-0.5 text-left text-[11px] font-semibold text-accent-700 transition hover:border-accent-400 hover:bg-accent-50 dark:border-accent-800/60 dark:bg-ink-900 dark:text-accent-300 dark:hover:border-accent-600 dark:hover:bg-accent-950/40"
                    title={t('useCandidate', { q: c })}
                  >
                    <span className="line-clamp-1">{c}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {result.tags && result.tags.length > 0 && candidates.length === 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {result.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-ink-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-ink-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={onAccept}
          className="h-9 rounded-lg text-[12.5px] font-bold"
        >
          {t('accept')}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="h-9 rounded-lg px-3 text-[12.5px]"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
          {t('edit')}
        </Button>
      </div>
    </div>
  );
}
