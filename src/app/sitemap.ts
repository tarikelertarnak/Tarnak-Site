import type { MetadataRoute } from 'next'
import { getPosts } from '@/lib/blog'
import { siteUrl } from '@/lib/site-url'

/**
 * Sitemap — 2026-10-03'te statik public/sitemap.xml dosyasindan route'a tasindi.
 *
 * Neden: statik dosya blog yazilarini hicbIR zaman bilemez (slug'lar Supabase'den
 * geliyor) ve elle tutuldugu icin silinen sayfalar (/sign, /profil, /cv) sitemap'te
 * kaliyordu -> GSC "Getirilemedi" + 5 bozuk URL.
 *
 * `revalidate` YOK: build'de uretilir ve hicbir zaman stale olmaz. Daha once
 * `revalidate = 3600` vardi; bu, sitemap kaydini da stale'e dusurup ayni dummy
 * queue hatasini tetikliyordu (bkz. src/app/layout.tsx yorumu). Sitemap'in
 * guncel kalmasi icin yeniden build yeterli — her istekte Supabase'e gidilmez
 * (1102 CPU riski yok).
 *
 * Liste: yalnizca indekslenebilir public rotalar. force-dynamic uygulama sayfalari
 * (/chat, /search, /login, /sign) ve var olmayanlar (/profil, /cv) bilerek disarida.
 * /cv bir sayfa degil, PDF yolu (/cv/tarikeler-cv.pdf) — PDF sitemap'e girmez.
 */

/** Indexable public routes, most important first. */
const STATIC_ROUTES: Array<{ path: string; priority: number; freq: 'daily' | 'weekly' | 'monthly' }> = [
  { path: '/', priority: 1, freq: 'daily' },
  { path: '/projects', priority: 0.8, freq: 'weekly' },
  { path: '/blog', priority: 0.8, freq: 'daily' },
  { path: '/github', priority: 0.7, freq: 'weekly' },
  { path: '/about', priority: 0.7, freq: 'monthly' },
  { path: '/donate', priority: 0.5, freq: 'monthly' },
  { path: '/credits', priority: 0.4, freq: 'monthly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const today = new Date()
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, priority, freq }) => ({
    url: siteUrl(path),
    lastModified: today,
    changeFrequency: freq,
    priority,
  }))

  // Blog posts: best-effort. Bir hata sitemap'i BOZMAMALI — Google'a yarim ve
  // 500'lu bir sitemap vermek, hic vermemekten kotudur.
  try {
    const posts = await getPosts()
    for (const post of posts) {
      if (!post?.slug)
        continue
      entries.push({
        url: siteUrl(`/blog/${post.slug}`),
        lastModified: post.date ? new Date(post.date) : today,
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    }
  }
  catch (err) {
    console.error('[sitemap] blog yazilari alinamadi, statik rotalar gonderiliyor', err)
  }

  return entries
}
