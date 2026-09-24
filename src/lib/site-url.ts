/**
 * Kanonik origin — canonical URL, og:image, twitter:image, JSON-LD, sitemap ve
 * robots.txt icin tek kaynak.
 *
 * BUG (2026-09-24'te duzeltildi): `process.env.CF_PAGES_URL` her Cloudflare
 * Pages deployment'i icin DEGISEN bir hash URL uretiyor (3e5e5197.tarikelertarnak.pages.dev gibi).
 * Ayrica Vercel fallback'leri de (mxngo.dev) tasiniyordu. Sonuc: canli sitede
 * canonical URL'ler, og:image ve sitemap deploy-specific hash'li adreslere
 * isaret ediyordu — arama motorlarina ve paylasim onizlemelerine YANLIS adres
 * bildiriliyordu.
 *
 * Karar (kullanici 2026-09-24): yayinda olan TEK site
 * `https://tarikelertarnak.pages.dev` — eski GitHub Pages (github.io) ve Vercel
 * (mxngo.dev) yayindan kaldirildi. Bu yuzden SITE_URL artik SABITTIR ve
 * ortam degiskenleri onu ezemez (preview/hash URL'lerinin canonical'a sizmasini
 * onler).
 */
export const SITE_URL: string = 'https://tarikelertarnak.pages.dev'

/** SITE_URL'i yol ile birlestirir (cift slash uretmez). */
export function siteUrl(path = '/'): string {
  const base = SITE_URL.replace(/\/+$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}`
}
