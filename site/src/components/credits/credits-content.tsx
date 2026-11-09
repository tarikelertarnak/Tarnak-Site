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
import { TrophyIcon } from '@/components/ui/icons'
import { Section, SectionTitle } from '@/components/ui/section'

export function CreditsContent() {
  const { t } = useT()

  return (
    <div className="min-h-screen w-full relative">
      <main id="main" className="w-full">
        {/*
          BLOG gibi TEK KART (2026-10-31, kullanıcı: "KATKIDA BULUNANLAR
          daki başlık ayrı grup değil, BLOG gibi olmalı").
          Başlık ve içerik aynı `framed` Section içinde.
        */}
        {/*
          BLOG ile BİREBİR AYNI (2026-10-31, kullanıcı: "KATKIDA BULUNANLAR
          daki başlık ayrı gurup değil, BLOG gibi olmalı").

          Ölçülmüş `/blog` yapısı (DOM): kart başlık → `--section-gap` (24px)
          → içerik kartı, ikisi de `framed` (rounded-3xl + border + bg-surface-1).
          Burada da aynısı: başlık KENDİ kartında, içerik İKİNCİ kartta.
          Tek kartta birleştirme — başlık grubu kaybolur.
        */}
        <Section className="flex-col pt-[var(--section-space)]" framed id="credits">
          <FadeUpSection className="flex w-full flex-col items-center">
            <SectionTitle
              title=""
              subTitle={t('credits.heading')}
              description=""
              icon={<TrophyIcon size={36} className="inline-block" />}
              headingLevel="h1"
              big
              tightGap
            />
          </FadeUpSection>
        </Section>
        <div aria-hidden className="h-[var(--section-gap)]" />
        <Section className="flex-col pb-16 sm:pb-20 lg:pb-24" framed>
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
