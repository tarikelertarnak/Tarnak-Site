import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-url'

export type { Metadata } from 'next'

/**
 * Sayfa metadata'sı — TEK kaynak (Faz 2 · SEO 1)
 *
 * SORUN: Çoğu sayfanın kendi `metadata` export'u YOKTU; hepsi kök
 * layout'ın `alternates.canonical: '/'` değerini miras alıyordu. Yani
 * `/contact/`, `/github/`, `/donate/` sayfalarının hepsi "ben ana sayfayım"
 * diyordu. Google'a "bunlar aynı sayfa" sinyali verir — sayfalar
 * indekslenmez.
 *
 * ÇÖZÜM: Her sayfa buradan metadata alır. `buildMetadata()` tek bir yerden
 * title/description/canonical/openGraph/twitter üretir; elle tekrar yok.
 *
 * KULLANIM (sayfa dosyasında):
 *   import { pageMetadata } from '@/lib/page-metadata'
 *   export const metadata = pageMetadata({
 *     path: '/projects',
 *     title: 'Projeler',
 *     description: '…',
 *   })
 */
export function pageMetadata({
  path,
  title,
  description,
  /** `noindex` gereken sayfalar: arama motoru bu sayfayı indekslemesin. */
  noindex = false,
}: {
  path: string
  title: string
  description: string
  noindex?: boolean
}): Metadata {
  // Baştaki/t sondaki slash yok; `trailingSlash: true` ile tutarlı olsun
  // diye canonical'da slash eklendi.
  const temiz = path.replace(/^\/+|\/+$/g, '')
  const canonical = temiz ? `/${temiz}/` : '/'
  const tamTitle = `${title} — TARIK ELER (Tarnak)`

  return {
    title: tamTitle,
    description,
    alternates: { canonical },
    // `noindex` sayfalar (login, chat, arama sonuçları…) robots.txt'e de
    // yazıldı; burada ikinci bir katman daha koyuyoruz (çift güvence).
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: 'website',
      url: `${SITE_URL}${canonical}`,
      siteName: 'Tarık Eler (Tarnak)',
      title: tamTitle,
      description,
      locale: 'tr_TR',
      images: [
        { url: '/opengraph-image', width: 1200, height: 630, alt: title },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: tamTitle,
      description,
      images: ['/opengraph-image'],
    },
  }
}
