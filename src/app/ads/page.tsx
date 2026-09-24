import type { Metadata } from 'next'

import { AdWatch } from '@/components/ads/ad-watch'
import { Navigation } from '@/components/navigation'
import { Section } from '@/components/ui/section'

import { getLocalizedContent } from '@/lib/i18n-server'

/**
 * /ads — "watch an ad" sayfasinin ingilizce karsiligi.
 *
 * /reklam ile ayni bilesen ve yapi; tek fark arayuz ve metadata her zaman
 * Ingilizce'dir (kucuk harfli /ads yolu, buyuk harfli baslikla karismasin).
 * `robots: noindex` — reklam sayfasi arama sonuclarinda gorunmemeli.
 */

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Watch an Ad — TARIK ELER - TARNAK',
    description: 'Support my projects without spending money by watching ads. Ads appear only on this page.',
    robots: { index: false, follow: false },
  }
}

export default async function AdsPage() {
  const content = await getLocalizedContent()

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <main id="main" className="w-full">
        <Section className="flex-col pt-28 sm:pt-32 pb-20 sm:pb-28" framed>
          <AdWatch isEn />
        </Section>
      </main>
    </div>
  )
}
