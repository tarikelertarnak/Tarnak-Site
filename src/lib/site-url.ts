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
 * Karar (2026-09-24): yayında olan TEK site `https://tarikelertarnak.pages.dev`
 * — eski GitHub Pages ve Vercel yayından kaldırıldı.
 *
 * FAZ 2 DEĞİŞİKLİĞİ (2026-10-07, kullanıcı isteği: "Site adresi tek bir ortam
 * değişkeninden gelsin (NEXT_PUBLIC_SITE_URL). Kendi alan adımı sonra
 * bağlayacağım"):
 *
 *   Sabit değer → `NEXT_PUBLIC_SITE_URL` (yoksa pages.dev'e düşer).
 *
 * Neden yine de fallback var: build sırasında ortam değişkeni tanımlı
 * olmayabilir (CI'da, preview'da). `SITE_URL` boş string OLAMAZ — canonical,
 * og:image, sitemap, JSON-LD, RSS hepsi bunu kullanıyor; boş olursa
 * `undefined/robots.txt` gibi adresler üretir. Fallback güvenlik ağı.
 *
 * Alan adı değişince YAPILACAK TEK ŞEY: ortam değişkenini güncelle.
 * Kodda başka yerde adres sabiti aramaya gerek yok.
 */
export const SITE_URL: string = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim()
  || 'https://tarikelertarnak.pages.dev'

/** SITE_URL'i yol ile birlestirir (cift slash uretmez). */
export function siteUrl(path = '/'): string {
  const base = SITE_URL.replace(/\/+$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}`
}
