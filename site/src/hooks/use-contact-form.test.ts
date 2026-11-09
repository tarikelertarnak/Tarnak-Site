import { describe, expect, it } from 'vitest'

/**
 * Phone normalization used by use-contact-form submitForm:
 * `+${getCountryCallingCode(country)}${value.replace(/^0+/, '')}`
 */
function phoneWithCode(countryCode: string, raw: string): string {
  return `+${countryCode}${raw.replace(/^0+/, '')}`
}

describe('phone normalization', () => {
  it('strips leading zeros before adding country code', () => {
    expect(phoneWithCode('90', '0532 123 45 67')).toBe('+90532 123 45 67')
  })

  it('keeps non-zero-prefixed numbers as-is', () => {
    expect(phoneWithCode('90', '532 123 45 67')).toBe('+90532 123 45 67')
  })

  it('keeps whitespace structure for readability', () => {
    expect(phoneWithCode('1', '(555) 123-4567')).toBe('+1(555) 123-4567')
  })
})
