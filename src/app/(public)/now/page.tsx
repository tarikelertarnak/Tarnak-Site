import type { Metadata } from 'next'

import { FadeUpItem, FadeUpSection } from '@/components/fade-up-section'
import { Navigation } from '@/components/navigation'
import { Section } from '@/components/ui/section'
import { getPhase6, Phase6Empty } from '@/lib/phase6-server'

export const dynamic = 'force-static'

// Metadata sunucuda sabit TR kalir (getStaticLocale 'tr'); eskiden burada
// `isEn` kosulu hep false oldugu icin EN dalina hic girilmiyordu — olu kod.
export async function generateMetadata(): Promise<Metadata> {
  const title = 'Şu an — TARIK ELER - TARNAK'
  const desc = 'Şu anda öğrendiklerim, ürettiklerim, okuduklarım ve dinlediklerim.'
  return {
    title,
    description: desc,
    alternates: { canonical: '/now' },
    openGraph: { title, description: desc, url: '/now', type: 'website' },
  }
}

const GRUPLAR = [
  { anahtar: 'learning', baslik: 'Öğrendiklerim' },
  { anahtar: 'building', baslik: 'Ürettiklerim' },
  { anahtar: 'reading', baslik: 'Okuduklarım' },
  { anahtar: 'listening', baslik: 'Dinlediklerim' },
] as const

export default async function NowPage() {
  const p6 = await getPhase6()
  const now = p6?.now
  const dolu = GRUPLAR.filter(g => (now?.[g.anahtar] ?? []).length > 0)

  return (
    <div className="min-h-screen w-full relative">
      <Navigation />
      <main id="main" className="w-full">
        <Section
          className="flex-col pt-16 sm:pt-24 lg:pt-36 pb-0"
          id="now"
          framed
        >
          <FadeUpSection className="w-full">
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Şu an
              </h1>
              {now?.updated ? (
                <p className="text-sm text-foreground/60">
                  Son güncelleme:
                  {now.updated}
                </p>
              ) : null}
            </div>
          </FadeUpSection>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {dolu.length === 0 ? (
              <div className="sm:col-span-2">
                <Phase6Empty title="Şu an listesi henüz güncellenmedi.">
                  Admin panelinden girildiğinde burada görünecek.
                </Phase6Empty>
              </div>
            ) : (
              dolu.map(grup => (
                <FadeUpSection
                  key={grup.anahtar}
                  className="w-full"
                  stagger={0.08}
                >
                  <div className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold">{grup.baslik}</h2>
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
              ))
            )}
          </div>
        </Section>
      </main>
    </div>
  )
}
