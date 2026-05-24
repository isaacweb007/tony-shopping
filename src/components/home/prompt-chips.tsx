'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  DollarSign,
  Footprints,
  Gift,
  ImageIcon,
  Lightbulb,
  RefreshCw,
  ShoppingBag,
  Shirt,
  Sparkle,
  Sparkles,
  Tag,
} from 'lucide-react';
import { useUserProfileStore } from '@/stores/user-profile-store';
import { buildPromptChips, type PromptChip } from '@/lib/personalize';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  image: ImageIcon,
  footprints: Footprints,
  lightbulb: Lightbulb,
  dollar: DollarSign,
  gift: Gift,
  sparkles: Sparkles,
  shirt: Shirt,
  sparkle: Sparkle,
  'shopping-bag': ShoppingBag,
  tag: Tag,
} as const;

interface Props {
  /** Called when a chip is picked. Receives the chip text. */
  onPick: (text: string) => void;
}

export function PromptChips({ onPick }: Props) {
  const t = useTranslations();
  const tr = useTranslations('recommend');

  const profile = useUserProfileStore((s) => s.profile);

  // Hydration-safe: render defaults on server, then upgrade to personalized on mount.
  const [mounted, setMounted] = React.useState(false);
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => setMounted(true), []);

  const chips = React.useMemo<PromptChip[]>(() => {
    if (!mounted) {
      return [
        { id: 'd0', text: tr('default.bag'), icon: 'image' },
        { id: 'd1', text: tr('default.shoes'), icon: 'footprints' },
        { id: 'd2', text: tr('default.lamp'), icon: 'lightbulb' },
        { id: 'd3', text: tr('default.cheaper'), icon: 'dollar' },
        { id: 'd4', text: tr('default.gift'), icon: 'gift' },
      ];
    }
    return buildPromptChips({ profile, t });
    // `version` bumps on shuffle to keep the memo cache honest even when profile
    // didn't change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, profile, version, t]);

  const tier =
    !mounted || profile.searchCount < 2
      ? 'first'
      : profile.searchCount >= 8
        ? 'power'
        : 'returning';

  const subtitle =
    tier === 'first' ? tr('subFirst') : tier === 'power' ? tr('subPower') : tr('subReturning');

  return (
    <div className="mt-7">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400">
            <Sparkles className="h-3 w-3" strokeWidth={2} />
            {tr('heading')}
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink-500 dark:text-ink-400">{subtitle}</p>
        </div>
        {mounted && profile.searchCount >= 2 && (
          <button
            type="button"
            onClick={() => setVersion((v) => v + 1)}
            className="group inline-flex h-8 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3 text-[12px] font-semibold text-ink-700 transition hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ink-800"
          >
            <RefreshCw
              className="h-3.5 w-3.5 transition-transform group-hover:rotate-90"
              strokeWidth={1.8}
            />
            {tr('shuffle')}
          </button>
        )}
      </div>

      {/* Horizontal scroll on mobile, wrap on md+ */}
      <div
        className={cn(
          'no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4',
          'md:mx-0 md:flex-wrap md:overflow-visible md:px-0',
        )}
      >
        {chips.map((c) => {
          const Icon = ICON_MAP[c.icon];
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.text)}
              className={cn(
                'group inline-flex shrink-0 snap-start items-center gap-2 rounded-full border bg-white px-4 py-2.5 text-[13px] font-medium text-ink-700',
                'border-ink-200 transition hover:-translate-y-px hover:border-accent-300 hover:bg-gradient-to-br hover:from-accent-50 hover:to-white hover:text-ink-900',
                'dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-accent-700 dark:hover:from-accent-950/30 dark:hover:to-ink-900 dark:hover:text-ink-50',
                'md:shrink',
              )}
            >
              <Icon
                className="h-[15px] w-[15px] text-ink-500 transition group-hover:text-accent-600 dark:text-ink-400 dark:group-hover:text-accent-400"
                strokeWidth={1.7}
              />
              <span>{c.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
