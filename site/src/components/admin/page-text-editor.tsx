'use client'

/**
 * SAYFA METİN EDİTÖRÜ (2026-10-30).
 *
 * Kullanıcı isteği: "her sayfanın en üstünde dil combobox'u olsun, kopyala
 * butonu olsun, bir textbox olsun; düzen yapıştırılırsa otomatik işlensin —
 * Türkçeyi yaparız, yapay zekâya çevirtiriz, her dile kolayca ekleriz".
 *
 * AKIŞ
 *   1. Dil seç (TR / Hepsi / 25 dil).
 *   2. "Kopyala" → sayfanın TÜM metinleri `anahtar: değer` satırları olarak
 *      panoya gider (yapay zekâya verilecek biçim).
 *   3. Çeviriyi yapıştır → "İçe aktar" → anahtarlar eşleştiği için değerler
 *      doğru alanlara yazılır (aynı anahtar şeması: `content:` / `dict:`).
 *
 * YAZMA YERİ
 *   · `content:` + TR  → doğrudan `content.json` alanı (taban metin)
 *   · diğer her şey    → `content.textOverrides[dil][anahtar]`
 *     ("Hepsi" = `textOverrides.all`, dile özel değer yoksa uygulanır)
 */

import type { SiteContent } from '@/lib/content'
import type { Locale } from '@/lib/i18n'
import { Icon } from '@iconify/react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'
import { Textarea } from '@/components/ui/textarea'
import { NATIVE_NAMES, t as translate } from '@/lib/i18n'
import { ALL_LOCALES_FLAG, localeFlag } from '@/lib/locale-flags'
import {
  asText,
  coerceFieldValue,
  getPath,
  parsePastedText,
  parseTextFieldKey,
  setPath,
} from '@/lib/page-text-specs'

/** Tüm diller + "Hepsi" — TR taban içerik olduğu için ayrıca işaretlenir. */
const ALL = 'all'

export function PageTextEditor({
  content,
  _pageId,
  groups,
  _previewPath,
  onChange,
}: {
  content: SiteContent
  _pageId: string
  groups: { title: string, fields: { key: string, label: string, multiline?: boolean }[] }[]
  _previewPath?: string
  onChange: (next: SiteContent) => void
}) {
  const [locale, setLocale] = useState<string>('tr')
  const [paste, setPaste] = useState('')

  const overrides = content.textOverrides ?? {}

  /** Bir alanın GÖRÜNEN değeri (dil önceliği: dile özel → Hepsi → taban). */
  function resolved(key: string): string {
    const own = overrides[locale]?.[key]
    if (typeof own === 'string' && own !== '')
      return own
    const all = overrides[ALL]?.[key]
    if (typeof all === 'string' && all !== '')
      return all
    const { source, path } = parseTextFieldKey(key)
    if (source === 'content')
      return asText(getPath(content, path))
    // `dict:` → taban sözlük (TR) ya da aktif dilin sözlüğü.
    const base = translate(locale === ALL ? 'tr' : (locale as Locale), path)
    return base === path ? '' : base
  }

  /** Bir değeri seçili dile yazar. */
  function write(key: string, value: string): SiteContent {
    const { source, path } = parseTextFieldKey(key)
    const trimmed = value.trim()

    if (source === 'content' && locale === 'tr') {
      return setPath(content, path, coerceFieldValue(key, trimmed))
    }

    const bucket = locale
    const nextOverrides: Record<string, Record<string, string>> = {
      ...overrides,
      [bucket]: { ...(overrides[bucket] ?? {}) },
    }
    if (trimmed)
      nextOverrides[bucket][key] = trimmed
    else
      delete nextOverrides[bucket][key]
    if (!Object.keys(nextOverrides[bucket]).length)
      delete nextOverrides[bucket]

    return { ...content, textOverrides: nextOverrides }
  }

  /** Kopyalanacak düz metin — yapay zekâya verilebilir biçim. */
  const copyText = useMemo(() => {
    const lines: string[] = []
    for (const group of groups) {
      lines.push(`# ${group.title}`)
      for (const field of group.fields) {
        const value = resolved(field.key).replace(/\n/g, '\\n')
        lines.push(`${field.key}: ${value}`)
      }
      lines.push('')
    }
    return lines.join('\n')
  }, [groups, locale, content])

  /**
   * Dil seçenekleri — paneldeki TEK dil listesi (2026-10-31).
   *
   * Kullanıcı isteği: "telefon için kullanılan ayrımdan al, her biri için
   * bölece ikon da olur, combobox searchlı olsun, bütün diller görünsün".
   * Eskiden düz `<select>` vardı; artık aranabilir combobox + bayrak ikonu.
   * `✓` işareti o dilde KAYITLI çeviri olduğunu gösterir (Hepsi dahil).
   * "DİLLER" sekmesi kaldırıldı: bütün diller zaten burada.
   */
  const languageOptions = useMemo(() => {
    const translated = (code: string) => Object.keys(overrides[code] ?? {}).length > 0

    const option = (value: string, flag: string, name: string, hint?: string) => ({
      value,
      icon: <span className="text-base leading-none" aria-hidden>{flag}</span>,
      searchText: `${name} ${value} ${hint ?? ''} ${flag}`,
      label: (
        <span className="flex items-center gap-1.5">
          <span>{name}</span>
          {hint && (
            <span className="text-[10px] opacity-60">{hint}</span>
          )}
          {translated(value)
            ? <span className="text-primary" title="Bu dilde çeviri var">✓</span>
            : null}
        </span>
      ),
    })

    return [
      option(ALL, ALL_LOCALES_FLAG, 'Hepsi', '(tüm dillerde aynı)'),
      option('tr', localeFlag('tr'), NATIVE_NAMES.tr, 'TR'),
      ...(Object.keys(NATIVE_NAMES) as Locale[])
        .filter(code => code !== 'tr')
        .map(code => option(code, localeFlag(code), NATIVE_NAMES[code], code.toUpperCase())),
    ]
  }, [overrides])

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(copyText)
    }
    catch {
      // no-op
    }
  }

  function importPasted() {
    const parsed = parsePastedText(paste)
    const keys = Object.keys(parsed)
    if (!keys.length) {
      return
    }
    // Kaydetmeden önce onay (2026-10-31, kullanıcı isteği).
    if (!window.confirm(`${keys.length} alan işlenecek. Devam edilsin mi?`))
      return
    let next = content
    for (const key of keys) {
      if (!key.includes(':'))
        continue
      next = write(key, parsed[key])
    }
    onChange(next)
    setPaste('')
  }

  return (
    <div className="min-w-0 space-y-4">
      {/* Üst grup: Dil seçimi + Kopyala */}
      <div className="rounded-lg border border-surface-border bg-surface-1/40 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchableCombobox
            options={languageOptions}
            selected={[locale]}
            onSelect={setLocale}
            onClear={() => setLocale('tr')}
            placeholder="Dil seç"
            searchPlaceholder="Ara..."
            ariaLabel="Sayfa metin dili"
          />
          <Button
            size="sm"
            variant="bordered"
            onPress={() => void copyAll()}
            startContent={<Icon icon="mdi:content-copy" width={16} height={16} />}
          >
            Kopyala
          </Button>
        </div>
      </div>

      {/* İçe aktarma grubu */}
      <div className="rounded-lg border border-surface-border bg-surface-1/40 p-3 space-y-2">
        <Textarea
          variant="faded"
          minRows={4}
          value={paste}
          onValueChange={setPaste}
          placeholder={'Çeviriyi buraya yapıştır:\ncontent:about.title: ...\ndict:blog.sub: ...'}
          aria-label="Düzen yapıştır"
        />
        <div className="flex justify-end">
          <Button size="sm" color="primary" variant="solid" onPress={importPasted}>
            İçe aktar
          </Button>
        </div>
      </div>

      <div className="h-px w-full bg-surface-border/70" />

      <div className="space-y-4">

      {groups.map(group => (
        <div key={group.title} className="space-y-2">
          <p className="border-b border-surface-border pb-1 text-xs font-semibold uppercase tracking-wide text-primary">
            {group.title}
          </p>
          {group.fields.map(field => (
            <div key={field.key} className="flex flex-col gap-1">
              <span className="text-xs text-foreground-500">
                {field.label}
                <span className="ml-2 font-mono text-[10px] text-foreground-500/60">
                  {field.key}
                </span>
              </span>
              {field.multiline
                ? (
                    <Textarea
                      variant="faded"
                      minRows={2}
                      value={resolved(field.key)}
                      onValueChange={value => onChange(write(field.key, value))}
                      aria-label={field.label}
                    />
                  )
                : (
                    <Input
                      variant="faded"
                      value={resolved(field.key)}
                      onValueChange={value => onChange(write(field.key, value))}
                      aria-label={field.label}
                    />
                  )}
            </div>
          ))}
        </div>
      ))}
      </div>
    </div>
  )
}
