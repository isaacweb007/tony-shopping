'use client';

import { useTranslations } from 'next-intl';
import { Flame, TrendingUp, type LucideIcon } from 'lucide-react';
import { useRouter } from '@/i18n/routing';

interface Pick {
  /** i18n key suffix under home.picks.* */
  id: string;
  query: string;
  emoji?: string;
  tone: 'hot' | 'rising';
}

/**
 * Curated "Tony's editor picks" — opinionated seed queries Tony wants
 * to highlight this week. Hand-edited list, refreshed periodically.
 *
 * Why not auto-trending: we don't aggregate user queries server-side
 * yet (would need usage analytics). Curated is fine until traffic
 * justifies a popularity counter.
 */
const PICKS: Pick[] = [
  { id: 'airpodsPro', query: 'AirPods Pro 2 USB-C', emoji: '🎧', tone: 'hot' },
  { id: 'dyson', query: 'Dyson Airwrap', emoji: '💇', tone: 'hot' },
  { id: 'airfryer', query: '필립스 에어프라이어', emoji: '🍳', tone: 'rising' },
  { id: 'monitor', query: '4K 모니터 27인치', emoji: '🖥', tone: 'rising' },
  { id: 'roborock', query: 'Roborock S8 Pro Ultra', emoji: '🤖', tone: 'rising' },
  { id: 'mattress', query: '시몬스 매트리스 퀸', emoji: '🛏', tone: 'hot' },
];

const TONE_META: Record<Pick['tone'], { icon: LucideIcon; pillClass: string }> = {
  hot: {
    icon: Flame,
    pillClass:
      'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300',
  },
  rising: {
    icon: TrendingUp,
    pillClass:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
};

/**
 * "Tony's editor picks" — featured seed queries the home page promotes
 * to give users a click-to-start surface when they don't have anything
 * specific in mind. Sits below BrowseCategories.
 *
 * Layout: horizontal scroll on mobile, grid on md+. Each card is a
 * single tappable button to /search?q=<seed>.
 */
export function EditorPicks() {
  const t = useTranslations('home.picks');
  const router = useRouter();

  return (
    <section className="mt-10" aria-label={t('aria')}>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 text-[10.5px] font-bold tracking-wider text-white dark:bg-white dark:text-ink-900">
        <Flame className="h-3 w-3" strokeWidth={2.4} />
        {t('label')}
      </div>
      <h2 className="mt-2 text-[18px] font-extrabold tracking-tighter2 md:text-[22px]">
        {t('headline')}
      </h2>
      <p className="mt-0.5 text-[12.5px] text-ink-500 dark:text-ink-400">
        {t('subtitle')}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
        {PICKS.map((p) => {
          const meta = TONE_META[p.tone];
          const Icon = meta.icon;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => router.push(`/search?q=${encodeURIComponent(p.query)}`)}
              className="group/pick flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-card dark:border-ink-800 dark:bg-ink-900 dark:hover:border-accent-600"
            >
              <span aria-hidden="true" className="text-[28px] leading-none">
                {p.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-widest ${meta.pillClass}`}
                >
                  <Icon className="h-2.5 w-2.5" strokeWidth={2.6} />
                  {t(`tone.${p.tone}`)}
                </div>
                <div className="mt-1 text-[13.5px] font-bold leading-snug tracking-tight text-ink-900 dark:text-ink-50">
                  {t(`item.${p.id}`)}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-ink-500 dark:text-ink-400">
                  {p.query}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
