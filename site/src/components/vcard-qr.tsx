'use client'

import { QRCodeSVG } from '@rc-component/qrcode'

/**
 * Dijital kartvizit — yalnızca QR kod.
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
    <div className="flex justify-center">
      {/*
        2026-10-12 (kullanıcı: "qr kod kısmı kötü"): çift kutulu (bordered
        wrapper + white panel) "yüzen kare" görünümü gitti. Artık TEK beyaz
        panel: QR her temada beyaz zeminde + koyu mürekkep (taranabilirlik
        sabiti), ince ring + yumuşak gölge ile karttan net ayrışır. Metin
        YOK — "sadece QR Code olsun" kuralı korunur (vcard-qr-only.test.ts).
      */}
      <div className="shrink-0 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-foreground/20">
        <QRCodeSVG
          value={vcardText}
          size={148}
          level="M"
          // Site paleti: koyu mürekkep, beyaz zemin — yüksek kontrast.
          fgColor="#0a0a0b"
          bgColor="#ffffff"
          marginSize={2}
        />
      </div>
    </div>
  )
}
