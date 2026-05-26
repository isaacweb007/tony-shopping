'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';

interface Props {
  /** The locale the cohort was originally minted under. */
  cohortLocale: string;
}

const NAMES: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  vi: 'Tiếng Việt',
};

/**
 * Tiny inline pill on /c/{slug} that surfaces "this compare was made in
 * Korean" when the visitor's locale differs. Helps the reader understand
 * why prices / units / phrasing might reflect a different region. Hidden
 * when the cohort's locale matches the visitor's — no value otherwise.
 */
export function CohortLocaleHint({ cohortLocale }: Props) {
  const t = useTranslations('compare.localeHint');
  const viewer = useLocale();
  if (!cohortLocale || cohortLocale === viewer) return null;
  const label = NAMES[cohortLocale] ?? cohortLocale.toUpperCase();
  return (
    <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-ink-50/60 px-2.5 py-1 text-[11px] font-semibold text-ink-600 dark:border-ink-700 dark:bg-ink-800/40 dark:text-ink-300">
      <Globe className="h-3 w-3" strokeWidth={2.2} />
      {t('label', { lang: label })}
    </div>
  );
}
