import { useTranslations } from 'next-intl';

const STEPS = ['step1', 'step2', 'step3'] as const;

export function HowItWorks() {
  const t = useTranslations('howto');
  return (
    <section className="container max-w-5xl">
      <div className="text-center">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-600 dark:text-accent-400">
          {t('eyebrow')}
        </div>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tighter2 md:text-[40px]">
          {t('title')}
        </h2>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        {STEPS.map((s) => (
          <div
            key={s}
            className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900"
          >
            <div className="text-[12px] font-bold tracking-widest text-accent-600 dark:text-accent-400">
              {t(`${s}.label`)}
            </div>
            <div className="mt-1 text-[17px] font-bold tracking-tight">{t(`${s}.title`)}</div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">
              {t(`${s}.desc`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
