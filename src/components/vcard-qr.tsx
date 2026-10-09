'use client'

import { Icon } from '@iconify/react'
import { QRCodeSVG } from '@rc-component/qrcode'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Dijital kartvisit (Faz 6 · 2).
 *
 * `/api/vcard` route'u zaten vCard üretiyordu ama HİÇBİR yerden
 * erişilemiyordu — bu bileşen o boşluğu kapatır: QR kod tarayıcıda
 * otomatik olarak kartvisit tanır, düğme de `.vcf` dosyasını indirir.
 *
 * Tasarım: mevcut kart görünümü — `rounded-*` + `border-foreground/10`,
 * mavi birincil buton. Glow/parlama YOK.
 *
 * `hedef` boşsa bileşen hiç render edilmez (içerik uydurulmaz).
 */
export function VCardQr({
  hedef,
  qrTarget,
  baslik = 'Dijital kartvisit',
  indirLabel = 'Kartvisiti indir',
  aciklama,
}: {
  /** Mutlak vCard adresi, örn. `https://tarikeltarnak.com/api/vcard` */
  hedef: string
  /** QR içine yazılacak metin — boşsa `hedef` kullanılır */
  qrTarget?: string
  baslik?: string
  indirLabel?: string
  aciklama?: string
}) {
  const [indiriliyor, setIndiriliyor] = useState(false)
  const qrMetin = qrTarget?.trim() || hedef

  // `Button` gerçek bir <button> basıyor; indirme için geçici bir <a>
  // üretip tıklatıyoruz (böylece buton stilleri tek kaynaktan geliyor).
  const indir = useCallback(() => {
    const a = document.createElement('a')
    a.href = hedef
    a.download = ''
    document.body.appendChild(a)
    a.click()
    a.remove()
    setIndiriliyor(true)
    window.setTimeout(() => setIndiriliyor(false), 2000)
  }, [hedef])

  if (!hedef) {
    return null
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-foreground/10 bg-card/40 p-4 sm:flex-row sm:items-center sm:gap-5">
      <div className="shrink-0 self-start rounded-xl bg-white p-2 sm:self-auto">
        <QRCodeSVG
          value={qrMetin}
          size={132}
          level="M"
          // Site paleti: koyu mürekkep, beyaz zemin — okunabilirlik için
          // `value` içeriği her zaman kontrast yüksek tutulur.
          fgColor="#0a0a0a"
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
        <Button
          color="primary"
          size="sm"
          className="self-start font-semibold"
          isLoading={indiriliyor}
          onPress={indir}
        >
          <Icon icon="material-symbols:contact-page" width={18} height={18} />
          {indirLabel}
        </Button>
      </div>
    </div>
  )
}
