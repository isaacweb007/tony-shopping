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
  /** Background image (Unsplash CDN, free for any use). w=600 q=70 keeps it crisp without being heavy. */
  imageUrl: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    key: 'electronics',
    icon: Cpu,
    seedQuery: 'airpods pro 2',
    tone: 'accent',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=70&auto=format&fit=crop',
  },
  {
    key: 'shoes',
    icon: Footprints,
    seedQuery: 'nike air force 1',
    tone: 'amber',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=70&auto=format&fit=crop',
  },
  {
    key: 'bag',
    icon: ShoppingBag,
    seedQuery: '여성 미니 백팩',
    tone: 'rose',
    imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=70&auto=format&fit=crop',
  },
  {
    key: 'beauty',
    icon: Sparkles,
    seedQuery: '랑콤 마스카라',
    tone: 'violet',
    imageUrl: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=70&auto=format&fit=crop',
  },
  {
    key: 'clothes',
    icon: Shirt,
    seedQuery: '겨울 패딩 자켓',
    tone: 'sky',
    imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&q=70&auto=format&fit=crop',
  },
  {
    key: 'sports',
    icon: Dumbbell,
    seedQuery: '아령 덤벨 세트',
    tone: 'emerald',
    imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=70&auto=format&fit=crop',
  },
  {
    key: 'furniture',
    icon: Sofa,
    seedQuery: '거실 소파',
    tone: 'amber',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=70&auto=format&fit=crop',
  },
  {
    key: 'kitchen',
    icon: UtensilsCrossed,
    seedQuery: '에어프라이어',
    tone: 'rose',
    imageUrl: 'https://images.unsplash.com/photo-1631898039121-acca15ed3a44?w=600&q=70&auto=format&fit=crop',
  },
  {
    key: 'lighting',
    icon: Lamp,
    seedQuery: '무드등 LED',
    tone: 'violet',
    imageUrl: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600&q=70&auto=format&fit=crop',
  },
  {
    key: 'pet',
    icon: Dog,
    seedQuery: '강아지 사료',
    tone: 'emerald',
    imageUrl: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=600&q=70&auto=format&fit=crop',
  },
  {
    key: 'baby',
    icon: Baby,
    seedQuery: '아기 모빌',
    tone: 'sky',
    imageUrl: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&q=70&auto=format&fit=crop',
  },
  {
    key: 'jewelry',
    icon: Gem,
    seedQuery: '여성 목걸이',
    tone: 'accent',
    imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=70&auto=format&fit=crop',
  },
];

const TONE_OVERLAY: Record<CategoryDef['tone'], string> = {
  // Gradient overlay sits on top of the photo. Heavier at bottom (where the
  // label lives) so text contrast stays AA against any photo content.
  accent:
    'bg-gradient-to-t from-accent-950/95 via-accent-900/60 to-accent-700/20',
  amber: 'bg-gradient-to-t from-amber-950/95 via-amber-900/60 to-amber-700/20',
  emerald:
    'bg-gradient-to-t from-emerald-950/95 via-emerald-900/60 to-emerald-700/20',
  sky: 'bg-gradient-to-t from-sky-950/95 via-sky-900/60 to-sky-700/20',
  rose: 'bg-gradient-to-t from-rose-950/95 via-rose-900/60 to-rose-700/20',
  violet: 'bg-gradient-to-t from-violet-950/95 via-violet-900/60 to-violet-700/20',
};

const TONE_ICON_BG: Record<CategoryDef['tone'], string> = {
  accent: 'bg-accent-500/90 text-white',
  amber: 'bg-amber-500/90 text-white',
  emerald: 'bg-emerald-500/90 text-white',
  sky: 'bg-sky-500/90 text-white',
  rose: 'bg-rose-500/90 text-white',
  violet: 'bg-violet-500/90 text-white',
};

/**
 * Visual category browse grid for the home page.
 *
 * Solves the "I don't know what to search for" empty-state. Each tile
 * is now a real photo card — a curated Unsplash photo of the category
 * (headphones for electronics, sneakers for shoes, etc.) under a
 * tone-coded gradient overlay that keeps the label readable. The
 * small icon chip in the corner anchors which category it is in the
 * brand colour. Clicking launches a curated seed search.
 *
 * Layout: 2 cols on mobile, 6 cols on md+. Each tile is a 4:3 photo
 * so the imagery has room to breathe without dominating the page.
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

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6 md:gap-3">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => open(c.seedQuery)}
              className="group/cat relative aspect-[4/3] overflow-hidden rounded-2xl border border-ink-200/60 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card dark:border-ink-800/60"
            >
              {/* Photo */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.imageUrl}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/cat:scale-105"
              />
              {/* Tone-coded gradient overlay so the label stays legible */}
              <span className={`absolute inset-0 ${TONE_OVERLAY[c.tone]}`} aria-hidden="true" />

              {/* Icon chip in the top-left corner */}
              <span
                className={`absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg shadow-sm ${TONE_ICON_BG[c.tone]}`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
              </span>

              {/* Label anchored to the bottom — readable against gradient */}
              <span className="absolute inset-x-0 bottom-0 px-3 pb-2.5 text-[12.5px] font-extrabold tracking-tight text-white drop-shadow-md md:text-[13px]">
                {tr(`cat.${c.key}`)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
