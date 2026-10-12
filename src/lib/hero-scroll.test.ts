import { describe, expect, it } from 'vitest'
import { HERO_SCROLL_OFFSET, heroScrollTop } from '@/lib/hero-scroll'

function rect(top: number) {
  return {
  top,
  bottom: top + 100,
  left: 0,
  right: 100,
  width: 100,
  height: 100,
  x: 0,
  y: top,
  toJSON: () => ({}),
}
}

describe('heroScrollTop (2026-10-12: "fare" düğmesi kısa kaydırıyordu)', () => {
  it('h2 başlığını üst çubuk payıyla hesaplar', () => {
    const section = document.createElement('section')
    const h2 = document.createElement('h2')
    section.append(h2)
    Object.defineProperty(h2, 'getBoundingClientRect', {
      value: () => rect(1500),
    })
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    expect(heroScrollTop(section)).toBe(1500 - HERO_SCROLL_OFFSET)
  })

  it('h2 yoksa bölümün kendisini kullanır (offset yine uygulanır)', () => {
    const section = document.createElement('section')
    Object.defineProperty(section, 'getBoundingClientRect', {
      value: () => rect(900),
    })
    Object.defineProperty(window, 'scrollY', { value: 200, configurable: true })
    expect(heroScrollTop(section)).toBe(900 + 200 - HERO_SCROLL_OFFSET)
  })

  it('scrollY etkisi eklenir (aşağıdayken daha aşağı hedef)', () => {
    const section = document.createElement('section')
    const h2 = document.createElement('h2')
    section.append(h2)
    Object.defineProperty(h2, 'getBoundingClientRect', {
      value: () => rect(-500),
    })
    Object.defineProperty(window, 'scrollY', { value: 1600, configurable: true })
    expect(heroScrollTop(section)).toBe(1600 - 500 - HERO_SCROLL_OFFSET)
  })

  it('null/undefined → 0 (bölüm yoksa tıklama güvenle çıkar)', () => {
    expect(heroScrollTop(null)).toBe(0)
    expect(heroScrollTop(undefined)).toBe(0)
  })

  it('negatife inmez (sayfa tepesinde sınır)', () => {
    const section = document.createElement('section')
    Object.defineProperty(section, 'getBoundingClientRect', {
      value: () => rect(10),
    })
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    expect(heroScrollTop(section)).toBe(0)
  })
})
