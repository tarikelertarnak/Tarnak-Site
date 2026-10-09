import { describe, expect, it } from 'vitest'
import { activeTabPage, tabPageCount } from '@/hooks/use-scroll-state'

/**
 * Sekme çubuğu bölüm hesabı (Faz 6 · admin sekme sorunu 2).
 *
 * Nokta sayısı sekme sayısına BAĞLI DEĞİL — çubuğun taşma miktarından
 * türetilir: `ceil(scrollWidth / clientWidth)`. Bu yüzden 40 sekme olsa
 * bile nokta dizisi kısa kalır.
 */
describe('tabPageCount', () => {
  it('taşma yoksa 1 döner', () => {
    expect(tabPageCount(800, 800)).toBe(1)
  })

  it('taşma 1 piksel bile varsa 2 döner', () => {
    expect(tabPageCount(801, 800)).toBe(2)
  })

  it('iki tam sayfa + kırıntı → 3', () => {
    expect(tabPageCount(1700, 800)).toBe(3)
  })

  it('tam iki sayfa → 2 (gereksiz son nokta üretmez)', () => {
    expect(tabPageCount(1600, 800)).toBe(2)
  })

  it('çok fazla sekme olsa da nokta sayısı makul kalır', () => {
    // 40 sekme, 800px çubuk → 4000/800 = 5 bölüm
    expect(tabPageCount(4000, 800)).toBe(5)
  })

  it('clientWidth 0 (ölçüm yapılmadan) güvenli: 1', () => {
    expect(tabPageCount(1000, 0)).toBe(1)
  })

  it('negatif değerlerde 1 döner', () => {
    expect(tabPageCount(-5, -5)).toBe(1)
  })
})

describe('activeTabPage', () => {
  it('taşma yoksa 0', () => {
    expect(activeTabPage(0, 800, 800)).toBe(0)
  })

  it('baştayken 0', () => {
    expect(activeTabPage(0, 1600, 800)).toBe(0)
  })

  it('sonda son bölüm', () => {
    expect(activeTabPage(800, 1600, 800)).toBe(1)
  })

  it('ortada ara bölüm', () => {
    // pages=4, max=2400. scrollLeft=1600 → 1600/2400 = 0.667 → ×3 = 2.0 → 2
    expect(activeTabPage(1600, 3200, 800)).toBe(2)
  })

  it('ilk bölümün sonuna yakınken 1. bölümde kalır', () => {
    // scrollLeft=800 → 800/2400 = 0.333 → ×3 = 1.0 → 1 (2 değil)
    expect(activeTabPage(800, 3200, 800)).toBe(1)
  })

  it('son değerinden büyük scrollLeft taşmaz', () => {
    const pages = tabPageCount(3200, 800)
    expect(activeTabPage(9999, 3200, 800)).toBe(pages - 1)
  })

  it('negatif scrollLeft 0 döner', () => {
    expect(activeTabPage(-100, 3200, 800)).toBe(0)
  })
})
