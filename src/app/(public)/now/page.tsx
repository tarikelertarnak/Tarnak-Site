import type { Metadata } from 'next'

import { FadeUpItem, FadeUpSection } from '@/components/fade-up-section'
import { NowGithub } from '@/components/now/now-github'
import { Phase6EmptyI18n, Phase6Title } from '@/components/phase6-client'
import { ClockIcon } from '@/components/ui/icons'
import { Section, SectionTitle } from '@/components/ui/section'
import { getContributionCalendar, getGithubStats } from '@/lib/github-snapshot'
import { getPhase6 } from '@/lib/phase6-server'

export const dynamic = 'force-static'

// Metadata sunucuda sabit TR kalir (getStaticLocale 'tr'); eskiden burada
// `isEn` kosulu hep false oldugu icin EN dalina hic girilmiyordu — olu kod.
export async function generateMetadata(): Promise<Metadata> {
  const title = 'Now — TARIK ELER - TARNAK'
  const desc = 'Şu anda öğrendiklerim, ürettiklerim, okuduklarım ve dinlediklerim.'
  return {
    title,
    description: desc,
    alternates: { canonical: '/now' },
    openGraph: { title, description: desc, url: '/now', type: 'website' },
  }
}

const GRUPLAR = [
  { anahtar: 'learning' },
  { anahtar: 'building' },
  { anahtar: 'reading' },
  { anahtar: 'listening' },
] as const

export default async function NowPage() {
  const p6 = await getPhase6()
  const now = p6?.now
  const dolu = GRUPLAR.filter(g => (now?.[g.anahtar] ?? []).length > 0)

  /*
    GitHub bloğu build anındaki snapshot'tan gelir (ağ yok, fs yok):
    katkı ısı haritası + depo/yıldız/takipçi sayıları.
  */
  const calendar = getContributionCalendar()
  const stats = getGithubStats()

  return (
    <div className="min-h-screen w-full relative">
      <main id="main" className="w-full">
        {/*
          BAŞLIK AYRI KARTTA (2026-10-30, kullanıcı: "Şu an … yazılar bozuk ve
          ayrı grupta değil, aynı BLOG gibi olmalı"). Eskiden başlık elle
          yazılmış `<h1>` + aynı kartta içerikti. Artık `/blog` düzeni:
          başlık kendi `framed` kartında (`SectionTitle big`, h1), 24 px
          boşluk, içerik ikinci kartta.
        */}
        <Section
          className="flex-col pt-[var(--section-space)]"
          id="now"
          framed
        >
          <FadeUpSection className="flex w-full flex-col items-center">
            <SectionTitle
              title=""
              subTitle=""
              subTitleNode={<Phase6Title value={now?.title} kind="now" />}
              description=""
              icon={<ClockIcon size={36} className="inline-block" />}
              headingLevel="h1"
              big
              tightGap
            />
            {now?.updated
              ? (
                  <p className="mt-3 text-sm text-foreground/60">
                    <Phase6Title labelKey="now.updated" />
                    {' '}
                    {now.updated}
                  </p>
                )
              : null}
          </FadeUpSection>
        </Section>
        <div aria-hidden className="h-[var(--section-gap)]" />
        <Section className="flex-col pb-16 sm:pb-20 lg:pb-24" framed>
          <FadeUpSection className="flex w-full flex-col gap-6">
            {now?.intro
              ? (
                  <p className="text-sm text-foreground/80 sm:text-base">
                    {now.intro}
                  </p>
                )
              : null}

            {/* GitHub: sayılar + katkı ısı haritası (build-time snapshot). */}
            <div className="w-full rounded-2xl border border-foreground/10 bg-card/40 p-4 sm:p-5">
              <NowGithub calendar={calendar} stats={stats} />
            </div>

            {dolu.length === 0
              ? (
                  <Phase6EmptyI18n kind="now" />
                )
              : (
                  <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2">
                    {dolu.map(grup => (
                      <FadeUpSection
                        key={grup.anahtar}
                        className="w-full"
                        stagger={0.08}
                      >
                        <div className="flex flex-col gap-3">
                          <h2 className="text-lg font-semibold">
                            <Phase6Title labelKey={`now.${grup.anahtar}`} />
                          </h2>
                          <ul className="flex flex-col gap-2">
                            {(now?.[grup.anahtar] ?? []).map((madde, i) => (
                              <FadeUpItem key={i}>
                                <li
                                  className="rounded-xl border border-foreground/10 bg-card/40 p-3 text-sm text-foreground/80"
                                >
                                  {madde}
                                </li>
                              </FadeUpItem>
                            ))}
                          </ul>
                        </div>
                      </FadeUpSection>
                    ))}
                  </div>
                )}
          </FadeUpSection>
        </Section>
      </main>
    </div>
  )
}
