import type { Metadata } from 'next'
import { Breadcrumb, BreadcrumbJsonLd } from '@/components/breadcrumb'
import { Navigation } from '@/components/navigation'
import { RememberListPath } from '@/components/remember-list-path'
import { BlogSection } from '@/components/sections/blog-section'
import { getPosts } from '@/lib/blog'
import { CRUMBS } from '@/lib/breadcrumb'
import { getStaticLocale } from '@/lib/i18n-server'
import { siteUrl } from '@/lib/site-url'

// 2026-10-03: ISR KALDIRILDI. revalidate=300 incremental cache (KV) her render'da bir OKUMA+YAZMA yapiyordu; Workers Free 10 ms CPU limitinde bu I/O worker'i asiliyordu (/donate 20 sn+ sonsuz timeout, bazen 200). Sayfa artik tam statik: KV yok, render yok. Admin icerik degisikligi deploy ile yayinlanir.
export const dynamic = 'force-static'

// 2026-10-04: Bu sayfa HIC metadata tasimiyordu. Next metadata'yi child'dan
// parent'a MIRAS ALIR, yani blog listesi su anda ana sayfanin title'ini,
// ana sayfanin description'ini ve — en kotusu — `canonical: '/'` degerini
// paylasiyordu. Yani /blog sayfasi kendini ana sayfa ilan ediyordu
// (self-canonical degil, cross-canonical) ve Google'a "bu sayfa / ile ayni"
// sinyali gidiyordu. Asagida kendi kimligini aliyor.
export const metadata: Metadata = {
  title: 'Blog — Yazılarım | Tarık Eler',
  description:
    'Tarık Eler blog: Next.js, TypeScript, React ve yapay zeka üzerine yazılar. Yazılım geliştirme notları, projeler ve öğrenimler — tarik eler, tarnak.',
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    url: siteUrl('/blog'),
    title: 'Blog — Yazılarım | Tarık Eler',
    description:
      'Next.js, TypeScript, React ve yapay zeka üzerine yazılar. Yazılım geliştirme notları, projeler ve öğrenimler.',
  },
}

export default async function BlogPage() {
  const locale = await getStaticLocale()
  const posts = await getPosts(locale)

  return (
    <div className="min-h-screen w-full relative">
      <Navigation />
      <RememberListPath path="/blog" />
      <main id="main" className="contents">
        {/* Breadcrumb (Faz 2 · SEO 2) */}
        <div className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6 sm:pt-28">
          <Breadcrumb items={CRUMBS['/blog']} />
          <BreadcrumbJsonLd items={CRUMBS['/blog']} />
        </div>
        <BlogSection posts={posts} />
      </main>
    </div>
  )
}
