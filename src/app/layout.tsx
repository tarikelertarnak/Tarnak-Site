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
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/800.css'
import './globals.css'

export const revalidate = 300

const SITE_URL = 'https://tarikeler-tarnak.github.io'

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
    = 'TARIK ELER - TARNAK (Tarnak) - Web developer & creator. Next.js, TypeScript ve yapay zeka üzerine projeler geliştiriyorum. Projelerim, yeteneklerim ve iletişim bilgilerim.'

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    keywords: [
      'TARIK ELER',
      'TARNAK',
      'Tarık Eler',
      'TARIKELER',
      'TARIKELER-TARNAK',
      'Tarnak',
      'tarikeler',
      'web developer',
      'Next.js',
      'TypeScript',
      'yazılım geliştirici',
    ],
    authors: [{ name: 'TARIK ELER - TARNAK', url: SITE_URL }],
    creator: 'TARIK ELER - TARNAK',
    publisher: 'TARIK ELER - TARNAK',
    robots: { index: true, follow: true },
    alternates: { canonical: '/' },
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

  return (
    <html lang={locale} dir={getLocaleDirection(locale)} suppressHydrationWarning className={initialThemeClass}>
      <body className="min-h-screen bg-white text-black antialiased dark:bg-black dark:text-white">
        <ThemeInitScript defaultTheme={safeDefaultTheme} />
        <Providers
          backgroundImage={content.settings?.backgroundImage || ''}
          defaultTheme={defaultTheme}
        >
          <AntdRegistry>
            <EmotionStyleRegistry>
              <LocaleProvider>
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
