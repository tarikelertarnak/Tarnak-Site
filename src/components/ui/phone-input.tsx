'use client'

import { useEffect, useMemo, useState } from 'react'
import { useT } from '@/components/locale-provider'
import { Input } from '@/components/ui/input'
import { CountrySelect } from '@/components/ui/country-select'
import { COUNTRIES } from '@/lib/countries-data'
import { countryFromLanguages } from '@/lib/country-detect'
import {
  COUNTRY_CODE_MAX,
  countryLengthRange,
  maxNumberDigits,
  minNumberDigits,
  sanitizeCountryCode,
  sanitizeNumber,
  validatePhone,
} from '@/lib/phone'

/**
 * Uluslararası telefon girişi.
 *
 *   [🇹🇷 TR ▾]  +  [ 90 (salt okunur) ]  [ 5321234567 ]
 *                └ kod kutusunu seçim doldurur, kullanıcı değiştiremez
 *
 * Uzunluk kuralları sabit değildir: `lib/phone` her ülkenin olası ulusal
 * numara uzunluklarını libphonenumber metadatasından türetir (TR 10, DE 4-15,
 * US 10…). Ülke bilinmiyorsa E.164 aralığına (4-15) düşülür.
 */

export interface PhoneValue {
  /** ISO2 ülke kodu; serbest kod yazılırsa boş kalabilir. */
  iso2: string
  /** Ülke kodu rakamları, "+" hariç. */
  code: string
  /** Ulusal numara (ülke kodu içermez, trunk prefix atılmış). */
  number: string
}

export const EMPTY_PHONE: PhoneValue = { iso2: '', code: '', number: '' }

/** "+905321234567" → { iso2, code, number } */
export function parsePhone(raw: string): PhoneValue {
  const digits = raw
    .replace(/\D/g, '')
    .slice(0, 15)
    .replace(/^0+/, '')
  if (!digits) {
    return EMPTY_PHONE
  }
  // En uzun eşleşen ülke kodunu seç (1, 3 ve 4 haneli kodlar var).
  const match = COUNTRIES
    .filter(c => digits.startsWith(c.code))
    .sort((a, b) => b.code.length - a.code.length)[0]
  if (!match) {
    return { iso2: '', code: '', number: digits }
  }
  return {
    iso2: match.iso2,
    code: match.code,
    number: digits.slice(match.code.length).slice(0, maxNumberDigits(match.code, match.iso2)),
  }
}

const ISO_TO_CODE = new Map(COUNTRIES.map(c => [c.iso2, c.code]))

/** Ülke değişti: numarayı koru, eski ülke kodunu numaradan soy. */
function rebaseNumber(prev: PhoneValue, nextIso2: string): PhoneValue {
  const nextCode = ISO_TO_CODE.get(nextIso2) ?? ''
  let number = prev.number
  if (prev.code && prev.code !== nextCode && number.startsWith(prev.code)) {
    number = number.slice(prev.code.length)
  }
  return {
    iso2: nextIso2,
    code: nextCode,
    number: number.slice(0, maxNumberDigits(nextCode, nextIso2)),
  }
}

export function PhoneInput({
  value,
  onChange,
  label,
  placeholder,
  optionalLabel,
  isInvalid = false,
  errorMessage,
  required = false,
}: {
  value: PhoneValue
  onChange: (v: PhoneValue) => void
  label: string
  placeholder?: string
  optionalLabel?: string
  isInvalid?: boolean
  errorMessage?: string
  required?: boolean
}) {
  const { t } = useT()

  // Ülke kuralı (TR 10, DE 6-11, …). Ülke bilinmiyorsa/veri yoksa SINIR
  // KOYULMAZ — sadece rakam filtresi geçerli (kullanıcı "10-10 digits" gibi
  // sabit etiketler görmesin, veri neyse o).
  const range = useMemo(
    () => (value.iso2 ? countryLengthRange(value.iso2) : null),
    [value.iso2],
  )
  const hasRule = !!range && range.lengths.length > 0
  const maxLen = maxNumberDigits(value.code, value.iso2)
  const minLen = minNumberDigits(value.code, value.iso2)

  const CODE_TO_ISO = useMemo(
    () => new Map(COUNTRIES.map(c => [c.code, c.iso2])),
    [],
  )

  /**
   * Kod kutusu elle yazılır: listede eşleşen ülke OTOMATİK seçilir
   * ("90" yaz → Türkiye). Eşleşme yoksa serbest kalır, yanlış ülke zorlanmaz.
   */
  const [codeDraft, setCodeDraft] = useState<string | null>(null)
  const shownCode = codeDraft ?? value.code

  /**
   * Otomatik ülke seçimi (kullanıcı isteği 2026-10-05): "Ülke seç
   * otomatik bilgisayarımızın dilini çekip o dilin ülkesini varsayılan
   * olarak göstersin; önce konum, konum bulunamazsa dilden gider."
   *
   * Uygulama notları:
   *  - Konum (`navigator.geolocation`) ÜLKE vermez, koordinat verir; ülkeye
   *    çevirmek dış servis + izin ister. Form doldururken otomatik izin
   *    istemek yanlış, o yüzden sıralama pratikte "dil" oluyor. Konum yolu
   *    `resolveCountryFromGeolocation`'da ayrı tutuldu — sağlayıcı bağlanınca
   *    tek satır değişir.
   *  - Sadece BOŞ formda çalışır: kullanıcı ülkeyi/numarayı değiştirdiyse
   *    veya alan bir kayıttan geliyorsa dokunmaz (yoksa yüklenen kaydın
   *    ülkesi tarayıcı diliyle ezilir).
   *  - `autoGuessed` bir kez çalışır; sonraki render'larda tekrar etki
   *    etmez, böylece kullanıcının seçimi ikinci render'da geri alınmaz.
   *  - Sunucu tarafında `navigator` yok; effect zaten sadece istemcide çalışır
   *    ama hydration uyumsuzluğu olmasın diye `iso2` state'i ile değil,
   *    doğrudan `onChange` ile ilerliyoruz ve effect içinde `typeof`
   *    kontrolü var.
   */
  const [autoGuessed, setAutoGuessed] = useState(false)
  useEffect(() => {
    if (autoGuessed)
      return
    // Alan zaten doluysa (kayıt geldi / kullanıcı seçti) karışma.
    if (value.iso2 || value.number || value.code) {
      setAutoGuessed(true)
      return
    }
    const detected = countryFromLanguages()
    if (detected)
      onChange(rebaseNumber(EMPTY_PHONE, detected))
    setAutoGuessed(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGuessed])

  useEffect(() => {
    if (codeDraft === null) {
      return
    }
    const digits = sanitizeCountryCode(codeDraft)
    if (!digits) {
      onChange({ ...value, code: '', number: sanitizeNumber(value.number, '', value.iso2) })
      return
    }
    const iso2 = CODE_TO_ISO.get(digits)
    const nextIso = iso2 ?? ''
    onChange({
      iso2: nextIso,
      code: digits,
      number: sanitizeNumber(value.number, digits, nextIso),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeDraft, value])

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {/*
        Aralıklar: combobox -> "+" -> kod kutusu -> numara. "+" combobox'un
        DIŞINDA ayrı bir işaret; kutular arasında rahat boşluk (önce bitişik
        görünüyordu).
      */}
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
        {/* Ülke — küçük, kendi yerinde */}
        <div className="w-full shrink-0 sm:w-auto">
          <CountrySelect
            value={value.iso2}
            onChange={(iso2) => {
              setCodeDraft(null)
              onChange(rebaseNumber(value, iso2))
            }}
          />
        </div>

        {/* "+" kalıcı önek: seçilemez/silinemez işaret */}
        <span
          aria-hidden="true"
          className="hidden shrink-0 text-lg font-semibold leading-none text-foreground/60 sm:block"
        >
          +
        </span>

        {/* Kod kutusu: dar (4 haneye sığar), rakam-only */}
        <div className="w-full shrink-0 sm:w-[3.5rem]">
          <Input
            aria-label={`${label} — ${t('phone.countryCode')}`}
            inputMode="numeric"
            placeholder={t('phone.codePlaceholder')}
            value={shownCode}
            onValueChange={v => setCodeDraft(sanitizeCountryCode(v))}
            maxLength={COUNTRY_CODE_MAX}
            className="[&_input]:w-full [&_input]:min-w-0 [&_input]:px-1 [&_input]:text-center [&_input]:text-sm"
            isInvalid={isInvalid}
          />
        </div>

        {/* Ulusal numara — SADECE rakam, veri varsa ülke uzunluğu sınırı */}
        <div className="w-full min-w-0 flex-[2] basis-0">
          <Input
            type="tel"
            aria-label={label}
            placeholder={placeholder ?? t('phone.numberPlaceholder')}
            value={value.number}
            onValueChange={number =>
              onChange({ ...value, number: sanitizeNumber(number, value.code, value.iso2) })
            }
            maxLength={hasRule ? maxLen : undefined}
            minLength={hasRule && minLen > 0 ? minLen : undefined}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            className="[&_input]:w-full [&_input]:min-w-0"
            isInvalid={isInvalid}
            errorMessage={errorMessage}
          />
        </div>
      </div>

      {/*
        "10-10 digits" gibi sabit uzunluk etiketi YOK: kullanıcı bunu istemedi.
        Gerçek sınır veriden (libphonenumber) geliyor ve sadece veri varsa
        uygulanıyor; yoksa hiçbir limit koyulmuyor. Yalnızca hata durumunda
        anlaşılır mesaj gösterilir.
      */}
      {errorMessage && (
        <p className="text-sm font-medium text-danger">{errorMessage}</p>
      )}
      {optionalLabel && !required && (
        <p className="-mt-1 text-xs text-foreground/50">{optionalLabel}</p>
      )}
    </div>
  )
}
