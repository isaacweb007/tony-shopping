import { useTranslations } from 'next-intl';
import { AskBox } from './ask-box';
import { RecentQueries } from './recent-queries';

export function Hero() {
  const t = useTranslations('hero');
  return (
    <section className="relative">
      <div className="mesh-bg pointer-events-none absolute inset-0" />
      <div className="dotgrid pointer-events-none absolute inset-0 opacity-50" />

      <div className="container relative max-w-5xl pb-10 pt-10 md:pb-20 md:pt-24">
        <div className="flex justify-center animate-fade-up" style={{ animationDelay: '0.05s' }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-ink-700 backdrop-blur dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-200 md:text-xs">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-600" />
            </span>
            {t('eyebrow')}
          </div>
        </div>

        <h1
          className="mt-6 animate-fade-up text-center font-extrabold leading-[1.04] tracking-tighter2 md:mt-9"
          style={{
            animationDelay: '0.12s',
            fontSize: 'clamp(2rem, 6.5vw, 4.25rem)',
          }}
        >
          <span>{t('title1')}</span>
          <br />
          <span className="gradient-text">{t('title2')}</span>
        </h1>

        <p
          className="mx-auto mt-5 max-w-2xl animate-fade-up text-center text-[15px] leading-relaxed text-ink-500 dark:text-ink-400 md:mt-7 md:text-[17px]"
          style={{ animationDelay: '0.18s' }}
        >
          {t('subtitle')}
        </p>

        <div className="mt-9 md:mt-10">
          <AskBox />
        </div>

        <RecentQueries />
      </div>
    </section>
  );
}
