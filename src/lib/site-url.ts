/**
 * Kanonik origin — canonical URL, og:image, twitter:image, JSON-LD, sitemap ve
 * robots.txt icin tek kaynak.
 *
 * BUG (2026-09-17'de duzeltildi): eskiden yalnizca `process.env.SITE_URL`'e
 * bakiliyor, yoksa `https://tarikelertarnak.github.io` varsayiliyordu. Ama
 * Vercel production'da (mxngo.dev) SITE_URL hicbir yerde set edilmiyor
 * (yalnizca deploy-*.ps1 set ediyor). Sonuc: canli sitede tum canonical
 * URL'ler, og:image ve public/sitemap.xml github.io'ya isaret ediyordu —
 * yani Discord/Twitter/WhatsApp onizlemelerinde KIRIK gorsel, arama
 * motorlarina ise YANLIS kanonik adres bildiriliyordu.
 *
 * Oncelik sirasi:
 *   1. SITE_URL                    — acik override (deploy scriptleri kullanir)
 *   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel'in kalici production domaini
 *   3. VERCEL_URL                  — Vercel preview deployment'i
 *   4. CF_PAGES_URL                — Cloudflare Pages
 *   5. mxngo.dev                   — bilinen canli domain
 */
export const SITE_URL: string
  = process.env.SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  || process.env.CF_PAGES_URL
  || 'https://mxngo.dev'

/** SITE_URL'i yol ile birlestirir (cift slash uretmez). */
export function siteUrl(path = '/'): string {
  const base = SITE_URL.replace(/\/+$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}`
}
