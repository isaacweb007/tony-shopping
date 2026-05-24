import { setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/home/hero';
import { FeatureCards } from '@/components/home/feature-cards';
import { HowItWorks } from '@/components/home/how-it-works';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <div className="space-y-16 pb-20 md:space-y-24 md:pb-28">
        <FeatureCards />
        <HowItWorks />
      </div>
    </>
  );
}
