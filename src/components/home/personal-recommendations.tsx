'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { usePersonalRecommendations } from '@/hooks/use-personal-recommendations';

/**
 * "당신이 좋아할 만한" — Claude-personalised product suggestions on the
 * home page, derived from the user's local history + click stream.
 *
 * Renders nothing on cold-start (no history) and on Claude failure, so
 * the home page never shows an empty / broken-looking strip. When data
 * lands, fades into a 4-card grid that mirrors the EditorPicks tone
 * (rose hot / emerald rising) but uses an accent gradient so users
 * read it as "for you" not "for everyone".
 */
export function PersonalRecommendations() {
  const t = useTranslations('home.personal');
  const router = useRouter();
  const { data, isLoading } = usePersonalRecommendations();

  // Hide entirely when there's no signal — keeps the home minimal for
  // first-time visitors.
  if (!isLoading && (!data || data.recommendations.length === 0)) return null;

  return (
    <section className="mt-10" aria-label={t('aria')}>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent-600 to-sky-600 px-2.5 py-1 text-[10.5px] font-bold tracking-wider text-white shadow-sm">
        <Sparkles className="h-3 w-3" strokeWidth={2.4} />
        {t('label')}
      </div>
      <h2 className="mt-2 text-[18px] font-extrabold tracking-tighter2 md:text-[22px]">
        {t('headline')}
      </h2>
      <p className="mt-0.5 text-[12.5px] text-ink-500 dark:text-ink-400">
        {t('subtitle')}
      </p>

      {isLoading ? (
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {data!.recommendations.slice(0, 4).map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => router.push(`/search?q=${encodeURIComponent(r.name)}`)}
              className="group/rec relative overflow-hidden rounded-2xl border border-accent-200/60 bg-gradient-to-br from-accent-50/70 via-white to-sky-50/40 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent-400 hover:shadow-card dark:border-accent-800/40 dark:from-accent-950/30 dark:via-ink-900 dark:to-sky-950/20 dark:hover:border-accent-600"
            >
              <div className="flex items-start gap-3">
                {r.emoji && (
                  <span aria-hidden="true" className="text-[28px] leading-none">
                    {r.emoji}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-[13.5px] font-bold leading-snug tracking-tight text-ink-900 dark:text-ink-50">
                    {r.name}
                  </div>
                  <p className="mt-1 line-clamp-3 text-[12px] leading-snug text-ink-600 dark:text-ink-300">
                    {r.reason}
                  </p>
                </div>
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-bold text-accent-700 transition-transform group-hover/rec:translate-x-0.5 dark:text-accent-300">
                {t('cta')}
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function Skeleton() {
  return <div className="h-32 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />;
}
