import assert from 'node:assert'
import { describe, it } from 'vitest'
import {
  COUNTRY_CODE_MAX,
  E164_MAX_DIGITS,
  countryLengthRange,
  maxNumberDigits,
  minNumberDigits,
  normalizePhone,
  sanitizeCountryCode,
  sanitizeNumber,
  validatePhone,
} from '@/lib/phone'
import { parsePhone } from '@/components/ui/phone-input'

describe('ITU-T E.164 temel limitleri', () => {
  it('uluslararasi numara en fazla 15 hane', () => {
    assert.equal(E164_MAX_DIGITS, 15)
  })

  it('ulke kodu en fazla 4 hane', () => {
    assert.equal(COUNTRY_CODE_MAX, 4)
  })

  it('15 haneyi kabul eder, 16 haneyi reddeder', () => {
    assert.equal(normalizePhone('+905321234567').ok, true)
    assert.equal(normalizePhone('+123456789012345').ok, true)
    assert.equal(normalizePhone('+1234567890123456').verdict, 'tooLong')
  })

  it('b bicimlendir: +90 532 123 45 67 -> +905321234567', () => {
    assert.equal(normalizePhone('+90 532 123 45 67').value, '+905321234567')
    assert.equal(normalizePhone('90-532.123.45.67').value, '+905321234567')
  })
})

describe('dinamik ulke uzunluklari (libphonenumber metadatasi)', () => {
  it('Turkiye standart olarak 10 hanedir', () => {
    assert.equal(countryLengthRange('tr').max, 10)
    assert.equal(maxNumberDigits('90', 'tr'), 10)
    assert.equal(minNumberDigits('90', 'tr'), 10)
  })

  it('ABD 10 hanedir', () => {
    assert.equal(countryLengthRange('us').max, 10)
  })

  it('Almanya degisken uzunluktur (cok genis aralik)', () => {
    const de = countryLengthRange('de')
    assert.ok(de.max > de.min, `DE araligi sabit olmamali: ${de.min}-${de.max}`)
  })

  it('bilinmeyen ulke E.164 araligina duser', () => {
    assert.equal(countryLengthRange('zz').min, 4)
    assert.equal(countryLengthRange('zz').max, 15)
  })

  it('ulke tarani E.164 tavanini aslamaz', () => {
    for (const iso of ['tr', 'us', 'de', 'gb', 'ci']) {
      const cc = countryLengthRange(iso).max
      assert.ok(cc <= E164_MAX_DIGITS, `${iso} tavan ${cc} > 15`)
    }
  })
})

describe('dogrulama: gecerli girisler asla engellenmez', () => {
  it('gecerli TR numarasi valid', () => {
    const r = validatePhone('90', '5321234567', 'tr')
    assert.equal(r.ok, true)
    assert.equal(r.verdict, 'valid')
  })

  it('TR icin yanlis uzunluk tooShort', () => {
    const r = validatePhone('90', '532123', 'tr')
    assert.equal(r.ok, false)
    assert.equal(r.verdict, 'tooShort')
  })

  it('TR icin asiri uzunluk engellenir', () => {
    const r = validatePhone('90', '53212345678', 'tr')
    assert.equal(r.ok, false)
  })

  it('bilinmeyen ulke kodunda E.164 toplam 4-15 kabul edilir', () => {
    // kod 3 hane + numara 12 hane = 15 (tavan). 16 hane reddedilir.
    assert.equal(validatePhone('999', '1234', '').ok, true)
    assert.equal(validatePhone('999', '1'.repeat(12), '').ok, true)
    assert.equal(validatePhone('999', '1'.repeat(13), '').verdict, 'tooLong')
    // +999 + 1 = 4 hane toplam: E.164 alt sinirinda, kabul edilir.
    assert.equal(validatePhone('999', '1', '').ok, true)
    assert.equal(validatePhone('99', '1', '').verdict, 'tooShort')
  })

  it('bos deger gecerli', () => {
    assert.equal(validatePhone('', '', '').verdict, 'empty')
  })
})

describe('kutu kurallari: sadece rakam, 0 ile baslamaz', () => {
  it('ulke kutusu harf/boşluk/isaret atar', () => {
    assert.equal(sanitizeCountryCode('9a0'), '90')
    assert.equal(sanitizeCountryCode('+90 5'), '905')
    assert.equal(sanitizeCountryCode('abc'), '')
    assert.equal(sanitizeCountryCode('1 2 3'), '123')
  })

  it('ulke kodu 0 ile baslayamaz', () => {
    assert.equal(sanitizeCountryCode('090'), '90')
    assert.equal(sanitizeCountryCode('00'), '')
    assert.equal(sanitizeCountryCode('0'), '')
  })

  it('ulke kodu en fazla 4 hane', () => {
    assert.equal(sanitizeCountryCode('12681').length, 4)
  })

  it('numara 0 ile baslayamaz — trunk prefix atilir', () => {
    assert.equal(sanitizeNumber('05321234567', '90', 'tr'), '5321234567')
    assert.equal(sanitizeNumber('000532', '90', 'tr'), '532')
  })

  it('numara yalnizca rakam kabul eder', () => {
    assert.equal(sanitizeNumber('532abc123', '90', 'tr'), '532123')
    assert.equal(sanitizeNumber('532 123 45 67', '90', 'tr'), '5321234567')
  })

  it('numara ulke kurali + E.164 tavanina gore kirpilir', () => {
    assert.equal(sanitizeNumber('1'.repeat(20), '', '').length, 15)
    assert.equal(sanitizeNumber('1'.repeat(20), '90', 'tr').length, 10)
    // DE degisken uzunluklu: tavan ulke kuralindan gelir ama E.164'u aslamaz.
    const deLen = sanitizeNumber('1'.repeat(20), '', 'de').length
    assert.ok(deLen <= 15 && deLen >= 11, 'DE tavanı ' + deLen)
  })

  it('normalizePhone trunk prefixi atar', () => {
    assert.equal(normalizePhone('+05321234567').value, '+5321234567')
    assert.equal(normalizePhone('00905321234567').value, '+905321234567')
  })
})

describe('parsePhone', () => {
  it('ulke kodunu ayirir', () => {
    const p = parsePhone('+905321234567')
    assert.equal(p.iso2, 'tr')
    assert.equal(p.code, '90')
    assert.equal(p.number, '5321234567')
  })

  it('4 haneli kod en uzun eslesme kazanir (1268)', () => {
    assert.equal(parsePhone('+12685551234').code, '1268')
  })
})
