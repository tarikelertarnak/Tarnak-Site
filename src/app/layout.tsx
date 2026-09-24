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
  const name = content.hero.name || 'Tarık Eler'
  // Kullanıcı isteği (2026-09-24): title'da marka + unvan net geçsin.
  const title = 'Tarık Eler (Tarnak) | Web Developer'
  const description
    = 'Tarık Eler (Tarnak) — web developer ve içerik üretici. Next.js, TypeScript ve yapay zeka ile modern web projeleri geliştiriyorum. Portfolio, blog ve projelerim: tarik eler, tarikelertarnak, tarnak.'
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
    authors: [{ name: 'Tarık Eler (Tarnak)', url: SITE_URL }],
    creator: 'Tarık Eler (Tarnak)',
    publisher: 'Tarık Eler (Tarnak)',
    robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    alternates: { canonical: '/' },
    formatDetection: { email: false, address: false, telephone: false },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/logo.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/`,
      siteName: 'Tarık Eler (Tarnak)',
      title,
      description,
      locale: 'tr_TR',
      images: [
        { url: `${SITE_URL}/tarik-eler-tarnak-logo.png`, width: 512, height: 512, alt: 'Tarık Eler Tarnak logosu' },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${SITE_URL}/tarik-eler-tarnak-logo.png`],
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
                name: 'Tarık Eler',
                alternateName: ['Tarnak', 'TARIK ELER', 'tarikeler', 'elertarik', 'tarık eler'],
                url: SITE_URL,
                image: `${SITE_URL}/tarik-eler-tarnak-logo.png`,
                logo: `${SITE_URL}/tarik-eler-tarnak-logo.png`,
                jobTitle: 'Web Developer',
                // 2026-09-24: github.io siteleri yayindan kaldirildi — sameAs'ta
                // sadece AKTIF adresler kalir (arama motorlarına olu baglantilar
                // bildirmeyiz; bunlar sinyal kirletir).
                sameAs: [
                  'https://github.com/tarikelertarnak',
                  'https://github.com/TARIKELER-TARNAK',
                  'https://tarikelertarnak.pages.dev',
                ],
                knowsAbout: ['Next.js', 'TypeScript', 'Web Development', 'React', 'Yapay Zeka'],
              },
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'Tarık Eler (Tarnak)',
                alternateName: ['Tarnak', 'tarikelertarnak', 'tarikeler', 'tarık eler'],
                url: SITE_URL,
                inLanguage: ['tr', 'en'],
                // Sitelinks arama kutusu: "tarik eler chat" gibi aramalar sitenin
                // arama alanina yonlensin (Google sitelinks/searchbox).
                potentialAction: {
                  '@type': 'SearchAction',
                  target: `${SITE_URL}/search?q={search_term_string}`,
                  'query-input': 'required name=search_term_string',
                },
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
