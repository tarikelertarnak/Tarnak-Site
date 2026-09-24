import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site-url'

/**
 * Dinamik sitemap.
 *
 * 2026-09-24 (kullanici istegi): TEK yayin adresi https://tarikelertarnak.pages.dev.
 * SITEMAP'a tum indexlenebilir rotalar eklendi (/chat + /reklam dahil — artik
 * robots.txt'te Disallow degiller). /admin, /login, /api, /puck gizli oldugundan
 * listede yok. Blog yazilari varsa dinamik eklenir.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  const routes: Array<{
    path: string
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
    priority: number
  }> = [
    { path: '/', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/projects', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/blog', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/chat', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/reklam', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/github', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/search', changeFrequency: 'monthly', priority: 0.4 },
    { path: '/credits', changeFrequency: 'monthly', priority: 0.3 },
  ]

  return routes.map(r => ({
    url: siteUrl(r.path),
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
    // Image sitemap — görsel aramada logo çıksın diye ana sayfaya logo eklendi
    // (Google image sitemap: <image:image><image:loc>...).
    ...(r.path === '/'
      ? {
          images: [
            siteUrl('/tarik-eler-tarnak-logo.png'),
            siteUrl('/logo.png'),
            siteUrl('/tarnak-white.svg'),
          ],
        }
      : {}),
  }))
}
