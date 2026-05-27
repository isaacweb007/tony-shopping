'use client';

import { useTranslations } from 'next-intl';
import {
  Footprints,
  ShoppingBag,
  Lamp,
  Shirt,
  Sparkles,
  Cpu,
  Sofa,
  UtensilsCrossed,
  Dumbbell,
  Dog,
  Baby,
  Gem,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import type { Category } from '@/lib/categorize';

interface CategoryDef {
  key: Category;
  icon: LucideIcon;
  /** Curated search query that lands the user on a useful result set. */
  seedQuery: string;
  /** Tailwind tone token. */
  tone: 'accent' | 'amber' | 'emerald' | 'sky' | 'rose' | 'violet';
}

const CATEGORIES: CategoryDef[] = [
  { key: 'electronics', icon: Cpu, seedQuery: 'airpods pro 2', tone: 'accent' },
  { key: 'shoes', icon: Footprints, seedQuery: 'nike air force 1', tone: 'amber' },
  { key: 'bag', icon: ShoppingBag, seedQuery: '여성 미니 백팩', tone: 'rose' },
  { key: 'beauty', icon: Sparkles, seedQuery: '랑콤 마스카라', tone: 'violet' },
  { key: 'clothes', icon: Shirt, seedQuery: '겨울 패딩 자켓', tone: 'sky' },
  { key: 'sports', icon: Dumbbell, seedQuery: '아령 덤벨 세트', tone: 'emerald' },
  { key: 'furniture', icon: Sofa, seedQuery: '거실 소파', tone: 'amber' },
  { key: 'kitchen', icon: UtensilsCrossed, seedQuery: '에어프라이어', tone: 'rose' },
  { key: 'lighting', icon: Lamp, seedQuery: '무드등 LED', tone: 'violet' },
  { key: 'pet', icon: Dog, seedQuery: '강아지 사료', tone: 'emerald' },
  { key: 'baby', icon: Baby, seedQuery: '아기 모빌', tone: 'sky' },
  { key: 'jewelry', icon: Gem, seedQuery: '여성 목걸이', tone: 'accent' },
];

const TONE_STYLES: Record<CategoryDef['tone'], { bg: string; icon: string }> = {
  accent: {
    bg: 'bg-gradient-to-br from-accent-50 to-accent-100/60 dark:from-accent-950/40 dark:to-accent-900/20',
    icon: 'text-accent-700 dark:text-accent-300',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/20',
    icon: 'text-amber-700 dark:text-amber-300',
  },
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/20',
    icon: 'text-emerald-700 dark:text-emerald-300',
  },
  sky: {
    bg: 'bg-gradient-to-br from-sky-50 to-sky-100/60 dark:from-sky-950/40 dark:to-sky-900/20',
    icon: 'text-sky-700 dark:text-sky-300',
  },
  rose: {
    bg: 'bg-gradient-to-br from-rose-50 to-rose-100/60 dark:from-rose-950/40 dark:to-rose-900/20',
    icon: 'text-rose-700 dark:text-rose-300',
  },
  violet: {
    bg: 'bg-gradient-to-br from-violet-50 to-violet-100/60 dark:from-violet-950/40 dark:to-violet-900/20',
    icon: 'text-violet-700 dark:text-violet-300',
  },
};

/**
 * Visual category browse grid for the home page.
 *
 * Solves the "I don't know what to search for" empty-state. Each tile
 * is a tone-coded card with an icon + localized label. Clicking it
 * launches a curated seed search so users land on a useful result set
 * even without typing anything.
 *
 * Layout: 4 cols on mobile, 6 cols on md+. Compact enough to fit above
 * the fold below the ask-box without dominating the page.
 */
export function BrowseCategories() {
  const t = useTranslations('home.browse');
  const tr = useTranslations('recommend');
  const router = useRouter();

  function open(seed: string) {
    router.push(`/search?q=${encodeURIComponent(seed)}`);
  }

  return (
    <section className="mt-10" aria-label={t('aria')}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 text-[10.5px] font-bold tracking-wider text-white dark:bg-white dark:text-ink-900">
            <Sparkles className="h-3 w-3" strokeWidth={2.4} />
            {t('label')}
          </div>
          <h2 className="mt-2 text-[18px] font-extrabold tracking-tighter2 md:text-[22px]">
            {t('headline')}
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-500 dark:text-ink-400">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2.5 md:grid-cols-6 md:gap-3">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const styles = TONE_STYLES[c.tone];
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => open(c.seedQuery)}
              className={`group/cat flex flex-col items-center gap-1.5 rounded-2xl border border-ink-200/60 ${styles.bg} px-3 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card dark:border-ink-800/60`}
            >
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 ${styles.icon} shadow-sm dark:bg-ink-900/70`}>
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
              </span>
              <span className="text-[11.5px] font-bold tracking-tight text-ink-800 dark:text-ink-100">
                {tr(`cat.${c.key}`)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
