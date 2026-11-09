import type { Metadata } from 'next'

import { FadeUpItem, FadeUpSection } from '@/components/fade-up-section'
import { Phase6EmptyI18n, Phase6Title } from '@/components/phase6-client'
import { LaptopIcon } from '@/components/ui/icons'
import { Section, SectionTitle } from '@/components/ui/section'
import { getPhase6 } from '@/lib/phase6-server'

export const dynamic = 'force-static'

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Kullandıklarım — TARIK ELER - TARNAK'
  const desc = 'Geliştirme ortamında kullandığım donanım ve yazılımlar.'
  return {
    title,
    description: desc,
    alternates: { canonical: '/uses' },
    openGraph: { title, description: desc, url: '/uses', type: 'website' },
  }
}

export default async function UsesPage() {
  const p6 = await getPhase6()
  const uses = p6?.uses
  const dolu = uses?.groups.filter(g => g.items.length > 0) ?? []

  return (
    <div className="min-h-screen w-full relative">
      <main id="main" className="w-full">
        <Section
          className="flex-col pt-[var(--section-space)]"
          id="uses"
          framed
        >
          <FadeUpSection className="flex w-full flex-col items-center">
            <SectionTitle
              title=""
              subTitle=""
              subTitleNode={<Phase6Title value={uses?.title} kind="uses" />}
              description=""
              icon={<LaptopIcon size={36} className="inline-block" />}
              headingLevel="h1"
              big
              tightGap
            />
            {uses?.description ? (
              <p className="mt-3 text-sm text-foreground/60">{uses.description}</p>
            ) : null}
          </FadeUpSection>
        </Section>
        <div aria-hidden className="h-[var(--section-gap)]" />
        <Section className="flex-col pb-16 sm:pb-20 lg:pb-24" framed>
          <FadeUpSection className="flex w-full flex-col gap-6">
            {dolu.length === 0 ? (
              <Phase6EmptyI18n kind="uses" />
            ) : (
              <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {dolu.map(grup => (
                  <FadeUpSection key={grup.title} className="w-full" stagger={0.08}>
                    <div className="flex flex-col gap-3">
                      <h2 className="text-lg font-semibold">{grup.title}</h2>
                      {grup.description && (
                        <p className="text-sm text-foreground/60">{grup.description}</p>
                      )}
                      <ul className="flex flex-col gap-2">
                        {grup.items.map((madde, i) => (
                          <FadeUpItem key={i}>
                            <li className="rounded-xl border border-foreground/10 bg-card/40 p-3 text-sm text-foreground/80">
                              <div className="flex items-start gap-2">
                                <span className="font-semibold text-foreground">
                                  {madde.name}
                                </span>
                                {madde.note && (
                                  <span className="text-xs text-foreground/50">
                                    {madde.note}
                                  </span>
                                )}
                              </div>
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
