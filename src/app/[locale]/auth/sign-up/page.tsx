import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthForm } from '@/components/auth/auth-form';
import { Logo } from '@/components/brand/logo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('signUp') };
}

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'auth' });

  return (
    <div className="container max-w-md py-12 md:py-20">
      <div className="flex flex-col items-center text-center">
        <Logo size="lg" withWordmark={false} />
        <h1 className="mt-4 text-[24px] font-extrabold tracking-tighter2 md:text-[28px]">
          {t('signUp')}
        </h1>
      </div>
      <div className="mt-8">
        <AuthForm mode="signup" />
      </div>
    </div>
  );
}
