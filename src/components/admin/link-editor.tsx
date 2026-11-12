'use client'

import { Icon } from '@iconify/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { uploadAdminFile } from '@/components/admin/admin-upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'

/**
 * Link alanı editörü (2026-11-11, kullanıcı isteği: "görsel gibi" olsun).
 *
 * Medya editörüyle aynı mantık: **Link | Yükle** combobox'u + adres inputu.
 * "Yükle" seçilirse dosya seçilir ve `/api/admin/upload` ile yüklenir.
 * `suggestions` verilirse input odaklandığında mevcut linkler listelenir.
 */
export type LinkKind = 'link' | 'yukle'

const LINK_KINDS = [
  { value: 'link', label: 'Link' },
  { value: 'yukle', label: 'Yükle' },
]

export function LinkEditor({
  kind,
  url,
  onChange,
  ariaLabel,
  placeholder = 'https://…',
  suggestions,
}: {
  kind: LinkKind
  url: string
  onChange: (patch: { kind?: LinkKind, url?: string }) => void
  ariaLabel: string
  placeholder?: string
  /** Mevcut linklerden öneri (mevcut projelerin linkleri gibi). */
  suggestions?: string[]
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [suggestOpen, setSuggestOpen] = useState(false)

  const filtered = useMemo(() => {
    const list = suggestions ?? []
    if (list.length === 0)
      return []
    const q = url.trim().toLowerCase()
    return q ? list.filter(s => s.toLowerCase().includes(q)) : list
  }, [suggestions, url])

  /* Öneri listesi: odak dışına tıklayınca kapanır. */
  useEffect(() => {
    if (!suggestOpen)
      return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node))
        setSuggestOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [suggestOpen])

  const onFile = async (file: File | undefined) => {
    if (!file)
      return
    setUploading(true)
    setError('')
    const res = await uploadAdminFile(file)
    setUploading(false)
    if (res.ok && res.url)
      onChange({ url: res.url, kind: 'yukle' })
    else
      setError(res.message || 'Dosya yüklenemedi.')
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="flex flex-wrap items-stretch gap-2">
        <SearchableCombobox
          multiple={false}
          options={LINK_KINDS}
          selected={[kind]}
          onSelect={v => onChange({ kind: v as LinkKind })}
          onClear={() => onChange({ kind: 'link' })}
          placeholder="Link"
          searchPlaceholder="Kaynak ara..."
          ariaLabel={`${ariaLabel} kaynağı (link veya yükle)`}
        />
        {kind === 'link' ? (
          <Input
            className="min-w-0 flex-1"
            variant="faded"
            value={url}
            onValueChange={(v) => {
              onChange({ url: v })
              setSuggestOpen(true)
            }}
            onFocus={() => setSuggestOpen(true)}
            placeholder={placeholder}
            aria-label={ariaLabel}
          />
        ) : (
          /*
            YÜKLE modu — link inputu YOK: dosya seçilir, yüklenen yol
            salt-okunur olarak burada görünür (2026-11-11, kullanıcı isteği:
            "yükle dersem link kısmı gitmeli, özelleşmeli").
          */
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-dashed border-foreground/20 bg-foreground/[0.02] px-3 py-1.5">
            <Icon
              icon="mdi:upload-outline"
              width={16}
              height={16}
              className="shrink-0 text-foreground/40"
            />
            <span className="min-w-0 flex-1 truncate text-xs text-foreground-500">
              {url || 'Dosya seç — yüklenen dosya yolu burada görünür'}
            </span>
            <Button
              size="sm"
              variant="bordered"
              isLoading={uploading}
              onPress={() => fileRef.current?.click()}
              startContent={<Icon icon="mdi:file-upload-outline" width={16} height={16} />}
            >
              Dosya seç
            </Button>
          </div>
        )}
      </div>

      {/* Öneri listesi — mevcut linkler */}
      {kind === 'link' && suggestOpen && filtered.length > 0 && (
        <ul
          role="listbox"
          aria-label="Mevcut linkler"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-foreground/15 bg-background p-1 shadow-lg shadow-black/20"
        >
          {filtered.map(s => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={() => {
                  onChange({ url: s })
                  setSuggestOpen(false)
                }}
                className="block w-full cursor-pointer truncate rounded-lg px-3 py-2 text-left text-xs text-foreground/80 transition-colors hover:bg-primary/10 hover:text-primary"
                title={s}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={fileRef}
        type="file"
        hidden
        accept=".png,.jpg,.jpeg,.gif,.webp,.webm,.mp4,.mov,.zip,.pdf,.exe,.msi,.dmg,.deb,.rpm,.appimage"
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
