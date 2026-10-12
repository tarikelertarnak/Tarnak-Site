import { describe, expect, it } from 'vitest'
import { ARROW_STEP, centerScrollLeft } from '@/hooks/use-scroll-state'

/**
 * Aktif sekme ortalaması (2026-10-13 kullanıcı isteği): sekme seçilince şerit
 * onu görünür alanın ORTASINA getirir. Kenarlarda negatife düşmez (kaydırma
 * `scrollTo` içinde ayrıca 0..max aralığına kırpılır).
 */
describe('centerScrollLeft', () => {
  it('sekme ortadaysa kaydırma yapmaz', () => {
    // şerit 800, sekme 0..100 → ortası 50, şerit ortası 400 → fark -350 → 0
    expect(centerScrollLeft(0, 100, 800)).toBe(0)
  })

  it('sağdaki sekmeyi ortaya alır', () => {
    // sekme 1600'de başlıyor, 200 geniş → 1600 - (800-200)/2 = 1300
    expect(centerScrollLeft(1600, 200, 800)).toBe(1300)
  })

  it('negatif sonuç 0 döner', () => {
    expect(centerScrollLeft(0, 40, 1000)).toBe(0)
  })
})

describe('ok başına kaydırma sabiti', () => {
  it('ok başına 200 px kaydırır', () => {
    expect(ARROW_STEP).toBe(200)
  })
})
