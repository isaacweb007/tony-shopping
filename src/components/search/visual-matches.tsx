'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink, ScanSearch } from 'lucide-react';
import { useVisualMatches } from '@/hooks/use-visual-matches';
import { affiliateUrl } from '@/lib/affiliate';
import { mapSourceToStore } from '@/lib/search/store-map';
import type { LensMatch } from '@/lib/search/lens-map';

/**
 * "이 사진으로 찾은 실제 판매처" — reverse-image (Google Lens) matches for the
 * source SNS thumbnail. This is the path closest to the app's intent: instead
 * of guessing keywords, it surfaces the actual pages selling the exact product
 * in the photo.
 *
 * Renders nothing while loading-with-no-data, on error, or when there are no
 * matches (e.g. SERPAPI_KEY unset) — so a normal keyword search is unaffected.
 */
export function VisualMatches({ imageUrl }: { imageUrl: string | null }) {
  const t = useTranslations('search.visualMatches');
  const { data, isError } = useVisualMatches(imageUrl);

  if (!imageUrl || isError) return null;
  const matches = data?.matches ?? [];
  if (matches.length === 0) return null;

  return (
    <section className="mt-6 rounded-3xl border border-accent-200/70 bg-gradient-to-br from-accent-50/60 via-white to-sky-50/40 p-4 shadow-sm dark:border-accent-800/40 dark:from-accent-950/30 dark:via-ink-900 dark:to-sky-950/20 md:p-5">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-600 text-white shadow-sm">
          <ScanSearch className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </span>
        <div>
          <h2 className="text-[15px] font-extrabold tracking-tight md:text-[17px]">{t('title')}</h2>
          <p className="text-[11.5px] text-ink-500 dark:text-ink-400">
            {t('subtitle', { n: matches.length })}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {matches.slice(0, 9).map((m, i) => (
          <MatchCard key={`${m.link}-${i}`} match={m} t={t} />
        ))}
      </div>
    </section>
  );
}

function MatchCard({
  match,
  t,
}: {
  match: LensMatch;
  t: ReturnType<typeof useTranslations<'search.visualMatches'>>;
}) {
  // Wrap the outbound link with our affiliate tag when the merchant is one we
  // partner with (no-op for unknown sources), so Lens results monetize like the
  // rest of the app instead of leaking the click untagged.
  const href = affiliateUrl({ store: mapSourceToStore(match.source), url: match.link });
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener sponsored"
      className="group/m flex items-stretch gap-3 overflow-hidden rounded-2xl border border-ink-200 bg-white p-2.5 transition hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-card dark:border-ink-800 dark:bg-ink-900 dark:hover:border-accent-600"
    >
      {match.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={match.thumbnail}
          alt=""
          className="h-16 w-16 shrink-0 rounded-xl bg-ink-50 object-cover dark:bg-ink-800"
          loading="lazy"
        />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-xl bg-ink-100 dark:bg-ink-800" />
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-semibold text-ink-500 dark:text-ink-400">
            {match.source}
          </div>
          <div className="mt-0.5 line-clamp-2 text-[12.5px] font-bold leading-snug tracking-tight text-ink-900 dark:text-ink-50">
            {match.title}
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          {match.priceText ? (
            <span className="text-[13px] font-extrabold tracking-tight text-accent-700 dark:text-accent-300">
              {match.priceText}
            </span>
          ) : (
            <span className="text-[11px] text-ink-400 dark:text-ink-500">{t('viewPage')}</span>
          )}
          <ExternalLink
            className="h-3.5 w-3.5 shrink-0 text-ink-400 transition-transform group-hover/m:translate-x-0.5 dark:text-ink-500"
            strokeWidth={1.9}
          />
        </div>
      </div>
    </a>
  );
}
