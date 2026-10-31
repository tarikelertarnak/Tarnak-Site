/**
 * Dil → bayrak eşlemesi (2026-10-31).
 *
 * Panelde dil seçimi telefon girişindeki ülke seçici gibi görünsün istendi
 * ("telefon için kullanılan … herbiri için ayır, ikon da olur"). Bayraklar
 * emoji: ek bağımlılık yok, SVG/ikon CDN'i yok, tema renginden etkilenmez.
 */

const FLAGS: Record<string, string> = {
  tr: '🇹🇷',
  en: '🇬🇧',
  es: '🇪🇸',
  de: '🇩🇪',
  ja: '🇯🇵',
  fr: '🇫🇷',
  pt: '🇵🇹',
  ru: '🇷🇺',
  it: '🇮🇹',
  zh: '🇨🇳',
  nl: '🇳🇱',
  pl: '🇵🇱',
  ko: '🇰🇷',
  ar: '🇸🇦',
  id: '🇮🇩',
  vi: '🇻🇳',
  fa: '🇮🇷',
  uk: '🇺🇦',
  th: '🇹🇭',
  cs: '🇨🇿',
  hu: '🇭🇺',
  ro: '🇷🇴',
  sv: '🇸🇪',
  el: '🇬🇷',
  he: '🇮🇱',
}

/** "Hepsi" (tüm diller) seçeneğinin simgesi. */
export const ALL_LOCALES_FLAG = '🌐'

/** Bilinmeyen dil için nötr bayrak. */
export function localeFlag(locale: string): string {
  return FLAGS[locale] ?? '🏳️'
}
