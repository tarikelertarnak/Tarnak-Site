import type { Metadata, Viewport } from 'next'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { EmotionStyleRegistry } from '@/components/emotion-style-registry'
import { LocaleProvider } from '@/components/locale-provider'
import { MusicPlayer } from '@/components/music-player'
import { Providers } from '@/components/providers'
import { ScrollToTop } from '@/components/scroll-to-top'
import { Sidebar } from '@/components/sidebar'
import { SkipLink } from '@/components/skip-link'
import { ThemeInitScript } from '@/components/theme-init-script'
import { TopBar } from '@/components/top-bar'

import { SearchDialog } from '@/components/search-dialog'
import { getContent } from '@/lib/content'
import {
  BING_VERIFICATION,
  GOOGLE_SITE_VERIFICATION,
  YANDEX_VERIFICATION,
} from '@/lib/search-verification'
import { getLocaleDirection, getStaticLocale } from '@/lib/i18n-server'
import { SITE_URL } from '@/lib/site-url'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/800.css'
import './globals.css'

// 2026-10-03: `revalidate = 300` BURADAN KALDIRILDI — KOK NEDEN.
// Layout segment'i tum child rotalara gecerlidir; buradaki revalidate yuzünden
// /credits ve /donate'nin cache kaydi "stale" oluyordu. Worker stale gorunce
// revalidate kuyrugunu tetikliyor, kuyruk Cloudflare Pages'te dummy
// ("FatalError: Dummy queue is not implemented") ve istek ASILI KALIYORDU
// (ttfb=0, 60 sn+ sonsuz). Sayfa dosyalarindan revalidate kaldirmak YETMIYORDI,
// layout her zaman yeniden kaziyordu.
export const dynamic = 'force-static'

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
  // Kullanıcı isteği (2026-10-04): paylaşım başlığı sabit ve kısa —
  // link açıklarken görünen metin "Tarık Eler (Tarnak) - Portfolio".
  const title = 'Tarık Eler (Tarnak) - Portfolio'
  // Uzun isim/anahtar kelime yığını KALDIRILDI. Google zaten sayfayı
  // indeksleyip "site:" aramasıyla buluyor; spam görünen meta etiketler
  // SEO'yu degil paylaşım kartını bozuyordu. `keywords` alani tamamen
  // silindi (aşağıda metadata'ya da girdi).
  const description
    = 'Tarık Eler (Tarnak) — web developer ve içerik üretici. Next.js, TypeScript ve yapay zeka ile modern web projeleri geliştiriyorum. Portfolio, blog ve projelerim.'

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    authors: [{ name: 'Tarık Eler (Tarnak)', url: SITE_URL }],
    creator: 'Tarık Eler (Tarnak)',
    publisher: 'Tarık Eler (Tarnak)',
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      // max-snippet:-1 = Google istediği kadar uzun metin gösterebilir
      // (yazı seçiminde "tarik eler" görünsün diye önemli).
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    alternates: {
      canonical: '/',
      // RSS ucunu HTML'de ilan et: tarayici/okuyucu otomatik bulur, ucuzlar
      // yeni yazilari ucuz bir GET ile ogrenir (bkz. src/app/feed.xml).
      types: {
        'application/rss+xml': [{ url: '/feed.xml', title: 'Tarık Eler (Tarnak) — Blog' }],
      },
    },
    other: {
      // 2026-10-02: pages.dev subdomain'inde DNS TXT dogrulamasi YAPILAMAZ (zone
      // Cloudflare'e ait). Bu yuzden GSC URL onizleme mulku bu meta etiketiyle
      // dogrulanir. Token src/lib/search-verification.ts'de TEK KAYNAK olarak
      // tutulur; ayni deger /google-verification route handler'i tarafindan da
      // kullanilir.
      'google-site-verification': GOOGLE_SITE_VERIFICATION,
      // Yandex Webmaster (2026-09-25) — jeton gomuluydu, tek kaynaga tasindi.
      'yandex-verification': YANDEX_VERIFICATION,
      // Bing Webmaster — BING_SITE_VERIFICATION tanimliysa basilir. Anahtari
      // kosul spreading ile ekliyoruz: Next'in `other` tipi `undefined` kabul
      // etmiyor (TS2322), dogrudan yazmak build'i kirardi.
      ...(BING_VERIFICATION ? { 'msvalidate.01': BING_VERIFICATION } : {}),
    },
    formatDetection: { email: false, address: false, telephone: false },
icons: {
        icon: [
          { url: '/favicon.ico?v=3', sizes: '48x48', type: 'image/x-icon' },
          { url: '/favicon.svg?v=3', type: 'image/svg+xml' },
          { url: '/android-chrome-192x192.png?v=3', sizes: '192x192', type: 'image/png' },
          { url: '/android-chrome-512x512.png?v=3', sizes: '512x512', type: 'image/png' },
          { url: '/logo.png?v=2', sizes: '512x512', type: 'image/png' },
        ],
        apple: [
          { url: '/apple-touch-icon.png?v=3', sizes: '180x180', type: 'image/png' },
        ],
      },
      manifest: '/site.webmanifest',
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
  const locale = await getStaticLocale()
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
                alternateName: [
                  'Tarnak',
                  'TARIK ELER',
                  'tarikeler',
                  'elertarik',
                  'tarık eler',
                  'tarik eler',
                  'tarik tarnak',
                  'tarnak tarik',
                  'tarnak eler',
                  'eler tarnak',
                  'tarik tarnak eler',
                  'tarnak tarik eler',
                  'tarik eler tarnak',
                  'tarnak tarik',
                  'tarik tarnak',
                  'eler tarik',
                  'tarnak eler tarik',
                  'tarik eler tarnak',
                  'tarikelertarnak',
                  'TARIK ELER TARNAK',
                ],
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
                alternateName: [
                  'Tarnak',
                  'tarikelertarnak',
                  'tarikeler',
                  'tarık eler',
                  'tarik eler',
                  'tarik tarnak',
                  'tarnak tarik',
                  'tarnak eler',
                  'eler tarnak',
                  'tarik tarnak eler',
                  'tarnak tarik eler',
                  'tarik eler tarnak',
                  'tarnak tarik',
                  'tarik tarnak',
                  'eler tarik',
                  'tarnak eler tarik',
                  'tarik eler tarnak',
                  'tarikelertarnak',
                  'TARIK ELER TARNAK',
                ],
                url: SITE_URL,
                inLanguage: ['tr', 'en'],
                // 2026-10-04: `potentialAction: SearchAction` KALDIRILDI.
                // Iki neden: (1) Google Kasim 2024'te sitelinks arama kutusu
                // ozelligini kaldirdi, schema.org uzerinden isteniyorsa bile
                // pratikte islevsiz; (2) hedef `/search` sayfasi
                // `robots: {index:false}` — yani JSON-LD "burada ara" diyordu,
                // baglandigi sayfa indekslenmiyordu. Celişki kaldirildi.
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
