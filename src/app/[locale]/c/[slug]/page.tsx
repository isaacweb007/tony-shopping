import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { CompareView } from '@/components/compare/compare-view';
import { SITE_URL } from '@/lib/site';
import type { ShortlistSnap } from '@/types/shortlist';
import type { ComparePriority } from '@/lib/compare/verdict';

interface SharedCohort {
  slug: string;
  snaps: ShortlistSnap[];
  winnerId: string | null;
  priority: ComparePriority;
  locale: string;
  createdAt: string;
}

async function fetchCohort(slug: string): Promise<SharedCohort | null> {
  try {
    const res = await fetch(`${SITE_URL}/api/cohort/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as SharedCohort;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'compare' });
  const cohort = await fetchCohort(slug);
  if (!cohort) return { title: t('title') };

  const winner = cohort.winnerId ? cohort.snaps.find((s) => s.id === cohort.winnerId) ?? null : null;
  const params2 = new URLSearchParams();
  params2.set('locale', locale);
  params2.set('variant', 'shared');
  // Age in seconds since the cohort was minted — feeds the "shared X ago" pill.
  const createdAt = Date.parse(cohort.createdAt);
  if (Number.isFinite(createdAt)) {
    const ageSec = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
    params2.set('age', String(ageSec));
  }
  if (winner) {
    params2.set('w', winner.name.slice(0, 120));
    params2.set('store', String(winner.store).slice(0, 40));
    params2.set('n', String(cohort.snaps.length));
  }
  const ogImage = `${SITE_URL}/api/og/compare?${params2.toString()}`;
  const ogTitle = winner
    ? t('ogTitleWithWinner', { winner: winner.name.slice(0, 80) })
    : t('title');
  const ogDesc = t('ogDescriptionWithCohort', { n: cohort.snaps.length });

  return {
    title: ogTitle,
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogTitle }],
    },
    twitter: { card: 'summary_large_image', title: ogTitle, description: ogDesc, images: [ogImage] },
  };
}

export default async function SharedCompare({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const cohort = await fetchCohort(slug);
  if (!cohort || cohort.snaps.length === 0) {
    notFound();
  }
  return (
    <CompareView
      seedSnaps={cohort.snaps}
      initialPriority={cohort.priority}
      readOnly
    />
  );
}
