import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Breadcrumb, BreadcrumbJsonLd } from '@/components/breadcrumb'
import { Navigation } from '@/components/navigation'
import { Section, SectionTitle } from '@/components/ui/section'
import { getContent } from '@/lib/content'
import { getStaticLocale, getStaticLocalizedContent } from '@/lib/i18n-server'
import { isExternal, parseResources } from '@/lib/resources'
import { pageMetadata } from '@/lib/page-metadata'
import { t } from '@/lib/i18n'

/**
 * /kaynaklar — Faydalı araç ve bağlantılar (Faz 4 · 4)
 *
 * İçerik `data/content.json` → `resources` anahtarından gelir ve zod ile
 * doğrulanır. İçerik YOKSA boş durum ekranı gösterilir — uydurma link
 * eklenmez (ortak kural).
 *
 * Tasarım dili: mevcut kart sistemi (BentoBox + Section + 24px bölüm
 * boşluğu). Buton stili mavi, glow YOK.
 */

export const dynamic = 'force-static'

export const metadata: Metadata = pageMetadata({
  path: '/kaynaklar',
  title: 'Kaynaklar',
  description: 'Kullandığım ve faydalı bulduğum araçlar, kütüphaneler ve öğrenme kaynakları.',
})

const CRUMB = [
  { label: 'Ana sayfa', href: '/' },
  { label: 'Kaynaklar', href: '/kaynaklar' },
]

export default async function ResourcesPage() {
  const locale = await getStaticLocale()
  const content = await getStaticLocalizedContent()
  // `getContent()` çağrısı hem content'i hem de tipleri doğruluyor.
  await getContent()

  const kaynaklar = parseResources((content as unknown as Record<string, unknown>).resources)
  const toplam = kaynaklar.groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <main id="main" className="w-full">
        <div className="mx-auto w-full max-w-6xl px-4 pt-24 sm:px-6 sm:pt-28">
          <Breadcrumb items={CRUMB} />
          <BreadcrumbJsonLd items={CRUMB} />
        </div>

        <Section className="flex-col pt-8 pb-0">
          <div className="mx-auto w-full max-w-3xl text-center">
            <SectionTitle
              title={kaynaklar.title}
              subTitle=""
              description={kaynaklar.description ?? kaynaklar.subtitle ?? ""}
              tightGap
            />
            {kaynaklar.subtitle && (
              <p className="mt-3 text-sm text-foreground/60 sm:text-base">
                {kaynaklar.subtitle}
              </p>
            )}
          </div>
        </Section>

        <div aria-hidden className="h-[var(--section-gap)]" />

        {toplam === 0
          ? (
              // TODO (kullanıcı): `data/content.json` → `resources.groups`
              // dizisine kategori ve bağlantıları ekle. Buraya GİRİŞ
              // başlığı, açıklama ve en az bir kategori.
              <Section className="flex-col pb-0">
                <div className="mx-auto w-full max-w-3xl rounded-xl border border-foreground/10 p-8 text-center">
                  <p className="text-sm text-foreground/60">
                    {t(locale, 'resources.empty') ?? 'Henüz kaynak eklenmedi.'}
                  </p>
                  <p className="mt-2 text-xs text-foreground/40">
                    TODO: <code>content.resources</code> → admin panelinden doldurulacak.
                  </p>
                </div>
              </Section>
              )
          : (
              <Section className="flex-col pb-0">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
                  {kaynaklar.groups.map(grup => (
                    <section key={grup.title} aria-labelledby={`kaynak-${grup.title}`}>
                      <h2
                        id={`kaynak-${grup.title}`}
                        className="text-lg font-bold tracking-tight sm:text-xl"
                      >
                        {grup.title}
                      </h2>
                      {grup.description && (
                        <p className="mt-1 text-sm text-foreground/60">
                          {grup.description}
                        </p>
                      )}

                      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                        {grup.items.map(item => {
                          const dis = isExternal(item.href)
                          return (
                            <li key={`${grup.title}-${item.name}`}>
                              <a
                                href={item.href}
                                {...(dis ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                className="flex h-full flex-col rounded-xl border border-foreground/10 p-4 transition-colors duration-200 hover:border-primary/50"
                              >
                                <span className="flex items-center gap-1.5 text-sm font-medium">
                                  {item.name}
                                  {dis && (
                                    <span aria-hidden className="text-foreground/40">
                                      ↗
                                    </span>
                                  )}
                                </span>
                                {item.note && (
                                  <span className="mt-1 text-xs leading-relaxed text-foreground/60">
                                    {item.note}
                                  </span>
                                )}
                              </a>
                            </li>
                          )
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              </Section>
              )}

        <div aria-hidden className="h-[var(--section-gap)]" />
      </main>
    </div>
  )
}