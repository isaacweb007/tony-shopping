import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

export default async function NotFound() {
  const t = await getTranslations('boundary');
  return (
    <div className="container max-w-xl py-24 text-center">
      <div className="text-[12px] font-bold uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400">
        404
      </div>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tighter2 md:text-5xl">
        {t('notFoundTitle')}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-ink-500 dark:text-ink-400">{t('notFoundDesc')}</p>
      <Button asChild variant="primary" className="mt-6">
        <Link href="/">{t('goHome')}</Link>
      </Button>
    </div>
  );
}
