import type { Metadata } from 'next'

import type { LegalBodyProps } from '@/lib/phase6-server'
import { FadeUpSection } from '@/components/fade-up-section'
import { LegalTitle } from '@/components/legal-title'
import { LegalBodyClient } from '@/components/phase6-client'
import { ScaleIcon, ShieldCheckIcon } from '@/components/ui/icons'
import { Section, SectionTitle } from '@/components/ui/section'
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

  /*
    BAŞLIK AYRI KARTTA (2026-10-30, kullanıcı: "Şu an, Gizlilik Politikası, KVKK
    Aydınlatma Metni bu yazılar bozuk ve ayrı grupta değil, aynı BLOG gibi
    olmalı"). ÖNCE: başlık ile gövde TEK `framed` kartın içindeydi; başlık
    SectionTitle değil elle yazılmış `<h1>`'di (bu yüzden `/blog` ile aynı
    görünmüyordu). ŞİMDİ: `/blog` (BlogSection) ile BİREBİR aynı yapı —
    1) başlık kendi `framed` kartında + `big` SectionTitle (h1),
    2) `--section-gap` boşluk, 3) gövde ikinci `framed` kartta.
  */
  const titleNode = sayfa?.title ?? (
    <LegalTitle
      i18nKey={anahtar === 'kvkk' ? 'nav.kvkk' : 'nav.privacy'}
      fallback={varsayilanBaslik}
    />
  )

  return (
    <div className="min-h-screen w-full relative">
      <main id="main" className="w-full">
        <Section
          className="flex-col pt-[var(--section-space)]"
          id={yol.slice(1)}
          framed
        >
          <FadeUpSection className="flex w-full flex-col items-center">
            <SectionTitle
              title=""
              subTitle=""
              subTitleNode={titleNode}
              description=""
              icon={anahtar === 'kvkk'
                ? <ScaleIcon size={36} className="inline-block" />
                : <ShieldCheckIcon size={36} className="inline-block" />}
              headingLevel="h1"
              big
              tightGap
            />
          </FadeUpSection>
        </Section>
        <div aria-hidden className="h-[var(--section-gap)]" />
        <Section className="flex-col pb-16 sm:pb-20 lg:pb-24" framed>
          <FadeUpSection className="w-full">
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
