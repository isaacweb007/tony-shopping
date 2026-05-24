'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('boundary');
  return (
    <div className="container max-w-xl py-24 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-red-500" strokeWidth={1.6} />
      <h1 className="mt-4 text-2xl font-extrabold tracking-tighter2 md:text-3xl">
        {t('errorTitle')}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-ink-500 dark:text-ink-400">{t('errorDesc')}</p>
      {error.digest && (
        <p className="mt-3 font-mono text-[11px] text-ink-400 dark:text-ink-500">
          ref: {error.digest}
        </p>
      )}
      <div className="mt-6 flex justify-center gap-2">
        <Button variant="primary" onClick={reset}>
          {t('retry')}
        </Button>
        <Button variant="outline" asChild>
          <a href="/">{t('goHome')}</a>
        </Button>
      </div>
    </div>
  );
}
