import type { Metadata } from 'next'

import { Navigation } from '@/components/navigation'
import { Section } from '@/components/ui/section'
import { getStaticLocale } from '@/lib/i18n-server'
import { getPhase6, Phase6Empty } from '@/lib/phase6-server'

export const dynamic = 'force-static'

export async function generateMetadata(): Promise<Metadata> {
  const isEn = (await getStaticLocale()) === 'en'
  const title = isEn
    ? 'Changelog — TARIK ELER - TARNAK'
    : 'Değişiklikler — TARIK ELER - TARNAK'
  const desc = isEn
    ? 'What changed on this site, newest first.'
    : 'Bu sitede neler değişti, en yeniden eskiye.'
  return {
    title,
    description: desc,
    alternates: { canonical: '/changelog' },
    openGraph: { title, description: desc, url: '/changelog', type: 'website' },
  }
}

export default async function ChangelogPage() {
  const p6 = await getPhase6()
  const log = p6?.changelog
  const entries = (log?.entries ?? []).filter(e => e.title)

  return (
    <div className="min-h-screen w-full relative">
      <Navigation />
      <main id="main" className="w-full">
        <Section
          className="flex-col pt-16 sm:pt-24 lg:pt-36 pb-0"
          id="changelog"
          framed
        >
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {log?.title ?? 'Değişiklikler'}
            </h1>
          </div>

          <div className="mt-10 flex flex-col gap-6">
            {entries.length === 0 ? (
              <Phase6Empty title="Henüz değişiklik kaydı yok.">
                Admin panelinden girildiğinde burada görünecek.
              </Phase6Empty>
            ) : (
              entries.map((entry, i) => (
                <article
                  key={i}
                  className="rounded-2xl border border-foreground/10 bg-card/40 p-5"
                >
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h2 className="text-lg font-semibold">{entry.title}</h2>
                    {entry.date ? (
                      <time className="text-xs text-foreground/50">
                        {entry.date}
                      </time>
                    ) : null}
                  </div>
                  {entry.changes.length > 0 ? (
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {entry.changes.map((degisiklik, j) => (
                        <li
                          key={j}
                          className="flex gap-2 text-sm text-foreground/75"
                        >
                          <span aria-hidden="true" className="text-primary">
                            •
                          </span>
                          <span>{degisiklik}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </Section>
      </main>
    </div>
  )
}
