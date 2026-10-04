import { Navigation } from '@/components/navigation'
import { RememberListPath } from '@/components/remember-list-path'
import { BlogSection } from '@/components/sections/blog-section'
import { getPosts } from '@/lib/blog'
import { getStaticLocale, getStaticLocalizedContent } from '@/lib/i18n-server'

// 2026-10-03: ISR KALDIRILDI. revalidate=300 incremental cache (KV) her render'da bir OKUMA+YAZMA yapiyordu; Workers Free 10 ms CPU limitinde bu I/O worker'i asiliyordu (/donate 20 sn+ sonsuz timeout, bazen 200). Sayfa artik tam statik: KV yok, render yok. Admin icerik degisikligi deploy ile yayinlanir.
export const dynamic = 'force-static'

export default async function BlogPage() {
  const locale = await getStaticLocale()
  const [posts, content] = await Promise.all([
    getPosts(locale),
    getStaticLocalizedContent(),
  ])

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <RememberListPath path="/blog" />
      <main id="main" className="contents">
        <BlogSection posts={posts} />
      </main>
    </div>
  )
}
