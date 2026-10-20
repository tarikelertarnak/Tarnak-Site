'use client'

/**
 * Dilli metin girişi (2026-10-20, kullanıcı isteği: "bunlar combobox olsun
 * yanında böylece o yazı hangi dilde görüneceği ayarlanabilsin her dile özel
 * metin girilebilsin").
 *
 * NEDEN: Hero'nun tagline/buton yazıları TEK dilliydi; admin yalnız TR metin
 * girebiliyordu. Bu bileşen input'un YANINA bir dil seçici koyar; seçilen
 * dilin metni düzenlenir, metinler `{ [dil]: metin }` sözlüğünde arkada
 * tutulur ve TEK "Kaydet" hepsini kaydeder.
 *
 * Öncelik zinciri (bkz. `content.ts` → `HeroI18n`):
 *   `hero.i18n[alan][dil]` > düz TR alan > `xxContentOverlay` > boş
 */
import type { Locale } from '@/lib/i18n'
import { useState } from 'react'
import { flagIcons } from '@/components/ui/flag-icons'
import { Input } from '@/components/ui/input'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'
import { NATIVE_NAMES } from '@/lib/i18n'

/** Sözlüğü olan 8 dil — hero düzenlemesinde kullanılır. */
export const HERO_LOCALES: readonly Locale[] = [
  'tr',
  'en',
  'de',
  'es',
  'fr',
  'ja',
  'pt',
  'ru',
]

export function LocaleTextInput({
  diller = HERO_LOCALES,
  value,
  onChange,
  placeholder,
}: {
  /** Seçilebilir dil kodları. */
  diller?: readonly Locale[]
  /** Dile göre metin sözlüğü (`{}` = henüz girilmedi). */
  value: Record<string, string>
  /** Bir dilin metni değiştiğinde çağrılır (boş metin anahtarı SİLER). */
  onChange: (next: Record<string, string>) => void
  placeholder?: string
}) {
  const [dil, setDil] = useState<string>(diller[0] ?? 'tr')

  const options = diller.map((code) => {
    const Flag = flagIcons[code]
    return {
      value: code,
      label: NATIVE_NAMES[code] ?? code,
      searchText: `${code} ${NATIVE_NAMES[code] ?? ''}`,
      icon: Flag ? <Flag size={16} /> : undefined,
    }
  })

  const setForLocale = (metin: string) => {
    const next = { ...value }
    // Boş bırakılırsa anahtar silinir → TR tabanına / overlay'e düşer.
    if (metin.trim())
      next[dil] = metin
    else
      delete next[dil]
    onChange(next)
  }

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <Input
          variant="faded"
          value={value[dil] ?? ''}
          onValueChange={setForLocale}
          placeholder={placeholder}
        />
      </div>
      <div className="w-36 shrink-0">
        <SearchableCombobox
          options={options}
          selected={[dil]}
          onSelect={v => v[0] && setDil(v[0])}
          onClear={() => setDil(diller[0] ?? 'tr')}
          ariaLabel="Metnin dili"
          placeholder={NATIVE_NAMES[dil as Locale] ?? dil}
          searchPlaceholder="Dil ara…"
        />
      </div>
    </div>
  )
}
