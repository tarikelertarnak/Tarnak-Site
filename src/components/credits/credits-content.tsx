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
import { TrophyIcon } from '@/components/ui/icons'
import { Section, SectionTitle } from '@/components/ui/section'

export function CreditsContent() {
  const { t } = useT()

  return (
    <div className="min-h-screen w-full relative">
      <Navigation />
      <main id="main" className="w-full">
        {/*
          BLOG düzeniyle hizalandı (2026-10-21, kullanıcı: "CONTRIBUTORS'taki
          yazı yanlış yerde, BLOG gibi olmalı").

          ÖNCE: başlık ÇERÇEVESİZ ayrı bir Section'da, elle yazılmış `<h1>` +
          `border-b-4` ile. İçerik ayrı `framed` Section'daydı → başlık grupla
          birleşmiyordu, /blog'dan farklı duruyordu.

          ŞİMDİ: `/blog` (BlogSection) ile AYNI yapı — tek `framed` Section,
          başlık `SectionTitle` ile grubun İÇİNDE, boşluk `--section-gap`.
        */}
        <Section
          className="flex-col pt-28 sm:pt-32 pb-24 sm:pb-32"
          framed
          id="credits"
        >
          <SectionTitle
            title=""
            subTitle={t('credits.heading')}
            description=""
            icon={<TrophyIcon size={36} className="inline-block" />}
            headingLevel="h1"
            big
            tightGap
          />
          <div aria-hidden className="h-[var(--section-gap)]" />

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
