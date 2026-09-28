/**
 * Telefon kuralları — ITU-T E.164 + libphonenumber-js (dinamik ülke metadatası).
 *
 * Sabit uzunluk hardcode etmiyoruz: her ülkenin olası ulusal numara uzunlukları
 * libphonenumber metadatasından türetilir (ör. TR 10, DE 4-15, US 10). Ülke
 * bilinmiyorsa veya aralık çıkarılamıyorsa E.164 genel aralığına (4-15) düşeriz
 * — böylece geçerli hiçbir giriş yanlışlıkla engellenmez.
 */
import type { CountryCode } from 'libphonenumber-js'
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js/max'

/** ITU-T E.164: uluslararası numara en fazla 15 hane ("+" hariç). */
export const E164_MAX_DIGITS = 15
/** E.164 alt sınırı — daha kısası uluslararası numara olamaz. */
export const E164_MIN_DIGITS = 4
/** Ülke kodu pratikte 1-4 hane (veri setinde 1268 gibi 4 haneli kodlar var). */
export const COUNTRY_CODE_MAX = 4
/** "+905321234567" biçiminde saklıyoruz. */
export const PHONE_MAX_CHARS = E164_MAX_DIGITS + 1

export interface LengthRange {
  /** Ülkenin kabul ettiği ulusal numara uzunlukları (boşsa bilinmiyor). */
  lengths: number[]
  min: number
  max: number
}

const rangeCache = new Map<string, LengthRange>()

/**
 * Bir ülkenin olası ulusal numara uzunluklarını metadatasından türetir.
 *
 * "5" rakamıyla doldurup `isPossible()` soruyoruz: kütüphanenin kendi
 * nationalNumberPattern'ini kullanmış oluyoruz, yani ileride pattern
 * değişirse burası kendini günceller. Sonuç ülke başına önbelleğe alınır.
 */
export function countryLengthRange(iso2: string): LengthRange {
  const key = iso2.toLowerCase()
  const cached = rangeCache.get(key)
  if (cached) {
    return cached
  }

  const fallback: LengthRange = { lengths: [], min: E164_MIN_DIGITS, max: E164_MAX_DIGITS }
  // libphonenumber ISO kodu BÜYÜK harf bekliyor: kucuk harfle "Unknown country: tr" atiyor.
  const iso = key.toUpperCase() as CountryCode
  let cc: string
  try {
    cc = getCountryCallingCode(iso)
  }
  catch {
    rangeCache.set(key, fallback)
    return fallback
  }
  if (!cc) {
    rangeCache.set(key, fallback)
    return fallback
  }

  const valid: number[] = []
  const possible: number[] = []
  for (let n = 1; n <= E164_MAX_DIGITS; n++) {
    try {
      const candidate = `+${cc}${'5'.repeat(n)}`
      const parsed = parsePhoneNumberFromString(candidate, iso)
      if (!parsed) {
        continue
      }
      if (parsed.isValid()) {
        valid.push(n)
      }
      if (parsed.isPossible()) {
        possible.push(n)
      }
    }
    catch {
      // gecersiz uzunluk — atla
    }
  }

  // Once GECERLI (standart) uzunluklar: TR 10, US 10 gibi. `isPossible` ozel
  // numaralari da sayiyordu (TR'de 13) — giris siniri olarak cok gevsek kaliyordu.
  // Hic gecerli uzunluk yoksa `isPossible`a dusulur, o da yoksa E.164.
  const lengths = valid.length > 0 ? valid : possible

  const range: LengthRange = lengths.length
    ? { lengths, min: lengths[0], max: lengths[lengths.length - 1] }
    : fallback
  rangeCache.set(key, range)
  return range
}

/** libphonenumber'ın tanıdığı ülke mi? */
export function isKnownIso(iso2: string): boolean {
  try {
    return getCountries().includes(iso2.toUpperCase() as CountryCode)
  }
  catch {
    return false
  }
}

/** Number kutusuna yazılabilecek azami hane: E.164 tavanı veya ülke kuralı. */
export function maxNumberDigits(code: string, iso2 = ''): number {
  const ccLen = Math.min(code.replace(/\D/g, '').length, COUNTRY_CODE_MAX)
  const hardCap = E164_MAX_DIGITS - ccLen
  if (!iso2) {
    return hardCap
  }
  const range = countryLengthRange(iso2)
  // Ülke tavanı E.164'ten geniş olamaz.
  return Math.min(Math.max(range.max, 1), hardCap)
}

/** Number kutusuna yazılabilecek asgari hane (0 = kısıt yok). */
export function minNumberDigits(code: string, iso2 = ''): number {
  if (!iso2) {
    return 0
  }
  const range = countryLengthRange(iso2)
  return Math.min(range.min, maxNumberDigits(code, iso2))
}

/**
 * Ülke kutusu girdisini temizler.
 *
 * Kurallar:
 *   - yalnızca rakam (harf, boşluk, "+", "()" atılır)
 *   - en fazla 4 hane
 *   - 0 ile BAŞLAMAZ (hiçbir ülke kodu 0 ile başlamaz)
 */
export function sanitizeCountryCode(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, COUNTRY_CODE_MAX)
  return digits.replace(/^0+/, '')
}

/**
 * Numara kutusu girdisini temizler.
 *
 * Kurallar:
 *   - yalnızca rakam
 *   - 0 ile BAŞLAMAZ: uluslararası biçimde trunk prefix (0) atılır —
 *     "0532…" yazılırsa baştaki 0 silinir
 *   - ülke kuralı + E.164 tavanına göre kırpılır
 */
export function sanitizeNumber(input: string, code: string, iso2 = ''): string {
  const digits = input.replace(/\D/g, '').replace(/^0+/, '')
  return digits.slice(0, maxNumberDigits(code, iso2))
}

export type PhoneVerdict
  = | 'empty'
    | 'tooShort'
    | 'tooLong'
    | 'invalidCountry'
    | 'invalid'
    | 'possible'
    | 'valid'

export interface PhoneCheck {
  ok: boolean
  /** Temizlenmiş değer: "+<code><number>". */
  value: string
  verdict: PhoneVerdict
  /** Ülke kuralına göre beklenen uzunluk aralığı (bilinmiyorsa E.164). */
  min?: number
  max?: number
}

/**
 * Tam doğrulama. Önce ülke metadatası (libphonenumber), bilinmiyorsa E.164
 * aralığına düşer — böylece ileride uzunluğu değişen ülkeler de geçerli kalır.
 */
export function validatePhone(
  code: string,
  number: string,
  iso2 = '',
): PhoneCheck {
  const cc = code.replace(/\D/g, '')
  const nat = number.replace(/\D/g, '')
  if (!cc && !nat) {
    return { ok: true, value: '', verdict: 'empty' }
  }
  const value = `+${cc}${nat}`

  const hardMax = E164_MAX_DIGITS - Math.min(cc.length, COUNTRY_CODE_MAX)
  if (nat.length > hardMax || cc.length + nat.length > E164_MAX_DIGITS) {
    return { ok: false, value, verdict: 'tooLong', max: hardMax }
  }

  // Ülke seçiliyse libphonenumber'a sor — gerçek kural bu.
  if (iso2 && isKnownIso(iso2)) {
    const range = countryLengthRange(iso2)
    // Önce UZUNLUK: kullanıcı yazarken henüz tamamlamamış olabilir, o yüzden
    // "çok kısa/çok uzun" bilgisi pattern hatasından ayrı tutulur.
    if (nat.length > 0 && nat.length < range.min) {
      return { ok: false, value, verdict: 'tooShort', min: range.min, max: range.max }
    }
    if (nat.length > range.max) {
      return { ok: false, value, verdict: 'tooLong', min: range.min, max: range.max }
    }
    const parsed = parsePhoneNumberFromString(value, iso2.toUpperCase() as CountryCode)
    if (parsed) {
      if (parsed.isValid()) {
        return { ok: true, value, verdict: 'valid', min: range.min, max: range.max }
      }
      // Uzunluk doğru ama rakam kalıbı tutmuyor → yine de "olası" kabul et
      // (kullanıcı yazarken henüz tamamlamamış olabilir).
      if (parsed.isPossible()) {
        return { ok: true, value, verdict: 'possible', min: range.min, max: range.max }
      }
      return { ok: false, value, verdict: 'invalid', min: range.min, max: range.max }
    }
    if (nat.length < range.min) {
      return { ok: false, value, verdict: 'tooShort', min: range.min, max: range.max }
    }
    return { ok: false, value, verdict: 'invalidCountry', min: range.min, max: range.max }
  }

  // Ülke yok/bilinmiyor → E.164 genel aralığı (4-15). Katı engelleme yok.
  const total = cc.length + nat.length
  if (total > E164_MAX_DIGITS) {
    return { ok: false, value, verdict: 'tooLong', max: E164_MAX_DIGITS }
  }
  if (total < E164_MIN_DIGITS) {
    return { ok: false, value, verdict: 'tooShort', min: E164_MIN_DIGITS, max: E164_MAX_DIGITS }
  }
  return { ok: true, value, verdict: 'possible', min: E164_MIN_DIGITS, max: E164_MAX_DIGITS }
}

/** Serbest biçimli telefonu E.164'e çevirir (sunucu tarafı, trust boundary). */
export function normalizePhone(input: string | null | undefined): PhoneCheck {
  const raw = (input ?? '').trim()
  if (!raw) {
    return { ok: true, value: '', verdict: 'empty' }
  }
  if (!/^\+?[\d\s().-]+$/.test(raw)) {
    return { ok: false, value: '', verdict: 'invalid' }
  }
  let digits = raw.replace(/\D/g, '')
  if (digits.length > E164_MAX_DIGITS) {
    return { ok: false, value: '', verdict: 'tooLong', max: E164_MAX_DIGITS }
  }
  digits = digits.replace(/^0+/, '')
  if (!digits) {
    return { ok: true, value: '', verdict: 'empty' }
  }
  const value = `+${digits}`
  const parsed = parsePhoneNumberFromString(value)
  if (parsed?.isValid()) {
    return { ok: true, value, verdict: 'valid' }
  }
  if (parsed?.isPossible()) {
    return { ok: true, value, verdict: 'possible' }
  }
  // Bilinmeyen ülke kodu → E.164 aralığında kabul et (yanlış engelleme yok).
  if (digits.length >= E164_MIN_DIGITS) {
    return { ok: true, value, verdict: 'possible', min: E164_MIN_DIGITS, max: E164_MAX_DIGITS }
  }
  return { ok: false, value, verdict: 'tooShort', min: E164_MIN_DIGITS, max: E164_MAX_DIGITS }
}
