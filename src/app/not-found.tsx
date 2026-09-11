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
        <svg viewBox="0 0 24 24" width={72} height={72} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-primary/70">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="m9 15 2 2 4-4" />
        </svg>
        <p className="animate-gradient bg-gradient-to-r from-[#FBBF24] to-[#00C950] bg-size-300 bg-clip-text text-6xl sm:text-8xl font-black text-transparent">
          404
        </p>
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
