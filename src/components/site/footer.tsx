import { useTranslations } from 'next-intl';
import { Logo } from '@/components/brand/logo';
import { Link } from '@/i18n/routing';

export function Footer() {
  const t = useTranslations('footer');
  return (
    <footer className="border-t border-ink-200/70 bg-white/70 dark:border-ink-800/70 dark:bg-ink-950">
      <div className="container grid grid-cols-2 gap-6 py-10 text-sm md:grid-cols-4 md:py-14">
        <div className="col-span-2">
          <Logo size="md" />
          <p className="mt-3 max-w-md leading-relaxed text-ink-500 dark:text-ink-400">
            {t('tagline')}
          </p>
        </div>
        <div>
          <div className="font-bold tracking-tight text-ink-800 dark:text-ink-100">
            {t('service')}
          </div>
          <ul className="mt-2.5 space-y-1.5 text-ink-500 dark:text-ink-400">
            <li>{t('service1')}</li>
            <li>{t('service2')}</li>
            <li>{t('service3')}</li>
            <li>{t('service4')}</li>
          </ul>
        </div>
        <div>
          <div className="font-bold tracking-tight text-ink-800 dark:text-ink-100">
            {t('support')}
          </div>
          <ul className="mt-2.5 space-y-1.5 text-ink-500 dark:text-ink-400">
            <li>{t('support1')}</li>
            <li>{t('support2')}</li>
            <li>{t('support3')}</li>
            <li>{t('support4')}</li>
            <li>
              <Link
                href="/disclosure"
                className="hover:text-ink-800 hover:underline dark:hover:text-ink-100"
              >
                {t('support5')}
              </Link>
            </li>
            <li>
              <Link
                href="/setup"
                className="hover:text-ink-800 hover:underline dark:hover:text-ink-100"
              >
                {t('support6')}
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-200/70 py-4 text-center text-[11px] tracking-wide text-ink-400 dark:border-ink-800/70 dark:text-ink-500">
        {t('copyright')}
      </div>
    </footer>
  );
}
