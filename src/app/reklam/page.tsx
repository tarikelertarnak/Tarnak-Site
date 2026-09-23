import type { Metadata } from 'next'

import { AdWatch } from '@/components/ads/ad-watch'
import { Navigation } from '@/components/navigation'
import { Section } from '@/components/ui/section'

import { getLocale, getLocalizedContent } from '@/lib/i18n-server'

/**
 * /reklam — "gorsel reklam" secildiginde ziyaretcinin yonlendirildigi tam sayfa.
 *
 * Burada reklamlar sayfanin her yerinde: ust banner, ana izleme sahnesi, yan
 * sutun ve alt izgara. Sitenin geri kalaninda reklam YOKTUR — bu bilincli bir
 * sinirdir (hem kullanici deneyimi hem de reklam agi politikalari acisindan
 * "iceriksiz sayfaya reklam yigma" riskini onler).
 *
 * `robots: noindex` — reklam sayfasi arama sonuclarinda gorunmemeli.
 */

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const isEn = locale === 'en'
  return {
    title: isEn ? 'Watch an Ad — TARIK ELER - TARNAK' : 'Reklam İzle — TARIK ELER - TARNAK',
    description: isEn
      ? 'Support my projects without spending money by watching ads. Ads appear only on this page.'
      : 'Para harcamadan destek olmak istersen reklam izleyebilirsin. Reklamlar yalnızca bu sayfada gösterilir.',
    robots: { index: false, follow: false },
  }
}

export default async function AdsPage() {
  const content = await getLocalizedContent()
  const locale = await getLocale()
  const isEn = locale === 'en'

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <main id="main" className="w-full">
        <Section className="flex-col pt-28 sm:pt-32 pb-20 sm:pb-28" framed>
          <AdWatch isEn={isEn} />
        </Section>
      </main>
    </div>
  )
}
