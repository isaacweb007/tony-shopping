import { useTranslations } from 'next-intl';
import { ImageIcon, Link2, BarChart3, Sparkles } from 'lucide-react';

const FEATURES = [
  { key: 'f1', Icon: ImageIcon },
  { key: 'f2', Icon: Link2 },
  { key: 'f3', Icon: BarChart3 },
  { key: 'f4', Icon: Sparkles },
] as const;

export function FeatureCards() {
  const t = useTranslations('features');
  return (
    <div className="container grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
      {FEATURES.map(({ key, Icon }) => (
        <div
          key={key}
          className="rounded-2xl border border-ink-200 bg-white/70 p-5 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-card dark:border-ink-800 dark:bg-ink-900/70"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-900/40 dark:text-accent-300">
            <Icon className="h-5 w-5" strokeWidth={1.6} />
          </div>
          <div className="text-[15px] font-bold tracking-tight">{t(`${key}.title`)}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">
            {t(`${key}.desc`)}
          </p>
        </div>
      ))}
    </div>
  );
}
