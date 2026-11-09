/**
 * Boş sohbetin "Merhaba de!" düğmesinin gönderdiği selamlama (2026-10-12
 * kullanıcı isteği: "Selamlama kullanıcının diline göre olsun").
 *
 * Dil kaynağı: sitenin seçili dili (`useT().locale`); yoksa çağıran taraf
 * `navigator.language` geçer. Bilinmeyen dil → İngilizce "Hello".
 * SAF modül (React/Supabase yok) — istemcide de, testte de çalışır.
 */

/** Dil kodu → selamlama sözcüğü. Anahtar 2 harfli (bölge eki atılır). */
const GREETINGS: Record<string, string> = {
  tr: 'Merhaba',
  en: 'Hello',
  de: 'Hallo',
  fr: 'Bonjour',
  es: 'Hola',
  it: 'Ciao',
  pt: 'Olá',
  ru: 'Привет',
  ar: 'مرحبا',
  ja: 'こんにちは',
  zh: '你好',
  ko: '안녕하세요',
}

/** "tr-TR" → "tr"; boş/geçersiz girdi boş dize döner. */
function languageCode(locale: string | null | undefined): string {
  return (locale ?? '').trim().toLowerCase().split(/[-_]/)[0] ?? ''
}

/** Selamlama sözcüğü (bilinmeyen dilde İngilizce "Hello"). */
export function helloFor(locale: string | null | undefined): string {
  return GREETINGS[languageCode(locale)] ?? GREETINGS.en
}

/** Boş sohbette gönderilen hazır mesaj: "{selam} 👋". */
export function helloMessage(locale: string | null | undefined): string {
  return `${helloFor(locale)} 👋`
}
