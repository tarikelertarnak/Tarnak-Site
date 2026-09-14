import Link from 'next/link'
import { Navigation } from '@/components/navigation'
import { t } from '@/lib/i18n'
import { getLocale, getLocalizedContent } from '@/lib/i18n-server'

export default async function NotFound() {
  const [content, locale] = await Promise.all([getLocalizedContent(), getLocale()])

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 sm:px-6 py-28 sm:py-36 text-center">
        <svg viewBox="0 0 24 24" width={112} height={112} fill="currentColor" fillRule="evenodd" clipRule="evenodd" className="text-primary/80" aria-hidden="true">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a7.95 7.95 0 0 1 4.9 1.7L12.6 10H9.4L7.1 5.72A7.96 7.96 0 0 1 12 4ZM5.72 7.1 10 9.4v3.2l-5.28 2.28A7.96 7.96 0 0 1 5.72 7.1Zm.63 10.36A7.95 7.95 0 0 1 4 12h4.3l1.3 4.3-3.25 1.16Zm3.3.44L12 15.6l2.35 2.3A7.9 7.9 0 0 1 12 19a7.9 7.9 0 0 1-2.35-.1Zm4.3-.44L20 13.1a8 8 0 0 1-1.29 4.74L14.3 17.4 13.95 17.46Zm3.53-6.34 1.06-3.5A7.96 7.96 0 0 1 20 12h-4.3l-.34-4.7 2.32.76Zm.38-6.4A8 8 0 0 1 20.8 9.2h-4.13L15.2 4.9a7.93 7.93 0 0 1 2.34.02ZM12 11.3l1.6 1.6L12 14.5l-1.6-1.6 1.6-1.6Z" />
        </svg>
        <h1 className="text-2xl sm:text-3xl font-bold">{t(locale, 'notFound.title')}</h1>
        <p className="max-w-md text-foreground-500 text-sm sm:text-base">
          {t(locale, 'notFound.desc')}
        </p>
        <div className="flex flex-col xs:flex-row gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#e5e7eb] px-5 py-2.5 text-sm font-semibold text-[#000] transition-colors hover:bg-[#d1d5db]"
          >
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {t(locale, 'notFound.home')}
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/40 px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
          >
            {t(locale, 'notFound.projects')}
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
        <Link href="/github" className="text-sm text-foreground-500 hover:text-primary transition-colors">
          {t(locale, 'notFound.explorer')}
        </Link>
      </div>
    </div>
  )
}
