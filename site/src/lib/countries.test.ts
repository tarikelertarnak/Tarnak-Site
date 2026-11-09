import { describe, expect, it } from 'vitest'
import { COUNTRIES } from '@/lib/countries-data'

/** ISO2 → flag emoji (mirrors country-select.tsx). */
function flagEmoji(iso2: string): string {
  try {
    return String.fromCodePoint(
      ...iso2
        .toUpperCase()
        .split('')
        .map(c => 127397 + c.charCodeAt(0)),
    )
  }
  catch {
    return '🏳️'
  }
}

/** Search filter mirrors country-select.tsx (case-insensitive on name/iso2/code). */
function search(q: string) {
  const needle = q.trim().toLowerCase().replace(/^\+/, '')
  if (!needle)
    return COUNTRIES
  return COUNTRIES.filter(
    c =>
      c.name.toLowerCase().includes(needle)
      || c.code.includes(needle)
      || c.iso2.toLowerCase().includes(needle),
  )
}

describe('country list (static, from react-international-phone)', () => {
  it('has a healthy, unique set of countries', () => {
    expect(COUNTRIES.length).toBeGreaterThanOrEqual(200)
    const iso2s = COUNTRIES.map(c => c.iso2)
    expect(new Set(iso2s).size).toBe(COUNTRIES.length)
  })

  it('tR and US are present with correct calling codes', () => {
    const tr = COUNTRIES.find(c => c.iso2 === 'tr')!
    const us = COUNTRIES.find(c => c.iso2 === 'us')!
    expect(tr.code).toBe('90')
    expect(us.code).toBe('1')
  })

  it('flag emoji derives from ISO2', () => {
    expect(flagEmoji('tr')).toBe('🇹🇷')
    expect(flagEmoji('US')).toBe('🇺🇸')
  })

  it('search matches English name, ISO2 and code', () => {
    expect(search('Turkey').map(c => c.iso2)).toContain('tr')
    expect(search('turkey').map(c => c.iso2)).toContain('tr') // case-insensitive
    expect(search('de').map(c => c.iso2)).toContain('de') // ISO2
    expect(search('+90').map(c => c.iso2)).toContain('tr') // code
  })

  it('keeps original (source) ordering — priority ahead of alphabetical', () => {
    // Source list is ordered; primary +1 countries appear before others.
    const us = COUNTRIES.findIndex(c => c.iso2 === 'us')
    const ca = COUNTRIES.findIndex(c => c.iso2 === 'ca')
    const do_ = COUNTRIES.findIndex(c => c.iso2 === 'do')
    expect(us).toBeLessThan(ca)
    expect(ca).toBeLessThan(do_)
  })

  it('single-code countries group by calling code (TR=90, GB=44, JP=81)', () => {
    expect(COUNTRIES.find(c => c.iso2 === 'gb')!.code).toBe('44')
    expect(COUNTRIES.find(c => c.iso2 === 'jp')!.code).toBe('81')
    expect(COUNTRIES.find(c => c.iso2 === 'cn')!.code).toBe('86')
  })
})
