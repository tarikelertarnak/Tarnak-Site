import { statSync } from 'node:fs'
import path from 'node:path'
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

/**
 * 2026-10-04: `lastModified` her rota icin `new Date()` idi.
 *
 * Sonuc: sitemap build'de uretildigi icin butun URL'ler her deploy'da "bugun
 * degisti" sinyali veriyordu. Google bunu "sitem her gun degisiyor" diye
 * okuyup tarama frekansini kisiyor — yani biz sitemap'i guncellemek icin
 * yalnizca SEO'yu zedeliyoruz.
 *
 * Gercek degisiklik kaynaklarinin (data/ dosyalarinin) dosya zamanini
 * kullaniyoruz. Veri dosyasi degismisse anlamli bir lastModified olur;
 * degismediyse sitemap eski tarihi korur.
 */
function contentLastmod(): Date {
  const files = [
    path.join(process.cwd(), 'data', 'content.json'),
    path.join(process.cwd(), 'data', 'blog', 'posts.json'),
  ]
  const dates: number[] = []
  for (const f of files) {
    try {
      dates.push(statSync(/* turbopackIgnore: true */ f).mtimeMs)
    }
    catch {
      // dosya yoksa o katkiyi at — digerinden devam et
    }
  }
  // hicbiri bulunamadiysa epoch'a yakin eski bir tarih: "degismedi" demek,
  // her deploy'da bugun demekten daha dogru.
  return new Date(dates.length ? Math.max(...dates) : 0)
}

const CONTENT_LASTMOD = contentLastmod()

/**
 * `trailingSlash: true` oldugu icin Next'in urettigi canonical'lar
 * `https://site/projects/` seklinde BITIYOR. `siteUrl()` ise slash eklemiyor.
 * Once sitemap slash'siz, canonical slash'liydi — tutarsiz sitemap'ler
 * Google'in guvenini zedeliyor. Burada tek form kullanıyoruz: canonical.
 */
const canonicalUrl = (p: string) => (p === '/' ? siteUrl('/') : siteUrl(`${p}/`))

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path: routePath, priority, freq }) => ({
    url: canonicalUrl(routePath),
    lastModified: CONTENT_LASTMOD,
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
      // 2026-10-04: her yazi icin CONTENT_LASTMOD (dosya mtime) kullaniliyordu.
      // Bu, "bu yazi 2020'de yazildi" sinyali yerine "su an degisti" sinyali
      // veriyordu; Google lastModified'a guvenir. Yazinin kendi tarihi elimizde
      // (`post.date`, yyyy-mm-dd) -> onu kullan. Bozuk tarih varsa guvenli
      // tarafa dus (CONTENT_LASTMOD).
      const published = post.date ? new Date(`${post.date}T12:00:00Z`) : null
      const lastModified
        = published && !Number.isNaN(published.getTime())
          ? published
          : CONTENT_LASTMOD
      entries.push({
        url: canonicalUrl(`/blog/${post.slug}`),
        lastModified,
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