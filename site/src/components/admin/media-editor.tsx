'use client'

import { Icon } from '@iconify/react'
import { useRef, useState } from 'react'
import { uploadAdminFile } from '@/components/admin/admin-upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'

/**
 * Proje medya editörü (2026-11-11, kullanıcı isteği).
 *
 * · "+" düğmesi **ilk başta**; her basışta yeni medya satırı eklenir (çoklu medya).
 * · Her satırda: 1. combobox **tür** (resim/video/gif), 2. combobox **kaynak**
 *   (link/yükle), **etiket** inputu ve **adres** inputu.
 * · "yükle" seçilirse dosya seçilir ve `/api/admin/upload` ile yüklenir
 *   (geliştirme/Node hedeflerinde; Workers'ta `fs` yok → orada çalışmaz).
 */
export interface MediaItem {
  type: 'resim' | 'video' | 'gif'
  kind: 'link' | 'yukle'
  label: string
  url: string
}

const MEDIA_TYPES = [
  { value: 'resim', label: 'Resim' },
  { value: 'video', label: 'Video' },
  { value: 'gif', label: 'GIF' },
]

const MEDIA_KINDS = [
  { value: 'link', label: 'Link' },
  { value: 'yukle', label: 'Yükle' },
]

export function MediaEditor({
  items,
  onChange,
  label = 'Medya',
}: {
  items: MediaItem[]
  onChange: (items: MediaItem[]) => void
  label?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingIndex = useRef(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const list = items ?? []

  const addItem = () => {
    onChange([...list, { type: 'resim', kind: 'link', label: '', url: '' }])
  }

  const update = (index: number, patch: Partial<MediaItem>) => {
    onChange(list.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  const remove = (index: number) => {
    onChange(list.filter((_, i) => i !== index))
  }

  const pickFile = (index: number) => {
    pendingIndex.current = index
    fileRef.current?.click()
  }

  const onFile = async (file: File | undefined) => {
    if (!file)
      return
    setUploading(true)
    setError('')
    const res = await uploadAdminFile(file)
    setUploading(false)
    if (res.ok && res.url)
      update(pendingIndex.current, { url: res.url, kind: 'yukle' })
    else
      setError(res.message || 'Dosya yüklenemedi.')
  }

  return (
    <div>
      {/* "+" İLK BAŞTA — her basışta yeni medya satırı eklenir */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={addItem}
          aria-label="Medya ekle"
          title="Medya ekle"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-foreground/15 text-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Icon icon="mdi:plus" width={18} height={18} />
        </button>
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground-500">
          {label}
        </span>
        {list.length > 0 && (
          <span className="text-[11px] text-foreground-400">
{list.length}
{' '}
öğe
</span>
        )}
      </div>

      {list.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {list.map((item, index) => (
            <li key={index} className="rounded-lg border border-foreground/10 p-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. combobox: tür */}
                <SearchableCombobox
                  multiple={false}
                  options={MEDIA_TYPES}
                  selected={[item.type]}
                  onSelect={v => update(index, { type: v as MediaItem['type'] })}
                  onClear={() => update(index, { type: 'resim' })}
                  placeholder="Resim"
                  searchPlaceholder="Tür ara..."
                  ariaLabel="Medya türü"
                />
                {/* 2. combobox: kaynak */}
                <SearchableCombobox
                  multiple={false}
                  options={MEDIA_KINDS}
                  selected={[item.kind]}
                  onSelect={v => update(index, { kind: v as MediaItem['kind'] })}
                  onClear={() => update(index, { kind: 'link' })}
                  placeholder="Link"
                  searchPlaceholder="Kaynak ara..."
                  ariaLabel="Medya kaynağı (link veya yükle)"
                />
                {/* Etiket — her medyanın kendi adı */}
                <Input
                  className="min-w-0 flex-1"
                  variant="faded"
                  value={item.label}
                  onValueChange={v => update(index, { label: v })}
                  placeholder="Etiket (örn. Ekran görüntüsü)"
                  aria-label="Medya etiketi"
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label="Bu medyayı kaldır"
                  title="Kaldır"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground/50 transition-colors hover:bg-foreground/10 hover:text-foreground"
                >
                  <Icon icon="mdi:close" width={16} height={16} />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  className="min-w-0 flex-1"
                  variant="faded"
                  value={item.url}
                  onValueChange={v => update(index, { url: v })}
                  placeholder="https://… veya /uploads/…"
                  aria-label="Medya adresi"
                />
                {item.kind === 'yukle' && (
                  <Button
                    size="sm"
                    variant="bordered"
                    isLoading={uploading}
                    onPress={() => pickFile(index)}
                    startContent={<Icon icon="mdi:upload" width={16} height={16} />}
                  >
                    Dosya seç
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={fileRef}
        type="file"
        hidden
        accept=".png,.jpg,.jpeg,.gif,.webp,.webm,.mp4,.mov"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          void onFile(file)
        }}
      />

      {error && (
        <p className="mt-1 text-[11px] text-danger">{error}</p>
      )}
    </div>
  )
}
