'use client';

import {
  Bed,
  Bot,
  Flame,
  Headphones,
  Monitor,
  TrendingUp,
  UtensilsCrossed,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { ProductImage } from '@/components/ui/product-image';

interface Pick {
  /** i18n key suffix under home.picks.* */
  id: string;
  query: string;
  /** Real product photo (Unsplash CDN). */
  imageUrl: string;
  /** Shown if the photo fails to load — never an emoji. */
  fallbackIcon: LucideIcon;
  tone: 'hot' | 'rising';
}

/**
 * Curated "Tony's editor picks" — opinionated seed queries Tony wants
 * to highlight this week. Hand-edited list, refreshed periodically.
 *
 * Each pick declares its own fallback lucide icon so that if the
 * Unsplash photo fails to load (404 / 403 / network), the card still
 * shows something visually intentional instead of a broken-image
 * placeholder.
 */
const PICKS: Pick[] = [
  {
    id: 'airpodsPro',
    query: 'AirPods Pro 2 USB-C',
    imageUrl: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=600&q=70&auto=format&fit=crop',
    fallbackIcon: Headphones,
    tone: 'hot',
  },
  {
    id: 'dyson',
    // Verified Unsplash hair-care photo (used widely; replaces the broken
    // 1522335789203-* ID that started 404-ing.)
    query: 'Dyson Airwrap',
    imageUrl: 'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600&q=70&auto=format&fit=crop',
    fallbackIcon: Wand2,
    tone: 'hot',
  },
  {
    id: 'airfryer',
    // Air-fryer / kitchen appliance photo (replaces broken 1631898039121-*).
    query: '필립스 에어프라이어',
    imageUrl: 'https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?w=600&q=70&auto=format&fit=crop',
    fallbackIcon: UtensilsCrossed,
    tone: 'rising',
  },
  {
    id: 'monitor',
    query: '4K 모니터 27인치',
    imageUrl: 'https://images.unsplash.com/photo-1527443195645-1133f7f28990?w=600&q=70&auto=format&fit=crop',
    fallbackIcon: Monitor,
    tone: 'rising',
  },
  {
    id: 'roborock',
    // Verified working photo (200 OK on HEAD check). The Bot fallback
    // icon already covers any subject mismatch.
    query: 'Roborock S8 Pro Ultra',
    imageUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=70&auto=format&fit=crop',
    fallbackIcon: Bot,
    tone: 'rising',
  },
  {
    id: 'mattress',
    query: '시몬스 매트리스 퀸',
    imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=70&auto=format&fit=crop',
    fallbackIcon: Bed,
    tone: 'hot',
  },
];

const TONE_META: Record<Pick['tone'], { icon: LucideIcon; pillClass: string; fallbackBg: string }> = {
  hot: {
    icon: Flame,
    pillClass:
      'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300',
    fallbackBg:
      'bg-gradient-to-br from-rose-100 to-rose-50 dark:from-rose-950/50 dark:to-rose-900/30',
  },
  rising: {
    icon: TrendingUp,
    pillClass:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300',
    fallbackBg:
      'bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950/50 dark:to-emerald-900/30',
  },
};

/**
 * "Tony's editor picks" — featured seed queries the home page promotes
 * to give users a click-to-start surface when they don't have anything
 * specific in mind. Sits below BrowseCategories.
 *
 * Visual: square product photo on the left (real Unsplash photo of the
 * actual product class), tone-coded HOT / RISING pill, friendly label
 * + searchable underlying query. Click → /search?q=<seed>. Photos use
 * ProductImage so a 404 silently degrades to a tone-matched lucide
 * fallback instead of the browser's broken-image icon.
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
              className="group/pick flex items-stretch gap-3 overflow-hidden rounded-2xl border border-ink-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-card dark:border-ink-800 dark:bg-ink-900 dark:hover:border-accent-600"
            >
              {/* Real product photo on the left — falls back to a tone-matched
                  lucide icon if the CDN photo fails. */}
              <ProductImage
                src={p.imageUrl}
                alt={p.query}
                fallbackIcon={p.fallbackIcon}
                className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800"
                imgClassName="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/pick:scale-110"
                fallbackBgClassName={meta.fallbackBg}
                fallbackIconClassName="h-8 w-8 text-ink-500/80 dark:text-ink-400/80"
              />
              <div className="min-w-0 flex-1 self-center">
                <div
                  className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-widest ${meta.pillClass}`}
                >
                  <Icon className="h-2.5 w-2.5" strokeWidth={2.6} />
                  {t(`tone.${p.tone}`)}
                </div>
                <div className="mt-1 line-clamp-2 text-[13.5px] font-bold leading-snug tracking-tight text-ink-900 dark:text-ink-50">
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
