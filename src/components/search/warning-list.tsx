import { useTranslations } from 'next-intl';
import { TriangleAlert, Info } from 'lucide-react';

const KEYS = ['warn1', 'warn2', 'warn3', 'warn4'] as const;

export function WarningList() {
  const t = useTranslations('search');
  return (
    <div className="mt-14 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
      <div className="flex items-center gap-2 font-bold tracking-tight text-amber-800 dark:text-amber-300">
        <TriangleAlert className="h-5 w-5" strokeWidth={1.7} />
        {t('warnTitle')}
      </div>
      <ul className="mt-2.5 space-y-1.5 text-[13.5px] text-amber-900/90 dark:text-amber-200/80">
        {KEYS.map((k) => (
          <li key={k} className="flex items-start gap-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={2} />
            <span>{t(k)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
