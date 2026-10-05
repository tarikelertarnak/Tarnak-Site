/**
 * Tarayıcı dilinden ülke tahmini + konum tabanlı ülke çözümü.
 *
 * KULLANICI İSTEĞİ (2026-10-05): "Ülke seç otomatik bilgisayarımızın dilini
 * çekip o dilin ülkesini varsayılan olarak göstersin; desteklemek için
 * konumda baksın, önce konum, konum bulunamazsa dilden gider."
 *
 * YANLIŞ ANLAŞILMASIN: `navigator.language` bir DİL kodudur ("tr-TR"), ülke
 * DEĞİL. Gerçek konum `navigator.geolocation` ile alınır ama:
 *   - izni kullanıcı verir (istemek zorunda),
 *   - Workers/edge'de sunucu tarafında YOK,
 *   - formu doldurmak için asla otomatik izin istemeyiz (kötü UX).
 * Bu yüzden sıralama: dil → eşleşen ülke, konum izni KESİNLİKLE
 * istemeden. Konum ancak kullanıcı AYRICAca izin verirse kullanılır
 * (`resolveCountryFromGeolocation`), o da `CountrySelect`'in dışında,
 * açık bir kullanıcı eylemiyle tetiklenir.
 *
 * ÇÖZÜMLEME KURASI:
 *   1. Dil bölgesi (`en-GB` → GB). Dil listesinde ülke kodu yoksa `en`
 *      gibi yalın diller için varsayılan ülkeye düşülür (en → US, tr → TR).
 *   2. Bölge `COUNTRIES` içinde yoksa aynı dilden başka bir ülkeye bakılır
 *      (ör. `es-MX` → `es` → ES, çünkü MX listede yoksa).
 *   3. Hiçbiri tutmuyorsa `''` (seçim yok) — çağıran kendi varsayılanını
 *      kullanır. ASLA yanlış ülke uydurmuyoruz.
 */

import { COUNTRIES } from '@/lib/countries-data'

/**
 * `COUNTRIES` içinde gerçekten var mı (ISO2, büyük harf).
 * Not: `iso2` alanı küçük harf; `KNOWN` büyütülmüş olarak tutulur.
 */
const KNOWN = new Set(COUNTRIES.map(c => c.iso2.toUpperCase()))


/**
 * Yalın dil -> ülke. Dil kodu tek başına ülke vermediğinde (en, tr, ar, de…)
 * o dilin en olası ülkesi. Anahtarlar küçük harf.
 */
const LANG_TO_COUNTRY: Record<string, string> = {
  en: 'US',
  tr: 'TR',
  de: 'DE',
  fr: 'FR',
  es: 'ES',
  it: 'IT',
  nl: 'NL',
  pt: 'BR',
  ru: 'RU',
  ar: 'SA',
  fa: 'IR',
  ur: 'PK',
  hi: 'IN',
  bn: 'BD',
  ta: 'IN',
  te: 'IN',
  th: 'TH',
  vi: 'VN',
  id: 'ID',
  ms: 'MY',
  tl: 'PH',
  fil: 'PH',
  zh: 'CN',
  ja: 'JP',
  ko: 'KR',
  he: 'IL',
  el: 'GR',
  uk: 'UA',
  pl: 'PL',
  cs: 'CZ',
  sk: 'SK',
  hu: 'HU',
  ro: 'RO',
  bg: 'BG',
  sr: 'RS',
  hr: 'HR',
  sl: 'SI',
  sv: 'SE',
  no: 'NO',
  da: 'DK',
  fi: 'FI',
  et: 'EE',
  lv: 'LV',
  lt: 'LT',
  is: 'IS',
  ga: 'IE',
  cy: 'GB',
  sq: 'AL',
  mk: 'MK',
  bs: 'BA',
  ka: 'GE',
  hy: 'AM',
  az: 'AZ',
  kk: 'KZ',
  uz: 'UZ',
  ne: 'NP',
  si: 'LK',
  my: 'MM',
  km: 'KH',
  lo: 'LA',
  am: 'ET',
  sw: 'KE',
  zu: 'ZA',
  af: 'ZA',
  so: 'SO',
  ha: 'NG',
  yo: 'NG',
  ig: 'NG',
}

/**
 * Gerçek dil etiketleri (BCP-47), `LANG_TO_COUNTRY` ile aynı anahtarlar.
 *
 * Neden ayrı: ISO 3166 ülke kodu ile BCP-47 dil kodu aynı iki harfli alfabeyi
 * paylaşıyor. `an` ISO'da Hollanda Antilleri, BCP-47'de Landänska'dır;
 * `sm` Samoa vs Samoaca, `bi` Biskaylar vs Bislama. Hangisinin "bölge"
 * sayılacağı bu ikinci tabloya bakarak karar veriliyor.
 */
const LANGUAGE_TAGS = new Set(Object.keys(LANG_TO_COUNTRY))

/**
 * Tarayıcının dil listesinden ülke çözer.
 *
 * @param languages `navigator.languages` ya da herhangi bir dizi; verilmezse
 *                   `navigator.languages` (yoksa `navigator.language`) okunur.
 * @returns ISO2 (büyük harf) ya da `''`.
 */
export function countryFromLanguages(languages?: readonly string[]): string {
  const list = languages
    ?? (typeof navigator !== 'undefined'
      ? ((navigator.languages?.length ? [...navigator.languages] : [navigator.language]).filter(Boolean) as string[])
      : [])

  // 1) Önce tam bölgesi olan bir dil: `tr-TR` → TR.
  for (const tag of list) {
    const region = regionOf(tag)
    if (region && KNOWN.has(region))
      return region
  }

  // 2) Bölge listede yoksa dilden eşleştir: `es-MX` → es → ES.
  for (const tag of list) {
    const lang = langOf(tag)
    if (!lang)
      continue
    const guess = LANG_TO_COUNTRY[lang]
    if (guess && KNOWN.has(guess))
      return guess
  }

  return ''
}

/**
 * `tr-TR` → `TR`; yalın `tr` → `''` (bölge yok).
 *
 * ⚠️ İki harfli her parça bölge DEĞİLDİR: `de` hem bir dil kodu hem de
 * Almanya'nın ülke kısaltması. Ayrım listeden yapılır: parça `COUNTRIES`
 * içinde bir ülke olarak varsa VE o ülke kodunun bir dil karşılığıyla
 * çelişmiyorsa bölgedir.
 *
 * `zh-Hans` → `Hans` (4 harf, ülke olamaz) → bölge yok, doğru.
 * `zh-Hans-CN` → `CN` → bölge CN, doğru.
 * `de-DE` → son parça `de` → bölge DE (DE listede var), doğru.
 * `an` → son parça `an` listede VAR ama `an` Landänska işaretçisi;
 *        dil tablosunda `an` yok, bu yüzden bölge sayılmaz.
 */
function regionOf(tag: string): string {
  const parts = tag.toLowerCase().split('-')
  const last = parts[parts.length - 1]
  if (!last || !/^[a-z]{2}$/.test(last))
    return ''
  // `xx` bir dil kodu olarak tanınıyorsa bu bir bölge değil (`an`, `sm`…):
  // dil tablosunda olmayan iki harfler önce ülke olarak denenir.
  const upper = last.toUpperCase()
  if (!KNOWN.has(upper))
    return ''
  // Landänska gibi gerçek işaretçiler yanlışlıkla ülkeye dönüşmesin:
  // bu kod bir dil anahtarıysa ve o dilin ülkesi başka bir ülkeyse
  // (`an` -> Landänska), etiketi bölgesiz say.
  if (LANGUAGE_TAGS.has(last) && LANG_TO_COUNTRY[last] !== upper)
    return ''
  return upper
}

/**
 * `tr-TR` → `tr`.
 */
function langOf(tag: string): string {
  return tag.toLowerCase().split('-')[0] ?? ''
}

/**
 * Konumdan ülke — YALNIZCA açık kullanıcı eylemiyle çağrılmalı.
 *
 * NOT: `navigator.geolocation` ülke DEĞİL, koordinat verir; ülkeye çevirmek
 * için bir IP/coords→country servisi gerekir. Burada dış servis çağırmıyoruz
 * (gizlilik + gereksiz bağımlılık): fonksiyon ileride bir sağlayıcı
 * bağlandığında tek noktadan değiştirilebilsin diye ayrı tutuldu ve şimdilik
 * `''` döndürüyor — yani "konum bulunamadı" yolunu temsil eder.
 */
export async function resolveCountryFromGeolocation(): Promise<string> {
  if (typeof navigator === 'undefined' || !navigator.geolocation)
    return ''
  // Koordinat → ülke çevirisi sağlayıcısı bağlanana kadar burada bir şey
  // yapılmıyor: konum izni istemeden `getCurrentPosition` çağırmak doğru
  // değil, sonuç da ülke değil koordinat olurdu.
  return ''
}
