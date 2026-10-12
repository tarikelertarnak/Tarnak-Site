import { describe, expect, it } from 'vitest'
import { HERO_SCROLL_BAR, HERO_SCROLL_GAP, HERO_SCROLL_OFFSET, heroScrollTop } from '@/lib/hero-scroll'

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

/*
  2026-10-13 (kullanıcı: "HAKKIMDA başlığı header'ın hemen altına yapışıyor,
  arada hiç boşluk kalmıyor"): kaydırma payı TEK ayar noktası oldu.
    offset = üst çubuk (+kart dolgusu) + nefes payı
  Pay 16px: sayfa eskisinden 16px DAHA AZ kayar, başlık üstünde boşluk kalır.
*/
describe('heroScroll ayar sabitleri', () => {
  it('offset = üst çubuk + nefes payı (tek kaynak)', () => {
    expect(HERO_SCROLL_OFFSET).toBe(HERO_SCROLL_BAR + HERO_SCROLL_GAP)
  })

  it('nefes payı 16px (kullanıcı isteği: 12-16px arası, 20px üst sınır)', () => {
    expect(HERO_SCROLL_GAP).toBe(16)
  })

  it('offset eski 80px\'ten büyük → daha fazla boşluk bırakır', () => {
    expect(HERO_SCROLL_OFFSET).toBeGreaterThan(80)
  })
})
