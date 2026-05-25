import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CompareView } from '@/components/compare/compare-view';
import { SITE_URL } from '@/lib/site';

type SearchParams = Record<string, string | string[] | undefined>;

function pickFirst(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function buildOgImageUrl(
  locale: string,
  sp: SearchParams,
): { url: string; hasCohort: boolean } {
  const params = new URLSearchParams();
  params.set('locale', locale);
  const w = pickFirst(sp.w);
  const store = pickFirst(sp.store);
  const score = pickFirst(sp.score);
  const n = pickFirst(sp.n);
  let hasCohort = false;
  if (w && store && n) {
    params.set('w', w.slice(0, 120));
    params.set('store', store.slice(0, 40));
    params.set('n', n);
    if (score) params.set('score', score);
    hasCohort = true;
  }
  return { url: `${SITE_URL}/api/og/compare?${params.toString()}`, hasCohort };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: 'compare' });

  const { url: ogImage, hasCohort } = buildOgImageUrl(locale, sp);
  const winner = pickFirst(sp.w);
  const nStr = pickFirst(sp.n);
  const n = nStr ? Number(nStr) : NaN;
  const shareTitle =
    hasCohort && winner
      ? t('ogTitleWithWinner', { winner: winner.slice(0, 80) })
      : t('title');
  const shareDescription =
    hasCohort && Number.isFinite(n)
      ? t('ogDescriptionWithCohort', { n: Math.round(n) })
      : t('subtitle', { n: 0 });

  return {
    title: t('title'),
    openGraph: {
      title: shareTitle,
      description: shareDescription,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: shareTitle }],
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description: shareDescription,
      images: [ogImage],
    },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CompareView />;
}
