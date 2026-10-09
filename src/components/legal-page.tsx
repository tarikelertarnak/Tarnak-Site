import type { Metadata } from 'next'

import type { LegalBodyProps } from '@/lib/phase6-server'
import { Navigation } from '@/components/navigation'
import { Section } from '@/components/ui/section'
import { getContent } from '@/lib/content'
import { getStaticLocale } from '@/lib/i18n-server'
import { getPhase6, LegalBody } from '@/lib/phase6-server'

export const dynamic = 'force-static'

/**
 * Hukuki sayfaların ortak iskeleti.
 *
 * `/gizlilik` ve `/kvkk` aynı şemayı kullanıyor; tek fark içerik alanı.
 * Bu yüzden render mantığı bir yerde, sayfalar sadece içerik seçiyor.
 */
export async function LegalPage({
  anahtar,
  varsayilanBaslik,
  yol,
}: {
  anahtar: 'privacy' | 'kvkk'
  varsayilanBaslik: string
  yol: string
}) {
  const content = await getContent()
  const p6 = await getPhase6()
  const sayfa = p6?.[anahtar]

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <main id="main" className="w-full">
        <Section
          className="flex-col pt-16 sm:pt-24 lg:pt-36 pb-0"
          id={yol.slice(1)}
          framed
        >
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {sayfa?.title ?? varsayilanBaslik}
            </h1>
          </div>
          <div className="mt-10">
            <LegalBodyContent sayfa={sayfa} />
          </div>
        </Section>
      </main>
    </div>
  )
}

/** `LegalBody`'yi sarmalayan ince katman — `undefined` güvenli. */
function LegalBodyContent({ sayfa }: { sayfa?: LegalBodyProps['page'] }) {
  if (!sayfa) {
    return <p className="text-sm text-foreground/60">İçerik henüz eklenmedi.</p>
  }
  return <LegalBody page={sayfa} />
}

export async function legalMetadata(
  yol: string,
  baslik: string,
  aciklama: string,
): Promise<Metadata> {
  const isEn = (await getStaticLocale()) === 'en'
  const title = isEn
    ? `${baslik} — TARIK ELER - TARNAK`
    : `${baslik} — TARIK ELER - TARNAK`
  const desc = isEn ? aciklama : aciklama
  return {
    title,
    description: desc,
    alternates: { canonical: yol },
    openGraph: { title, description: desc, url: yol, type: 'website' },
  }
}
