import type { Metadata } from 'next'

import { FadeUpItem, FadeUpSection } from '@/components/fade-up-section'
import { Phase6EmptyI18n, Phase6Title } from '@/components/phase6-client'
import { ClockIcon } from '@/components/ui/icons'
import { Section, SectionTitle } from '@/components/ui/section'
import { getPhase6 } from '@/lib/phase6-server'

export const dynamic = 'force-static'

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Değişiklikler — TARIK ELER - TARNAK'
  const desc = 'Siteye yapılmış değişiklikler ve güncellemeler.'
  return {
    title,
    description: desc,
    alternates: { canonical: '/changelog' },
    openGraph: { title, description: desc, url: '/changelog', type: 'website' },
  }
}

export default async function ChangelogPage() {
  const p6 = await getPhase6()
  const changelog = p6?.changelog
  const entries = changelog?.entries ?? []

  return (
    <div className="min-h-screen w-full relative">
      <main id="main" className="w-full">
        <Section
          className="flex-col pt-[var(--section-space)]"
          id="changelog"
          framed
        >
          <FadeUpSection className="flex w-full flex-col items-center">
            <SectionTitle
              title=""
              subTitle=""
              subTitleNode={
                <Phase6Title value={changelog?.title} kind="changelog" />
              }
              description=""
              icon={<ClockIcon size={36} className="inline-block" />}
              headingLevel="h1"
              big
              tightGap
            />
          </FadeUpSection>
        </Section>
        <div aria-hidden className="h-[var(--section-gap)]" />
        <Section className="flex-col pb-16 sm:pb-20 lg:pb-24" framed>
          <FadeUpSection className="flex w-full flex-col gap-6">
            {entries.length === 0 ? (
              <Phase6EmptyI18n kind="changelog" />
            ) : (
              <div className="grid w-full grid-cols-1 gap-6">
                {entries.map((entry, i) => (
                  <FadeUpSection key={i} className="w-full" stagger={0.08}>
                    <div className="rounded-xl border border-foreground/10 bg-card/40 p-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-xs text-foreground/50">
                          {entry.date && <span>{entry.date}</span>}
                          {entry.title && (
                            <span className="font-semibold">{entry.title}</span>
                          )}
                        </div>
                        {entry.changes.length > 0 ? (
                          <ul className="flex flex-col gap-2 text-sm text-foreground/75">
                            {entry.changes.map((change, j) => (
                              <FadeUpItem key={j}>
                                <li className="flex gap-2 pl-2">
                                  <span className="text-primary">•</span>
                                  {change}
                                </li>
                              </FadeUpItem>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-foreground/50">
                            Değişiklik kaydı yok.
                          </p>
                        )}
                      </div>
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
