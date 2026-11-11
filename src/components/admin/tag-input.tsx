'use client'

import { Icon } from '@iconify/react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'

/**
 * Etiket girişi (2026-11-11, kullanıcı isteği).
 *
 * · "+" düğmesi etiket EKLER
 * · Etiketler **yan yana** dizilir (alt alta değil) — sarmalanan grup
 * · Alan en fazla **3 satır** yüksekliğinde; taşarsa KAYAR
 * · Enter veya virgül de etiket ekler
 */
export function TagInput({
  tags,
  onChange,
  placeholder = 'etiket ekle…',
  ariaLabel = 'Etiket ekle',
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  ariaLabel?: string
}) {
  const [value, setValue] = useState('')

  const add = () => {
    const next = value
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
    if (next.length === 0)
      return
    const merged = [...tags]
    for (const t of next) {
      if (!merged.includes(t))
        merged.push(t)
    }
    onChange(merged)
    setValue('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          className="min-w-0 flex-1"
          variant="faded"
          value={value}
          onValueChange={setValue}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
        />
        <button
          type="button"
          onClick={add}
          aria-label="Etiketi ekle"
          title="Etiketi ekle"
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-foreground/15 text-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <Icon icon="mdi:plus" width={18} height={18} />
        </button>
      </div>

      {tags.length > 0 && (
        <div className="flex max-h-[5.4rem] flex-wrap content-start gap-1.5 overflow-y-auto rounded-lg border border-foreground/15 bg-foreground/[0.03] p-2">
          {tags.map(t => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full border border-foreground/15 bg-background px-2.5 py-1 text-xs text-foreground/80"
            >
              {t}
              <button
                type="button"
                onClick={() => onChange(tags.filter(x => x !== t))}
                aria-label={`${t} etiketini kaldır`}
                className="flex size-4 cursor-pointer items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                <Icon icon="mdi:close" width={11} height={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
