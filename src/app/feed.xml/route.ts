import { getPosts } from '@/lib/blog'
import { SITE_URL } from '@/lib/site-url'

// RSS 2.0 beslemesi.
//
// 2026-10-04: Site blog icerigini Supabase'den okuyup build'de prerender
// ediyor. RSS olmayinca yazilar yalnizca /blog sayfasindan bulunuyordu:
// Google, Yandex ve Bing ucuzlarindan biri botu erken gelip yaziyi
// gormediginde sayfa "yok" sayiliyor ve indekslenmiyor. Feed ucu bu
// ucuzlara yazilarin adresini ucuz bir GET ile bildirir.
//
// `force-static`: sitenin geri kalaniyla ayni karar — build'de uretilir,
// calisma zamaninda Supabase'e gidilmez (Workers Free 10 ms CPU). Yeni yazi
// yayinlandiginda yeniden build gerekir, ancak bu zaten /blog listesi,
// sitemap ve sayfalar icin de gecerli (hepsi build-donmuş).
export const dynamic = 'force-static'

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '\'': '&apos;', '"': '&quot;' }[c] as string
  ))

export async function GET() {
  const posts = await getPosts()
  // Yeni yazi en basta. `date` yyyy-mm-dd; RFC 822'ye ceviriyoruz
  // (oglen UTC — timezone kaymasina izin vermemek icin).
  const items = [...posts]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map(post => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE_URL}/blog/${escapeXml(post.slug)}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${escapeXml(post.slug)}</guid>
      <pubDate>${new Date(`${post.date}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt || '')}</description>
    </item>`)
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tarık Eler (Tarnak) — Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Tarık Eler blog: Next.js, TypeScript, React ve yapay zeka üzerine yazılar.</description>
    <language>tr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // Arama motorlari ve okuyucular bu ucu nadiren sorar; bir gun sure
      // yeter, calisma zamani maliyeti de bu sayede sifir.
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}