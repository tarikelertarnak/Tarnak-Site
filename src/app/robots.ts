import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site-url'

/**
 * Dinamik robots.txt.
 *
 * Neden: public/robots.txt elle yazilmisti ve Sitemap satirlari
 * `pages.dev` + `github.io` adreslerini gosteriyordu. Canli domain
 * (mxngo.dev) hic gecmiyordu; ayrica pages.dev Cloudflare deployment'i
 * 522 (kapali) oldugu icin olu bir sitemap adresi bildiriliyordu.
 *
 * Artik tek ve dogru sitemap adresi uretiliyor (SITE_URL'e gore).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/login', '/api/', '/puck', '/chat'],
      },
    ],
    sitemap: siteUrl('/sitemap.xml'),
    host: siteUrl('/').replace(/\/$/, ''),
  }
}
