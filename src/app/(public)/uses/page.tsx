import type { Metadata } from 'next'

import { FadeUpItem, FadeUpSection } from '@/components/fade-up-section'
import { Phase6EmptyI18n, Phase6Title } from '@/components/phase6-client'
import { Section } from '@/components/ui/section'
import { getPhase6 } from '@/lib/phase6-server'

export const dynamic = 'force-static'

// Metadata sunucuda sabit TR kalir (getStaticLocale 'tr'); eskiden burada
// `isEn` kosulu hep false oldugu icin EN dalina hic girilmiyordu — olu kod.
export async function generateMetadata(): Promise<Metadata> {
  const title = 'Kullandıklarım — TARIK ELER - TARNAK'
  const desc = 'Her gün kullandığım donanım, yazılım ve servisler.'
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
  const groups = (uses?.groups ?? []).filter(g => g.items.length > 0)

  return (
    <div className="min-h-screen w-full relative">
      <main id="main" className="w-full">
        <Section
          className="flex-col pt-16 sm:pt-24 lg:pt-36 pb-0"
          id="uses"
          framed
        >
          <FadeUpSection className="w-full">
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                <Phase6Title value={uses?.title} kind="uses" />
              </h1>
              {uses?.description ? (
                <p className="max-w-2xl text-sm text-foreground/70">
                  {uses.description}
                </p>
              ) : null}
            </div>
          </FadeUpSection>

          <div className="mt-10 flex flex-col gap-8">
            {groups.length === 0 ? (
              <Phase6EmptyI18n kind="uses" />
            ) : (
              groups.map(group => (
                <FadeUpSection
                  key={group.title}
                  className="w-full"
                  stagger={0.08}
                >
                  <div className="flex flex-col gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">{group.title}</h2>
                      {group.description ? (
                        <p className="mt-1 text-sm text-foreground/60">
                          {group.description}
                        </p>
                      ) : null}
                    </div>
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map(item => (
                        <FadeUpItem key={item.name}>
                          <li
                            className="rounded-xl border border-foreground/10 bg-card/40 p-3"
                          >
                            <p className="text-sm font-medium">
                              {item.href ? (
                                <a
                                  href={item.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-primary"
                                >
                                  {item.name}
                                </a>
                              ) : (
                                item.name
                              )}
                            </p>
                            {item.note ? (
                              <p className="mt-1 text-xs text-foreground/60">
                                {item.note}
                              </p>
                            ) : null}
                          </li>
                        </FadeUpItem>
                      ))}
                    </ul>
                  </div>
                </FadeUpSection>
              ))
            )}
          </div>
        </Section>
      </main>
    </div>
  )
}
