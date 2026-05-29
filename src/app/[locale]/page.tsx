import { setRequestLocale } from 'next-intl/server';
import { Hero } from '@/components/home/hero';
import { FeatureCards } from '@/components/home/feature-cards';
import { HowItWorks } from '@/components/home/how-it-works';
import { RecentProducts } from '@/components/home/recent-products';
import { InstallPrompt } from '@/components/home/install-prompt';
import { BrowseCategories } from '@/components/home/browse-categories';
import { EditorPicks } from '@/components/home/editor-picks';
import { PersonalRecommendations } from '@/components/home/personal-recommendations';
import { SavingsBanner } from '@/components/home/savings-banner';

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
      <InstallPrompt />
      <RecentProducts />
      <div className="container max-w-7xl">
        <SavingsBanner />
        <PersonalRecommendations />
        <BrowseCategories />
        <EditorPicks />
      </div>
      <div className="space-y-16 pb-20 pt-12 md:space-y-24 md:pb-28">
        <FeatureCards />
        <HowItWorks />
      </div>
    </>
  );
}
