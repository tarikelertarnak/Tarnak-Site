import type { Metadata } from 'next'

import type { LegalBodyProps } from '@/lib/phase6-server'
import { FadeUpSection } from '@/components/fade-up-section'
import { LegalTitle } from '@/components/legal-title'
import { LegalBodyClient } from '@/components/phase6-client'
import { Section } from '@/components/ui/section'
import { getPhase6 } from '@/lib/phase6-server'

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
  const p6 = await getPhase6()
  const sayfa = p6?.[anahtar]

  return (
    <div className="min-h-screen w-full relative">
      <main id="main" className="w-full">
        <Section
          className="flex-col pt-16 sm:pt-24 lg:pt-36 pb-0"
          id={yol.slice(1)}
          framed
        >
          <FadeUpSection className="w-full">
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {/*
                  Başlık: içerik varsa onu, yoksa `nav.*` sözlük anahtarını
                  İSTEMCİDE çözer (2026-10-21). Kök layout `force-static`
                  olduğu için sunucu her zaman TR basardı; hukuki sayfa
                  başlığı EN gezinmede Türkçe kalıyordu.
                */}
                {sayfa?.title ?? (
                  <LegalTitle
                    i18nKey={anahtar === 'kvkk' ? 'nav.kvkk' : 'nav.privacy'}
                    fallback={varsayilanBaslik}
                  />
                )}
              </h1>
            </div>
          </FadeUpSection>
          <FadeUpSection className="mt-10">
            <LegalBodyContent sayfa={sayfa} />
          </FadeUpSection>
        </Section>
      </main>
    </div>
  )
}

/** `LegalBodyClient`'i sarmalayan ince katman — `undefined` güvenli. */
function LegalBodyContent({ sayfa }: { sayfa?: LegalBodyProps['page'] }) {
  return <LegalBodyClient page={sayfa} />
}

export async function legalMetadata(
  yol: string,
  baslik: string,
  aciklama: string,
): Promise<Metadata> {
  // Metadata sunucuda sabit TR kalir (getStaticLocale 'tr'); hukuki basliklar
  // zaten TR metin olarak verilir.
  const title = `${baslik} — TARIK ELER - TARNAK`
  return {
    title,
    description: aciklama,
    alternates: { canonical: yol },
    openGraph: { title, description: aciklama, url: yol, type: 'website' },
  }
}
