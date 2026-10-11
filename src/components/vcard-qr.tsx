'use client'

import { QRCodeSVG } from '@rc-component/qrcode'

/**
 * Dijital kartvizit (Faz 6 · 2) — yalnızca QR kod.
 *
 * vCard indirme route'u ve indirme düğmesi KALDIRILDI. vCard verileri doğrudan
 * `getContent()` (Supabase merge sonrası `content`) üzerinden `buildVCard()` ile
 * üretilir ve QR kodunun içine gömülür — telefon taradığında kişiyi otomatik
 * tanır.
 *
 * 2026-10-11 (kullanıcı): "QR kodu telefonunla okut; kartvizit otomatik
 * kaydedilir. bu yazıyı kaldır sadece QR Code olsun" — kart üstündeki başlık ve
 * açıklama metinleri kaldırıldı, geriye SADECE QR kodu kaldı. `baslik` /
 * `aciklama` prop'ları ve i18n anahtarları (`about.vcardTitle`,
 * `about.vcardDescription`) bu yüzden ölü koddu.
 *
 * Tasarım: QR beyaz zeminde, koyu mürekkep — yüksek kontrast, her telefonda
 * okunabilir. `vcardText` boşsa hiç render edilmez.
 */
export function VCardQr({ vcardText }: { /** RFC 6350 vCard 3.0 metni (`src/lib/vcard.ts` → `buildVCard`) */ vcardText: string }) {
  if (!vcardText) {
    return null
  }

  return (
    <div className="flex justify-center rounded-2xl border border-foreground/10 bg-card/40 p-4">
      <div className="shrink-0 rounded-xl bg-white p-2">
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
    </div>
  )
}
