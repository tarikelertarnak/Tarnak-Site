'use client'

import type { PixelCrop } from '@/lib/image-crop'
import { Icon } from '@iconify/react'
import { useEffect, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import { canvasToFile, getCroppedImg } from '@/lib/image-crop'

/** Kırpma sonrası kaydedilen kare boyutu. */
const OUTPUT = 512
/** Modal içindeki canlı önizleme karesi (küçük = hızlı). */
const PREVIEW_SIZE = 96

const ZOOM_STEP = 0.1
const MIN_ZOOM = 1
const MAX_ZOOM = 4

export interface CropModalProps {
  open: boolean
  /** Kırpılacak görsel (blob/data URL) */
  imageSrc: string
  onCancel: () => void
  /** Kırpılmış dosyayı teslim eder. Promise dönerse yükleme süresince buton loading kalır. */
  onSave: (cropped: File) => Promise<void> | void
}

/**
 * Profil fotoğrafı kırpma penceresi.
 *
 * Koyu sahne + `cropShape="round"`: paket çerçeve dışını `box-shadow` ile
 * karartıp içini net bırakır, çerçeveyi `cropAreaStyle` ile kesikli (dashed)
 * yapıyoruz. `restrictPosition` görsel çerçevenin dışına taşınmasını engeller
 * → çerçeve sabit kalır; boyut değiştirme zoom ile (slider + tekerlek + pinch).
 *
 * Erişilebilirlik: `role="dialog"` + `aria-modal`, Esc kapatır, odak modalın
 * içinde döngüde kalır (focus trap), kapanınca odak geldiği düğmeye döner.
 * Cropper `tabIndex={0}` + ok tuşlarıyla da oynatılabilir.
 *
 * Neden paylaşılan `Modal` değil: sahne koyu ve sabit yükseklikte, altta
 * yeşil kaydetme çubuğu var; ayrıca odak döngüsü için iç DOM referansı
 * gerekiyor (paylaşılan Modal ref geçirmiyor).
 */
export function CropModal({
  open,
  imageSrc,
  onCancel,
  onSave,
}: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [pixels, setPixels] = useState<PixelCrop | null>(null)
  const [preview, setPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  // `onCancel` üst bileşende her render'da yeni referans gelir; odak döngüsünü
  // sadece `open` değişimine bağlamak için ref'te tutuyoruz (aksi halde
  // yükleme sırasında odak ilk düğmeye zıplar).
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  // Her açılışta sıfırla: aynı modal ikinci kez açıldığında eski kırpma kalmasın.
  useEffect(() => {
    if (!open) {
      return
    }
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setPixels(null)
    setPreview('')
    setError(null)
  }, [open, imageSrc])

  // Esc + focus trap + gövde kaydırma kilidi. Odak kapanınca eski düğmeye döner.
  useEffect(() => {
    if (!open) {
      return
    }
    const previous = document.activeElement as HTMLElement | null
    const cancel = () => onCancelRef.current()
    const selectables = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input, [href], select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      )

    selectables()[0]?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        cancel()
        return
      }
      if (event.key !== 'Tab') {
        return
      }
      const items = selectables()
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) {
        return
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
 else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      previous?.focus()
    }
  }, [open])

  // Canlı önizleme. `onCropComplete` paket içinde debounce'lu geldiği için
  // sürükleme sırasında canvas başına kare üretmiyoruz.
  useEffect(() => {
    if (!open || !pixels) {
      return
    }
    let cancelled = false
    getCroppedImg(imageSrc, pixels, rotation, PREVIEW_SIZE)
      .then(
        canvas =>
          !cancelled && setPreview(canvas.toDataURL('image/webp', 0.8)),
      )
      .catch(() => {
        /* önizleme üretilemezse kırpma yine de çalışır */
      })
    return () => {
      cancelled = true
    }
  }, [open, imageSrc, pixels, rotation])

  const submit = async () => {
    if (!pixels) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      const canvas = await getCroppedImg(imageSrc, pixels, rotation, OUTPUT)
      await onSave(canvasToFile(canvas))
    }
 catch {
      setError('Fotoğraf işlenemedi. Farklı bir görsel dene.')
    }
 finally {
      setSaving(false)
    }
  }

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4"
      onClick={saving ? undefined : onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Profil fotoğrafını kırp"
        onClick={event => event.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-foreground-200/10 bg-background"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-foreground-200/10 px-5 py-3.5">
          <h2 className="text-base font-semibold">Fotoğrafı Kırp</h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label="Kırpma penceresini kapat"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-40"
          >
            <Icon icon="mdi:close" width={18} height={18} />
          </button>
        </div>

        {/* Koyu sahne: görsel tam görünür, çerçeve dışı kararır. */}
        <div className="relative h-[46vh] min-h-[240px] w-full bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            cropShape="round"
            cropSize={{ width: 240, height: 240 }}
            objectFit="contain"
            restrictPosition
            showGrid={false}
            zoomWithScroll
            zoomSpeed={0.15}
            keyboardStep={0.1}
            cropperProps={{
              'tabIndex': 0,
              'aria-label': 'Kırpma alanı — ok tuşlarıyla kaydır',
            }}
            // "Yeniden Kırp" akışında görsel Supabase URL'inden gelir; CORS'suz
            // çizim canvas'ı kirletir ve `toDataURL` SecurityError fırlatır.
            mediaProps={{ crossOrigin: 'anonymous' }}
            style={{
              containerStyle: {
                position: 'relative',
                width: '100%',
                height: '100%',
              },
              // Kesikli çizgili yuvarlak çerçeve; paket varsayılanı düz ve kesintisiz.
              cropAreaStyle: { borderColor: '#fff', borderStyle: 'dashed' },
            }}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={(_area, areaPixels) => setPixels(areaPixels)}
          />
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-foreground-200/10 px-5 py-4">
          <div className="flex items-center gap-4">
            <Icon
              icon="mdi:magnify-minus-outline"
              width={18}
              height={18}
              className="shrink-0 text-foreground/50"
            />
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={ZOOM_STEP}
              value={zoom}
              onChange={event => setZoom(Number(event.target.value))}
              aria-label="Yakınlaştırma"
              className="h-2 min-w-0 flex-1 cursor-pointer accent-[var(--tprimary)]"
            />
            <Icon
              icon="mdi:magnify-plus-outline"
              width={18}
              height={18}
              className="shrink-0 text-foreground/50"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {preview ? (
                <img
                  src={preview}
                  alt="Kırpılacak fotoğrafın önizlemesi"
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full border border-foreground-200/10 object-cover"
                />
              ) : (
                <div className="h-14 w-14 rounded-full border border-dashed border-foreground/25" />
              )}
              <Button
                variant="bordered"
                size="sm"
                onPress={() => setRotation(value => (value + 90) % 360)}
                isDisabled={saving}
                startContent={
                  <Icon icon="mdi:rotate-right" width={16} height={16} />
                }
              >
                90° Döndür
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="bordered" onPress={onCancel} isDisabled={saving}>
                İptal
              </Button>
              <Button
                color="success"
                onPress={submit}
                isLoading={saving}
                isDisabled={!pixels}
                startContent={(
                  <Icon
                    icon="mdi:content-save-outline"
                    width={18}
                    height={18}
                  />
                )}
              >
                Yeni profil fotoğrafını kaydet
              </Button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
