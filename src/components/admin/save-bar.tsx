'use client'

/**
 * Sabit kaydetme çubuğu (2026-10-20, kullanıcı isteği: "bunlar bir grupta
 * topla ve alt kısımda position fixed şekilde yer alsın, eğer bir şey
 * değişmemişse gözükmez").
 *
 * Kaydet + İptal + bilgi satırı tek grupta, ekranın altında sabit durur.
 * Değişiklik yokken (`dirty = false`) HİÇ render edilmez — boş çubuk ekranı
 * kaplamaz.
 *
 * `position: fixed` kullanılır çünkü admin içerik kabı dikey kaydırılıyor
 * (`overflow-y-auto`); `sticky` o kabın dibine yapışır ve uzun formda
 * görünmez olurdu.
 */
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export function SaveBar({
  dirty,
  busy,
  onSave,
  onCancel,
  /** Kaydetme sonrası bilgi metni (ör. "Kaydedildi! …"). */
  info,
  /** Ek buton (ör. "Varsayılana dön"). */
  extra,
}: {
  dirty: boolean
  busy?: boolean
  onSave: () => void
  onCancel: () => void
  info?: ReactNode
  extra?: ReactNode
}) {
  if (!dirty)
    return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground-200/10 bg-tsurface-1/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3">
        {info && (
          <p className="text-xs text-foreground-500">{info}</p>
        )}
        <div className="flex items-center gap-2">
          <Button
            color="primary"
            className="font-semibold"
            onPress={onSave}
            isLoading={busy}
            isDisabled={busy}
          >
            Kaydet
          </Button>
          <Button
            variant="light"
            onPress={onCancel}
            isDisabled={busy}
          >
            İptal Et
          </Button>
          {extra && <div className="ml-auto">{extra}</div>}
        </div>
      </div>
    </div>
  )
}
