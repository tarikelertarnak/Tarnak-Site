import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site-url'

/**
 * Dinamik robots.txt.
 *
 * Neden: public/robots.txt elle yazilmisti ve Sitemap satirlari
 * `pages.dev` + `github.io` adreslerini gosteriyordu.
 *
 * 2026-09-24 (kullanici istegi):
 * - Sitemap artik TEK ve dogru adres (SITE_URL = https://tarikelertarnak.pages.dev).
 * - `/chat` ve `/reklam` artık INDEXLENIYOR (kullanici: "tarik eler chat"
 *   aramasi /chat'e ulasmali; /reklam da yayinda olan bolum).
 * - `/admin /login /api/ /puck` gizli kalmaya devam ediyor.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/login', '/api/', '/puck'],
      },
    ],
    sitemap: siteUrl('/sitemap.xml'),
    host: siteUrl('/').replace(/\/$/, ''),
  }
}
