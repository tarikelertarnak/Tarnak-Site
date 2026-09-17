import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site-url'

/**
 * Dinamik sitemap.
 *
 * Neden: public/sitemap.xml elle yazilmisti ve icindeki 9 URL'in TAMAMI
 * `https://tarikelertarnak.github.io` adresine isaret ediyordu. Canli site
 * mxngo.dev oldugu icin arama motorlarina yanlis kanonik adres bildiriliyordu.
 *
 * Burada SITE_URL kullanildigi icin her hedef kendi dogru adresini uretir:
 * Vercel -> mxngo.dev, GitHub Pages -> github.io, Cloudflare -> pages.dev.
 *
 * Not: `/chat` listeden CIKARILDI — robots.txt onu Disallow ediyor; hem
 * engellenip hem sitemap'te yer alan bir URL celiskili ve zararli bir sinyaldir.
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
    { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/blog', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/donate', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/github', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/search', changeFrequency: 'monthly', priority: 0.4 },
    { path: '/credits', changeFrequency: 'monthly', priority: 0.3 },
  ]

  return routes.map(r => ({
    url: siteUrl(r.path),
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
}
