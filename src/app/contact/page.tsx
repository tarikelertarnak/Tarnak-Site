import { Footer } from '@/components/footer'
import { Navigation } from '@/components/navigation'
import { ContactSection } from '@/components/sections/contact-section'
import { getStaticLocalizedContent } from '@/lib/i18n-server'

/**
 * 2026-10-04: `#contact` çapası kaldırıldı — hero'daki "İletişim" düğmesi
 * artık gerçek bir rotaya gidiyor. Bu sayfa ana sayfadaki formun birebir
 * aynısını gösterir, tek içerik kaynağı `ContactSection`.
 *
 * 2026-10-02 Cloudflare 1102 fix: build-time prerender (page.tsx ile aynı
 * gerekçe — dynamic route her istekte 13 MB handler SSR'liyor).
 */
export const dynamic = 'force-static'

export default async function ContactPage() {
  const content = await getStaticLocalizedContent()

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <main id="main" className="w-full">
        <ContactSection content={content} />
      </main>
      <Footer content={content} />
    </div>
  )
}
