import type { Metadata, Viewport } from 'next'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import { headers } from 'next/headers'
import { EmotionStyleRegistry } from '@/components/emotion-style-registry'
import { LocaleProvider } from '@/components/locale-provider'
import { MusicPlayer } from '@/components/music-player'
import { Providers } from '@/components/providers'
import { ScrollToTop } from '@/components/scroll-to-top'
import { SearchDialog } from '@/components/search-dialog'
import { GLOBAL_SHORTCUTS, Shortcuts } from '@/components/shortcuts'
import { Sidebar } from '@/components/sidebar'
import { SkipLink } from '@/components/skip-link'
import { ThemeInitScript } from '@/components/theme-init-script'

import { TopBar } from '@/components/top-bar'
import { getContent } from '@/lib/content'
import { generateCspNonce } from '@/lib/csp-nonce'
import { getLocaleDirection, getStaticLocale } from '@/lib/i18n-server'
import {
  BING_VERIFICATION,
  GOOGLE_SITE_VERIFICATION,
  YANDEX_VERIFICATION,
} from '@/lib/search-verification'
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
      'index': true,
      'follow': true,
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
      /*
        hreflang — 2026-10-05 eklendi, 2026-10-06 KALDIRILDI.

        Neden geri alindi: Sitede yol bazli dil yonlendirmesi YOK.
        Dil, `site-locale` cookie'si + Accept-Language ile cozuluyor
        (bkz. src/lib/i18n.ts: detectLocale/resolveLocale) — yani her sayfa
        icin TEK bir URL var. `TRANSLATED_LOCALES.map(...)` ile uretilen
        `/en/`, `/de/` ... adresleri canlida 404 donuyordu.

        Canli olcum (2026-10-06): /en/ /de/ /es/ /fr/ /ja/ /pt/ /ru/ -> hepsi 404.
        Google'a 404'e giden hreflang vermek "bu sayfa bu dilde de var"
        yalanidir: linkleri bos cikarir, crawl butcesi harcanir ve
        dogrulanamayan alternatifler sinyal kalitesini dusurur.

        Dogru cozum yol bazli i18n routing'i (orn. app/[locale]/...) +
        o sayfalarin sitemap'e eklenmesi — ayri bir is. Bu kadar kazanmak
        icin kirilmis hreflang bildirmektense hic bildirmemek daha iyi.
      */
      // languages: ...  // 2026-10-06: yol bazli locale route yok, bildirim kaldirildi.
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
    // Favicon seti artık `Pictures\Önemli\TARNAK\favicons\favicons-logo_framed.zip`
    // içinden geliyor (çerçeveli marka logosu, 2026-10-05). ZIP'in kendi
    // snippet.html'i ile birebir aynı dosyalar; `android-chrome-*` ve
    // `/logo.png` gibi VAR OLMAYAN dosyalara işaret eden eski girdiler
    // kaldırıldı — tarayıcı 404 alıyordu.
    // `?v=4` cache kırmak için: dosya içeriği değişti, aynı URL'de eski
    // favicon 30 gün (SWR) servis edilirdi.
    icons: {
      icon: [
        { url: '/favicon.ico?v=4', sizes: '48x48', type: 'image/x-icon' },
        { url: '/favicon.svg?v=4', type: 'image/svg+xml' },
        { url: '/favicon-16x16.png?v=4', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png?v=4', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-48x48.png?v=4', sizes: '48x48', type: 'image/png' },
        { url: '/favicon-96x96.png?v=4', sizes: '96x96', type: 'image/png' },
        { url: '/icon-192x192.png?v=4', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512x512.png?v=4', sizes: '512x512', type: 'image/png' },
      ],
      apple: [
        { url: '/apple-touch-icon.png?v=4', sizes: '180x180', type: 'image/png' },
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
      { url: '/opengraph-image', width: 1200, height: 630, alt: 'Tarik Eler (Tarnak) - Yazilimci & Sistem Mimarisi' },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/opengraph-image'],
    },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const content = await getContent()
  const locale = await getStaticLocale()
  /*
   * CSP nonce (2026-10-07). `src/proxy.ts` her istekte nonce üretip `x-nonce`
   * istek header'ı olarak taşıyor; tema init script'i buradan alıyor.
   *
   * ⚠️ `export const dynamic = 'force-static'` yüzünden Next `headers()`'ı
   * BOŞ döndürür (bkz. next/dist/server/request/headers.js — forceStatic
   * durumunda boş Headers döner, dinamik bailout da olmaz). Yani statik
   * üretilen bu layout'ta nonce `undefined` kalır ve tema script'i nonce'suz
   * basılır. Şu an CSP REPORT-ONLY olduğu için bu bir ihlal değil, sadece
   * raporlanan bir eksik. Enforcing'e geçmeden önce ya `force-static`
   * kaldırılmalı ya da tema script'i build-time hash ile CSP'ye eklenmeli
   * (bkz. next.config.mjs "ENFORCING MODA GEÇİŞ" bloğu).
   *
   * `x-nonce` yoksa (statik export / build) yeni nonce üretiyoruz: yine de
   * geçerli bir nonce, sadece header ile eşleşmeyebilir.
   */
  const nonce = (await headers()).get('x-nonce') ?? generateCspNonce()
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
    // `data-scroll-behavior="smooth"` Next'in uyarisini keser: global
  // `scroll-behavior: smooth` (globals.css) aktifken rota gecislerinde
  // kaydirma animasyonunu Next'in devralabilmesini saglar.
    <html lang={locale} dir={getLocaleDirection(locale)} suppressHydrationWarning className={initialThemeClass} data-theme={initialThemeData} data-scroll-behavior="smooth">
      {/* `suppressHydrationWarning` (2026-10-06):
          React konsoluna düşen "A tree hydrated but some attributes of the
          server rendered HTML didn't match" hatasının KESİN kaynağı ölçüldü:

            sunucu <html class="dark">                 (style yok)
            istemci <html class="dark" style="color-scheme: dark;">
            sunucu <body class="min-h-screen …">       (style yok)
            istemci <body class="min-h-screen …" style="visibility: visible;">

          `ThemeInitScript` (aşağıda) tema tercihini `localStorage`'dan
          okuyup bu iki `style`'ı parse anında — yani React hydration'ından
          ÖNCE — yazıyor. Amaç FOUC'u (beyaz flaş) önlemek ve doğru çalışıyor.

          React bu kasıtlı farkı "sunucu HTML'i değişmiş" sanıyor. Buradaki
          `suppressHydrationWarning`, tam olarak bu senaryo için vardır:
          hydration'dan önce script'in yazdığı nitelikler. `<html>`'de zaten
          vardı ama `<body>`'de yoktu — bu yüzden uyarı sürüyordu. */}
      <body suppressHydrationWarning className="min-h-screen bg-white text-black antialiased dark:bg-black dark:text-white">
        {/* SEO — Person + WebSite structured data (Google / Yandex rich snippets) */}
        <script
          type="application/ld+json"
          // nonce: JSON-LD `type="application/ld+json"` tarayıcıda ÇALIŞMAZ
          // (veri bloğu), ama nonce eklemek zararı yok ve politika ile tutarlı.
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'Person',
                // 2026-10-05 (kullanıcı): isim sırası netleştirildi —
                // Tarık (ad) / Eler (soyad) / Tarnak (takma ad, marka).
                // `name` resmî tam ad; `alternateName` içinde takma ad ve
                // yaygın yazım varyantları.
                'name': 'Tarık Eler',
                // 2026-10-06: 9 varyanttan 3'e indirildi. `alternateName`
                // "bu kişinin diğer gerçek adları" demektir; 'tarikelertarnak',
                // 'elertarik', 'tarik eler tarnak' gibi heceleme varyantları
                // Google'a spam sinyali veriyor. Gercek alternatifler:
                // marka/takma ad + yaygin buyuk-harf yazim.
                'alternateName': ['Tarnak', 'Tarık Eler Tarnak', 'TARIK ELER'],
                'url': SITE_URL,
                'image': `${SITE_URL}/opengraph-image`,
                'logo': `${SITE_URL}/icon-512x512.png`,
                'jobTitle': 'Web Developer',
                /*
                 * sameAs (Faz 2 · SEO 3, kullanıcı isteği): "sosyal linkleri
                 * content dosyasından oku, bilmediğin linki uydurma".
                 *
                 * ÖNCE HATA: `tarikelertarnak.pages.dev` (sitenin KENDİ adresi)
                 * sameAs içindeydi. `sameAs` = "bu kişinin başka yerlerdeki
                 * profilleri"; sitenin kendi adresi orada olmaz, `url`
                 * alanında durur. Google'a yanlış sinyal veriyordu.
                 *
                 * Şimdi: `content.nav.social` içindeki GERÇEK, boş olmayan
                 * http(s) bağlantıları. Admin panelinden sosyal eklenip
                 * çıkarılınca JSON-LD otomatik güncellenir; uydurma link yok.
                 */
                'sameAs': (content.social ?? [])
                  .map((s: { href?: string }) => s?.href?.trim())
                  .filter((h: string | undefined): h is string => !!h && /^https?:\/\//i.test(h)),
                'knowsAbout': ['Next.js', 'TypeScript', 'Web Development', 'React', 'Yapay Zeka'],
              },
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                'name': 'Tarık Eler (Tarnak)',
                // 2026-10-06: 19 varyant -> 1. WebSite icin `alternateName`
                // gereksiz: `name` zaten "Tarık Eler (Tarnak)" diyor.
                'alternateName': ['Tarnak'],
                'url': SITE_URL,
                'inLanguage': ['tr', 'en'],
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
        <ThemeInitScript defaultTheme={safeDefaultTheme} nonce={nonce} />
        <Providers
          backgroundImage={content.settings?.backgroundImage || ''}
          defaultTheme={defaultTheme}
        >
          <AntdRegistry>
            <EmotionStyleRegistry>
              <LocaleProvider detectedLocale={locale}>
                <SkipLink />
                {/*
                  Klavye kısayolları — TEK kayıt noktası, tüm rotalarda
                  (2026-10-05, kullanıcı). Bileşen `null` render eder, sadece
                  `keydown` dinler.

                    Ctrl/⌘+K  arama          (zaten vardı: search-dialog.tsx)
                    Ctrl/⌘+B  sol yan panel   (yeni)
                    Ctrl/⌘+/  ayarlar paneli  (yeni)
                    Escape     panel/menü kapat (bileşenlerin kendi handler'ı)
                    Ctrl/⌘+↑↓ sayfa kaydırma  (yeni)

                  `Shortcuts` yazarken (input/textarea/contenteditable) hiçbir
                  kısayol çalışmaz — Ctrl+B yazıyı kalınlaştırmak için basılır,
                  yanlışlıkla panel açılırsa odak kaybolur ve kullanıcının
                  yazdığı metin kaybolur. Modal/drawer açıkken de yeni kısayol
                  tetiklenmez.
                */}
                <Shortcuts shortcuts={GLOBAL_SHORTCUTS} />
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
