import type { ReactNode } from 'react'
import type { LegalPage, Phase6 } from '@/lib/phase6'

import { getContent } from '@/lib/content'
import { parsePhase6 } from '@/lib/phase6'

/**
 * Faz 6 sayfaları için ortak okuyucu.
 *
 * Sayfaların hepsi aynı veri kaynağını kullanıyor (`content.phase6`) ve
 * hepsi aynı kurala uyuyor: **içerik yoksa bölüm render edilmez.**
 * Uydurma veri yazmıyoruz; kullanıcı gerçek bilgileri girene kadar sayfa
 * boş kart yığını göstermiyor.
 */
export async function getPhase6(): Promise<Phase6 | null> {
  const content = await getContent()
  return parsePhase6(content.phase6)
}

/** Boş durum — içerik girilene kadar gösterilir. */
export function Phase6Empty({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-card/40 p-6 text-center">
      <p className="text-sm font-medium text-foreground/70">{title}</p>
      {children ? (
        <p className="mt-2 text-xs text-foreground/50">{children}</p>
      ) : null}
    </div>
  )
}

/** Hukuki sayfa gövdesi — düz metin, boş satırla paragraflara ayrılır. */
export interface LegalBodyProps {
  page: LegalPage
}

export function LegalBody({ page }: LegalBodyProps) {
  const paragraflar = (page.body ?? '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)

  return (
    <div className="max-w-3xl">
      {page.needsLegalReview ? (
        <p className="mb-6 rounded-xl border border-foreground/15 bg-card/40 p-4 text-xs text-foreground/60">
          Bu sayfa bir taslaktır ve hukuki incelemeden geçmemiştir. Yayına
          almadan önce bir hukukçu tarafından kontrol edilmelidir.
        </p>
      ) : null}
      {paragraflar.length === 0 ? (
        <p className="text-sm text-foreground/60">İçerik henüz eklenmedi.</p>
      ) : (
        paragraflar.map((p, i) => (
          <p
            key={i}
            className="mb-4 whitespace-pre-line text-sm leading-relaxed text-foreground/75"
          >
            {p}
          </p>
        ))
      )}
      {page.updated ? (
        <p className="mt-8 text-xs text-foreground/45">
          Son güncelleme:
{' '}
{page.updated}
        </p>
      ) : null}
    </div>
  )
}
