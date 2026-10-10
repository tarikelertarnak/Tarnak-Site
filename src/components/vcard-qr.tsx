'use client'

import { QRCodeSVG } from '@rc-component/qrcode'

/**
 * Dijital kartvizit (Faz 6 · 2; düzenleme: yalnızca QR kod).
 *
 * vCard indirme route'u ve indirme düğmesi KALDIRILDI. vCard verileri doğrudan
 * `getContent()` (Supabase merge sonrası `content`) üzerinden `buildVCard()` ile
 * üretilir ve QR kodunun içine gömülür — telefon taradığında kişiyi otomatik
 * tanır.
 *
 * Tasarım: aynı kart — `rounded-* border-foreground/10`, mavi vurgu.
 * Glow/parlama YOK. `vcardText` boşsa hiç render edilmez.
 */
export function VCardQr({
  vcardText,
  baslik = 'Dijital kartvisit',
  aciklama,
}: {
  /** RFC 6350 vCard 3.0 metni (`src/lib/vcard.ts` → `buildVCard`) */
  vcardText: string
  baslik?: string
  /** Alt açıklama; verilmezse gösterilmez. */
  aciklama?: string
}) {
  if (!vcardText) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-foreground/10 bg-card/40 p-4 sm:flex-row sm:items-center sm:gap-5">
      <div className="shrink-0 self-start rounded-xl bg-white p-2 sm:self-auto">
        <QRCodeSVG
          value={vcardText}
          size={132}
          level="M"
          // Site paleti: koyu mürekkep, beyaz zemin — yüksek kontrast.
          fgColor="#0a0a0b"
          bgColor="#ffffff"
          marginSize={1}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm font-semibold">{baslik}</p>
        {aciklama ? (
          <p className="text-xs leading-relaxed text-foreground/60">
            {aciklama}
          </p>
        ) : null}
      </div>
    </div>
  )
}
