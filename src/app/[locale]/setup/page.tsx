import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CheckCircle2, ExternalLink, KeyRound, Radio, Settings2 } from 'lucide-react';
import { ADAPTER_META, getAdapterStatuses, getOverallStatus } from '@/lib/adapter-status';
import { getAdapterStats } from '@/lib/adapter-stats';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'setup' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function SetupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'setup' });

  const statuses = getAdapterStatuses();
  const overall = getOverallStatus();
  const stats = getAdapterStats();
  const live = statuses.filter((s) => s.real).length;

  // adapter.name (lowercase enum) → StoreId used in the runner's recordAdapterCall key
  const NAME_TO_STORE: Record<string, string> = {
    naver: 'NaverShopping',
    ebay: 'eBay',
    serpapi: 'GoogleShopping',
    amazon: 'Amazon',
    coupang: 'Coupang',
    shopee: 'Shopee',
    lazada: 'Lazada',
    rakuten: 'Rakuten',
    yahoojp: 'YahooJP',
    aliexpress: 'AliExpress',
  };
  const now = Date.now();

  return (
    <div className="container max-w-4xl pb-32 pt-10 md:pt-16">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white dark:bg-white dark:text-ink-900">
        <KeyRound className="h-3 w-3" strokeWidth={2.4} />
        {t('eyebrow')}
      </div>
      <h1 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tighter2 md:text-[36px]">
        {t('heading')}
      </h1>
      <p className="mt-2 text-[14px] text-ink-600 dark:text-ink-300">
        {t('subtitle', { live, total: statuses.length })}
      </p>

      {/* Overall summary band */}
      <div
        className={
          'mt-6 rounded-2xl border p-4 ' +
          (overall.anyRealSearch
            ? 'border-emerald-300/60 bg-emerald-50/60 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200'
            : 'border-amber-300/60 bg-amber-50/60 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200')
        }
      >
        <div className="flex items-center gap-2 text-[13px] font-bold">
          {overall.anyRealSearch ? (
            <Radio className="h-4 w-4" strokeWidth={2.2} />
          ) : (
            <Settings2 className="h-4 w-4" strokeWidth={2.2} />
          )}
          {overall.anyRealSearch
            ? t('overall.live', { stores: overall.liveSearchLabels.join(' + ') })
            : t('overall.mock')}
        </div>
        <p className="mt-1 text-[12.5px] opacity-90">
          {overall.anyRealSearch ? t('overall.liveHint') : t('overall.mockHint')}
        </p>
      </div>

      {/* Three-step Vercel guide */}
      <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <div className="text-[12px] font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
          {t('howto.title')}
        </div>
        <ol className="mt-3 space-y-2.5 text-[13.5px] text-ink-700 dark:text-ink-200">
          <li>
            <b>1.</b> {t('howto.s1')}
          </li>
          <li>
            <b>2.</b> {t('howto.s2')}
          </li>
          <li>
            <b>3.</b> {t('howto.s3')}
          </li>
        </ol>
      </div>

      <h2 className="mt-10 text-[20px] font-extrabold tracking-tighter2">{t('adapters.title')}</h2>
      <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">{t('adapters.subtitle')}</p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {statuses.map((s) => {
          const meta = ADAPTER_META[s.name];
          return (
            <article
              key={s.name}
              className="rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[15px] font-extrabold tracking-tight">{meta.label}</div>
                  <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-ink-400 dark:text-ink-500">
                    {meta.region} · {meta.freeTier}
                  </div>
                </div>
                <StatusPill real={s.real} t={t} />
              </div>
              <p className="mt-2 text-[13px] text-ink-600 dark:text-ink-300">{meta.blurb}</p>

              {(() => {
                const storeKey = NAME_TO_STORE[s.name];
                const stat = storeKey ? stats[storeKey] : null;
                if (!stat) return null;
                const ageSec = Math.max(0, Math.floor((now - stat.lastAt) / 1000));
                const ageLabel =
                  ageSec < 60
                    ? `${ageSec}s ago`
                    : ageSec < 3600
                      ? `${Math.floor(ageSec / 60)}m ago`
                      : `${Math.floor(ageSec / 3600)}h ago`;
                return (
                  <div
                    className={
                      'mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-md border px-2 py-1 text-[10.5px] font-semibold ' +
                      (stat.lastOk
                        ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'border-red-200 bg-red-50/60 text-red-700 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-300')
                    }
                    title={`${stat.lastResultCount} results · ${ageLabel}`}
                  >
                    <span className="font-mono">{stat.lastDurationMs}ms</span>
                    <span className="opacity-60">·</span>
                    <span>{stat.lastResultCount} results</span>
                    <span className="opacity-60">·</span>
                    <span>{ageLabel}</span>
                  </div>
                );
              })()}

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {meta.envVars.map((env) => (
                  <code
                    key={env}
                    className="rounded-md border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-700 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200"
                  >
                    {env}
                  </code>
                ))}
              </div>

              <a
                href={meta.consoleUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-accent-700 hover:underline dark:text-accent-300"
              >
                {t('adapters.openConsole')}
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
              </a>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ real, t }: { real: boolean; t: Awaited<ReturnType<typeof getTranslations<'setup'>>> }) {
  if (real) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        <CheckCircle2 className="h-3 w-3" strokeWidth={2.4} />
        {t('pill.live')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-600 dark:bg-ink-800 dark:text-ink-300">
      {t('pill.mock')}
    </span>
  );
}
