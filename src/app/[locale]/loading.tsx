import { getTranslations } from 'next-intl/server';

export default async function Loading() {
  const t = await getTranslations('boundary');
  return (
    <div className="container max-w-3xl py-24 text-center">
      <div className="mx-auto h-1 w-24 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
        <div className="h-full w-1/3 animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-accent-600 to-blue-600" />
      </div>
      <p className="mt-4 text-sm text-ink-500 dark:text-ink-400">{t('loading')}</p>
    </div>
  );
}
