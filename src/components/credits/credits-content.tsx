'use client'

import {
  CONTRIBUTORS,
  TEAM,
  TOP_DONORS,
  TRANSLATORS,
} from '@/app/(public)/credits/credits-data'
import { CreditsBrowser } from '@/components/credits/credits-browser'
import { FadeUpSection } from '@/components/fade-up-section'
import { useT } from '@/components/locale-provider'
import { Navigation } from '@/components/navigation'
import { Section } from '@/components/ui/section'

export function CreditsContent() {
  const { t } = useT()

  return (
    <div className="min-h-screen w-full relative">
      <Navigation />
      <main id="main" className="w-full">
        {/* Hero */}
        <Section
          className="flex-col pt-28 sm:pt-32 pb-12 sm:pb-16"
          id="credits"
        >
          <FadeUpSection className="w-full">
            <div className="flex flex-col items-center justify-center pb-8 sm:pb-10 lg:pb-12 text-center">
              <h1 className="inline-flex items-center gap-4 border-b-4 border-primary pb-3 text-3xl font-black uppercase tracking-tight text-primary sm:text-4xl lg:text-5xl">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={38}
                  height={38}
                  viewBox="0 0 24 24"
                  className="inline-block"
                >
                  <g fill="none">
                    <path d="M5 3h14v12l-7 5l-7-5z" />
                    <path
                      stroke="currentColor"
                      strokeLinecap="square"
                      strokeWidth={2}
                      d="M9 8h6m-5 4h4M5 3v12l7 5l7-5V3M5 3H2m3 0h14m0 0h3"
                    />
                  </g>
                </svg>
                {t('credits.heading')}
              </h1>
            </div>
          </FadeUpSection>
        </Section>

        {/* Contributors / Team / Sponsors — searchable, filterable, sortable
        `framed`: ana sayfadaki Blog/Projects bölümleriyle AYNI dış grup
        çerçevesi (2026-10-06, kullanıcı "katkıda bulunanlarda dış gruplama
        çerçeve olmalı, ana sayfa gibi" dedi). */}
        <Section className="flex-col pb-24 sm:pb-32" framed>
          <FadeUpSection className="w-full">
            <CreditsBrowser
              contributors={CONTRIBUTORS}
              team={TEAM}
              translators={TRANSLATORS}
              topDonors={TOP_DONORS}
            />
          </FadeUpSection>
        </Section>
      </main>
    </div>
  )
}
