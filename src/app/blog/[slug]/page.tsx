import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TrackBlogView } from '@/app/blog/[slug]/track-view'
import { BackToListButton } from '@/components/back-to-list-button'
import { Navigation } from '@/components/navigation'
import { getPostBySlug } from '@/lib/blog'
import { t } from '@/lib/i18n'
import { getStaticLocale, getStaticLocalizedContent } from '@/lib/i18n-server'
import { getPosts } from '@/lib/blog'
import { renderMarkdown } from '@/lib/markdown'
import { siteUrl } from '@/lib/site-url'

// 2026-10-04: force-dynamic -> force-static.
//
// KOK NEDEN: `getLocale()` cookies()/headers() okudugu icin route dinamik
// sayiliyordu. Bu sayfa worker'a dustugu icin HER istekte tam SSR + Supabase
// fetch yapiliyordu -> Workers Free 10 ms CPU limiti asti -> 503. Diger 7
// public sayfa 2026-10-03'te ayni sebepten static'e alinmisti; blog detay
// sonra kalan tek SSR rotasiydi.
//
// Cozum: build'de `generateStaticParams` ile mevcut yazilar prerender
// ediliyor (cagiran `getPosts()` Supabase + data/blog/posts.json birlestirir).
// Locale icin `getStaticLocale()` (sabit 'tr') kullaniliyor — diger public
// sayfalarla ayni pattern; hydration sonrasi istemci dili zaten uyguluyor.
// Yeni yazi eklenince admin kaydettikten sonra deploy yeterli (zaten tek
// yayin yolu deploy).
export const dynamic = 'force-static'

// 2026-10-04 — SOFT-404 KALICI COZUMU. Olcum: `/blog/yok-boyle-yazi` ->
// 200, `x-nextjs-prerender: 1`, `s-maxage=31536000`, title "TARIK ELER (TARNAK)",
// canonical "/" — yani 404 EKRANI 200 + ANA SAYFA METADATA'si ile servis
// ediliyordu. Neden: `generateStaticParams` bos donuyor (posts=0) ve
// `dynamicParams` varsayilan TRUE oldugu icin Next slug'i runtime'da render
// ediyor; render'da notFound() 404 HTML uretiyor ama OpenNext prerender
// girdisini 200 ile cache'liyor. Ayrica notFound()'u generateMetadata'da
// cagrimak yetmiyor — cagriyoruz, yine de 200.
//
// `dynamicParams = false` bunu kalici olarak kapatir: generateStaticParams
// listesinde OLMAYAN her slug hic render edilmez, dogrudan 404 doner.
// Bu zaten dogru davranis: site tam statik, yeni yazi = yeni deploy (admin
// paneli zaten deploy gerektiriyor). Yarar: yanlislikla/invented URL'ler
// arama motoruna soft-404 olarak gitmez.
export const dynamicParams = false

/** Mevcut yayindaki yazilar build'de prerender edilir. */
export async function generateStaticParams() {
  const posts = await getPosts('tr')
  return posts.map(post => ({ slug: post.slug }))
}
interface PostPageProps {
  params: Promise<{ slug: string }>
}
export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params
  // No getLocale() here — cookies() in generateMetadata throws
  // "Page changed from static to dynamic" on the Cloudflare worker.
  // Title variant falls back to 'tr' (body still localizes correctly).
  const post = await getPostBySlug(slug)
  if (!post) {
    // `dynamicParams = false` sayesinde buraya pratikte SADECE build'de
    // prerender edilmis, DB'de hala duran bir slug gelir. Save edilen ama
    // henuz deploy edilmemis yazi bu duruma girer: 404 dogru (henuz
    // yayinda degil), ama nofollow metadata ile signal'i guclendir.
    return {
      title: 'Yazı bulunamadı | Tarık Eler',
      description: 'Aranan blog yazısı bulunamadı.',
      robots: { index: false, follow: false },
    }
  }

  // 2026-10-04: Once sadece `${title} - Blog` vardi. Sonuc: description YOK
  // (ana sayfaninki miras kaliyordu), canonical YOK (layout'tan `/` geliyordu,
  // yani her blog yazisi kendini ana sayfa ilan ediyordu) ve og:type 'website'
  // idi. Arama motoru blog yazisini sayfa ne anlatiyor, ne yazar, ne zaman
  // yayimlandi bilmiyordu.
  const description = (post.excerpt || '').trim()
    || post.content
      .replace(/```[\s\S]*?```/g, ' ') // kod bloklarini at
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // gorselleri at
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // link metnini birak
      .replace(/[#>*_`~|-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 157)
  const title = `${post.title} | Tarık Eler`
  const canonical = `/blog/${post.slug}`
  const url = siteUrl(canonical)
  // created_at'ten gun only (yyyy-mm-dd) -> noon UTC, timezone'un gunu
  // geriye almamasina izin vermemek icin.
  const date = new Date(`${post.date}T12:00:00Z`)

  return {
    title,
    description,
    keywords: post.tags,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      siteName: 'Tarık Eler (Tarnak)',
      locale: 'tr_TR',
      publishedTime: date.toISOString(),
      authors: ['Tarık Eler'],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}
export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params
  const locale = await getStaticLocale()
  const post = await getPostBySlug(slug, locale)
  if (!post) {
    // generateMetadata zaten notFound() cagriyordu; bu savunma katmani
    // (post build ile istek arasinda silinmis olabilir).
    notFound()
  }
  const content = await getStaticLocalizedContent()
  return (
    <div className="min-h-screen w-full relative">
      {' '}
      <Navigation content={content} />
      {' '}
      <TrackBlogView slug={post.slug} />
      {' '}
      <main
        id="main"
        className="md:ml-[240px] relative z-10 mx-auto flex w-full max-w-3xl flex-col px-4 sm:px-6 py-24 sm:py-32"
      >
        {' '}
        <div className="mb-6 flex items-center gap-3">
          {' '}
          <BackToListButton fallback="/blog" />
          {' '}
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-foreground-500 transition-colors hover:text-primary"
          >
            {' '}
            {t(locale, 'blog.backToBlog')}
            {' '}
          </Link>
          {' '}
        </div>
        {' '}
        <article className="rounded-large bg-background p-4 sm:p-8 lg:p-10 ">
          {' '}
          {/* BlogPosting structured data — Google/Bing "Article" sonucu ve
              zengin snippet (yazar, tarih, okuma suresi) icin. Sayfa basligi
              markup'i zaten var, JSON-LD ile makaleye baglaniyor. */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'BlogPosting',
                mainEntityOfPage: {
                  '@type': 'WebPage',
                  '@id': siteUrl(`/blog/${post.slug}`),
                },
                headline: post.title,
                description: post.excerpt || undefined,
                datePublished: `${post.date}T12:00:00Z`,
                dateModified: `${post.date}T12:00:00Z`,
                inLanguage: 'tr',
                keywords: post.tags?.join(', ') || undefined,
                wordCount: post.content.split(/\s+/).filter(Boolean).length,
                timeRequired: `PT${Math.max(1, Math.round(post.content.split(/\s+/).filter(Boolean).length / 200))}M`,
                author: {
                  '@type': 'Person',
                  name: 'Tarık Eler',
                  alternateName: ['Tarnak', 'tarikelertarnak'],
                  url: siteUrl('/'),
                },
                publisher: {
                  '@type': 'Person',
                  name: 'Tarık Eler',
                  alternateName: ['Tarnak'],
                  url: siteUrl('/'),
                },
                image: `${siteUrl('/')}/tarik-eler-tarnak-logo.png`,
              }),
            }}
          />
          <header className="mb-6 flex flex-col gap-2">
            {' '}
            <p className="text-xs sm:text-sm text-foreground-500">
              {' '}
              {new Date(post.date).toLocaleDateString(
                locale === 'tr' ? 'tr-TR' : 'en-GB',
                { day: 'numeric', month: 'long', year: 'numeric' },
              )}
              {' '}
            </p>
            {' '}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
              {post.title}
            </h1>
            {' '}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-1 flex flex-row flex-wrap gap-1.5">
                {post.tags.map(tag => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {' '}
          </header>
          {' '}
          <div
            className="markdown-body text-sm sm:text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />
          {' '}
        </article>
        {' '}
      </main>
      {' '}
    </div>
  )
}
