import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ShieldCheck } from 'lucide-react';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'disclosure' });
  return {
    title: t('title'),
    robots: { index: true, follow: true },
  };
}

const SECTION_KEYS = [
  'intro',
  'affiliate',
  'pricing',
  'tonyScore',
  'recommendations',
  'privacy',
  'contact',
] as const;

export default async function DisclosurePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'disclosure' });

  return (
    <article className="container max-w-3xl pb-32 pt-10 md:pt-16">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white dark:bg-white dark:text-ink-900">
        <ShieldCheck className="h-3 w-3" strokeWidth={2.4} />
        {t('eyebrow')}
      </div>
      <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tighter2 md:text-[36px]">
        {t('heading')}
      </h1>
      <p className="mt-2 text-[12px] uppercase tracking-widest text-ink-400 dark:text-ink-500">
        {t('lastUpdated')}
      </p>

      <div className="mt-10 space-y-9">
        {SECTION_KEYS.map((key) => (
          <section key={key} aria-labelledby={`s-${key}`}>
            <h2
              id={`s-${key}`}
              className="text-[18px] font-extrabold tracking-tighter2 md:text-[20px]"
            >
              {t(`sections.${key}.title` as 'sections.intro.title')}
            </h2>
            <p className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-ink-700 dark:text-ink-200">
              {t(`sections.${key}.body` as 'sections.intro.body')}
            </p>
          </section>
        ))}
      </div>
    </article>
  );
}
