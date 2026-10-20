'use client'

/**
 * Hero logo alanı (2026-10-20, kullanıcı isteği: "Emoji / Logo kısmı var kaldır
 * onu onun yerine dosya yükleme veya link koyma olsun combobox'tan seçilir ona
 * göre uygun input gözükecek").
 *
 * Eski `hero.emoji` alanı hiçbir yerde render edilmiyordu (ölü alan) → gerçek
 * logo kaynağına dönüştürüldü. `hero-section` bu değeri `logoSrc` olarak
 * okur; boşsa gömülü marka SVG'si (`SiteLogo`) basılır.
 *
 * Kaynak modu:
 *   - "link" : kullanıcı doğrudan görsel adresi yazar.
 *   - "dosya": dosya Supabase Storage'a yüklenir (`/api/profile-photo`),
 *     dönen public URL alana yazılır. Workers'ta fs YOK; bu yüzden disk
 *     yazan `/api/admin/background` DEĞİL, storage'a yazan uç kullanılır.
 */
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'
import { ALLOWED_IMAGE_TYPES } from '@/lib/image-crop'

type Mod = 'link' | 'dosya'

const MODLAR = [
  { value: 'dosya', label: 'Dosya Yükle' },
  { value: 'link', label: 'Link (URL)' },
]

export function HeroLogoField({
  value,
  onChange,
  onStatus,
}: {
  value: string
  onChange: (v: string) => void
  onStatus?: (s: { type: 'success' | 'error', text: string } | null) => void
}) {
  const [mod, setMod] = useState<Mod>(value.startsWith('data:') || value === '' ? 'dosya' : 'link')
  const [yukleniyor, setYukleniyor] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const dosyaSec = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Aynı dosyayı yeniden seçebilmek için değeri hemen sıfırla.
    e.target.value = ''
    if (!file)
      return

    setYukleniyor(true)
    onStatus?.(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/profile-photo', { method: 'POST', body })
      const data = await res.json()
      if (res.ok && data.url) {
        onChange(data.url)
        onStatus?.({ type: 'success', text: 'Logo yüklendi. Kaydet ile siteye yansıt.' })
      }
      else {
        onStatus?.({ type: 'error', text: data.error || 'Logo yüklenemedi.' })
      }
    }
    catch {
      onStatus?.({ type: 'error', text: 'Yükleme sırasında hata oluştu.' })
    }
    finally {
      setYukleniyor(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-40 shrink-0">
          <SearchableCombobox
            options={MODLAR}
            selected={[mod]}
            onSelect={v => v[0] && setMod(v[0] as Mod)}
            onClear={() => setMod('dosya')}
            ariaLabel="Logo kaynağı"
            placeholder={mod === 'dosya' ? 'Dosya Yükle' : 'Link (URL)'}
            searchPlaceholder="Kaynak ara…"
          />
        </div>
        {mod === 'link'
          ? (
              <div className="min-w-0 flex-1">
                <Input
                  variant="faded"
                  value={value}
                  onValueChange={onChange}
                  placeholder="https://... veya /uploads/logo.png"
                />
              </div>
            )
          : (
              <>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ALLOWED_IMAGE_TYPES.join(',')}
                  className="hidden"
                  onChange={dosyaSec}
                />
                <Button
                  variant="bordered"
                  isLoading={yukleniyor}
                  isDisabled={yukleniyor}
                  onPress={() => inputRef.current?.click()}
                >
                  Dosya Seç
                </Button>
              </>
            )}
      </div>
      {value && (
        <div className="flex items-center gap-3">
          <img
            src={value}
            alt="Logo önizleme"
            className="h-12 w-12 rounded-md border border-foreground-200/20 object-contain"
          />
          <Button size="sm" variant="light" color="danger" onPress={() => onChange('')}>
            Kaldır
          </Button>
        </div>
      )}
    </div>
  )
}
