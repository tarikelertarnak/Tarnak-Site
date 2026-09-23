import type { Metadata, Viewport } from 'next'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { EmotionStyleRegistry } from '@/components/emotion-style-registry'
import { LocaleProvider } from '@/components/locale-provider'
import { MusicPlayer } from '@/components/music-player'
import { Providers } from '@/components/providers'
import { ScrollToTop } from '@/components/scroll-to-top'
import { SearchDialog } from '@/components/search-dialog'
import { Sidebar } from '@/components/sidebar'
import { SkipLink } from '@/components/skip-link'
import { ThemeInitScript } from '@/components/theme-init-script'
import { TopBar } from '@/components/top-bar'
import { getContent } from '@/lib/content'
import { getLocale, getLocaleDirection } from '@/lib/i18n-server'
import { SITE_URL } from '@/lib/site-url'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/800.css'
import './globals.css'

export const revalidate = 300

// Kanonik origin tek kaynaktan gelir — bkz. src/lib/site-url.ts
// (Vercel/Cloudflare ortam degiskenlerini otomatik okur; eskiden burada
//  github.io'ya dusen bir varsayilan vardi ve canli sitede canonical/og
//  URL'lerini bozuyordu.)

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000',
}

export async function generateMetadata(): Promise<Metadata> {
  const content = await getContent()
  const name = content.hero.name || 'TARIK ELER'
  const title = `${name} - TARNAK`
  const description
    = 'TARIK ELER - TARNAK (Tarnak) - Web developer & creator. Next.js, TypeScript ve yapay zeka üzerine projeler geliştiriyorum. Projelerim, yeteneklerim ve iletişim bilgilerim. Tarık Eler, tarikeler, elertarik, tarık eler tarnak, tarikelertarnak.'
  const keywords = [
    'TARIK ELER',
    'TARNAK',
    'Tarık Eler',
    'TARIKELER',
    'tarikelertarnak',
    'Tarnak',
    'tarikeler',
    'tarık',
    'eler',
    'tarıkeler',
    'elertarik',
    'tarık eler',
    'eler tarık',
    'tarık eler tarnak',
    'tarikelertarnak',
    'tarik eler',
    'tarik eler tarnak',
    'TARIK ELER TARNAK',
    'web developer',
    'Next.js',
    'TypeScript',
    'yazılım geliştirici',
    'portfolio',
    'kişisel site',
  ]

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    keywords,
    authors: [{ name: 'TARIK ELER - TARNAK', url: SITE_URL }],
    creator: 'TARIK ELER - TARNAK',
    publisher: 'TARIK ELER - TARNAK',
    robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    alternates: { canonical: '/' },
    formatDetection: { email: false, address: false, telephone: false },
    icons: {
      icon: [
        { url: '/tarnak-white.svg', type: 'image/svg+xml' },
        { url: '/tarnak-256.png', sizes: '256x256', type: 'image/png' },
        { url: '/tarnak-128.png', sizes: '128x128', type: 'image/png' },
      ],
      apple: '/tarnak-256.png',
    },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/`,
      siteName: 'TARIK ELER - TARNAK',
      title,
      description,
      locale: 'tr_TR',
      images: [
        { url: `${SITE_URL}/tarnak-logo-512.png`, width: 512, height: 512, alt: 'TARNAK logo' },
      ],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [`${SITE_URL}/tarnak-logo-512.png`],
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const content = await getContent()
  const locale = await getLocale()
  const musicSrc = content.settings?.musicSrc
  const defaultTheme
    = (content.settings?.defaultTheme as 'light' | 'dark' | 'system' | 'auto' | undefined)
      || 'auto'
  // Value interpolated into an inline script — pinned to the enum for XSS safety.
  const safeDefaultTheme = ['light', 'dark', 'system', 'auto'].includes(defaultTheme)
    ? defaultTheme
    : 'auto'
  // SSR first paint: .dark/.light class is baked on <html> → no white FOUC.
  // auto/system → dark (site design is dark); ThemeInitScript sets the real preference at parse time.
  const initialThemeClass = defaultTheme === 'light' ? 'light' : 'dark'
  const initialThemeData = initialThemeClass

  return (
    <html lang={locale} dir={getLocaleDirection(locale)} suppressHydrationWarning className={initialThemeClass} data-theme={initialThemeData}>
      <body className="min-h-screen bg-white text-black antialiased dark:bg-black dark:text-white">
        {/* SEO — Person + WebSite structured data (Google / Yandex rich snippets) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'Person',
                name: 'TARIK ELER - TARNAK',
                alternateName: ['TARNAK', 'Tarnak', 'tarikeler', 'elertarik', 'Tarık Eler'],
                url: SITE_URL,
                image: `${SITE_URL}/tarnak-logo-512.png`,
                sameAs: [
                  'https://github.com/tarikelertarnak',
                  'https://tarikelertarnak.pages.dev',
                  'https://tarikelertarnak.github.io',
                ],
                knowsAbout: ['Next.js', 'TypeScript', 'Web Development', 'React', 'Yapay Zeka'],
              },
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'TARIK ELER - TARNAK',
                alternateName: ['TARNAK', 'tarikelertarnak', 'tarikeler'],
                url: SITE_URL,
                inLanguage: ['tr', 'en'],
              },
            ]),
          }}
        />
        <ThemeInitScript defaultTheme={safeDefaultTheme} />
        <Providers
          backgroundImage={content.settings?.backgroundImage || ''}
          defaultTheme={defaultTheme}
        >
          <AntdRegistry>
            <EmotionStyleRegistry>
              <LocaleProvider detectedLocale={locale}>
                <SkipLink />
                <TopBar />
                <Sidebar />
                <SearchDialog />
                <ScrollToTop />
                {children}
                <MusicPlayer src={musicSrc} />
              </LocaleProvider>
            </EmotionStyleRegistry>
          </AntdRegistry>
        </Providers>
      </body>
    </html>
  )
}
