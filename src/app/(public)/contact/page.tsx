import { Breadcrumb, BreadcrumbJsonLd } from '@/components/breadcrumb'
import { Navigation } from '@/components/navigation'
import { ContactSection } from '@/components/sections/contact-section'
import { CRUMBS, resolveCrumbs } from '@/lib/breadcrumb'
import { t } from '@/lib/i18n'
import { getStaticLocalizedContent } from '@/lib/i18n-server'
import { pageMetadata } from '@/lib/page-metadata'

/**
 * 2026-10-04: `#contact` çapası kaldırıldı — hero'daki "İletişim" düğmesi
 * artık gerçek bir rotaya gidiyor. Bu sayfa ana sayfadaki formun birebir
 * aynısını gösterir, tek içerik kaynağı `ContactSection`.
 *
 * 2026-10-05 (kullanıcı): footer KALDIRILDI — sayfa "konumunun altında
 * footer olmasın". `/contact/` artık formla biter. `Footer` import'u da
 * kaldırıldı, kullanılmayan import lint hatası verirdi.
 *
 * 2026-10-02 Cloudflare 1102 fix: build-time prerender (page.tsx ile aynı
 * gerekçe — dynamic route her istekte 13 MB handler SSR'liyor).
 */
export const dynamic = 'force-static'

export const metadata = pageMetadata({
  path: '/contact',
  title: 'İletişim',
  description:
    'Tarık Eler (Tarnak) ile iletişime geç: e-posta, telefon, Discord ve iletişim formu.',
})

export default async function ContactPage() {
  const content = await getStaticLocalizedContent()

  return (
    <div className="min-h-screen w-full relative">
      <Navigation />
      <main id="main" className="w-full">
        {/* Breadcrumb: görünür navigasyon + BreadcrumbList */}
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <Breadcrumb items={CRUMBS['/contact']} />
          {/* JSON-LD: SEO bilinçli sınır — statik TR etiketler. */}
          <BreadcrumbJsonLd items={resolveCrumbs(CRUMBS['/contact'], k => t('tr', k))} />
        </div>
        <ContactSection content={content} />
      </main>
    </div>
  )
}
