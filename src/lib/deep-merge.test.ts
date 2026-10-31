import { describe, expect, it } from 'vitest'
import { deepMergeContent } from '@/lib/deep-merge'

/**
 * İçerik katmanı birleştirme (2026-10-31).
 *
 * REGRESYON KİLİDİ: `getContent()` paket içeriği taban, Supabase satırını
 * üzerine binen katman sayar. Birleştirme tek seviye derinlikte kalırsa
 * satırdaki `phase6` nesnesi paketteki `phase6.now` bölümünü SESSİZCE siler
 * (canlıda ölçüldü: /now sayfası boş kaldı).
 */

describe('deepMergeContent', () => {
  it('iç içe nesneleri birleştirir, çakışan yaprakta üst katman kazanır', () => {
    const base = { phase6: { now: { title: 'Now' }, privacy: { title: 'Privacy Policy' } } }
    const overlay = { phase6: { privacy: { title: 'Gizlilik Politikası' } } }
    expect(deepMergeContent(base, overlay)).toEqual({
      phase6: {
        now: { title: 'Now' },
        privacy: { title: 'Gizlilik Politikası' },
      },
    })
  })

  it('dizileri TAMAMEN değiştirir (eski maddeler geri sızmaz)', () => {
    const base = { phase6: { now: { learning: ['a', 'b', 'c'] } } }
    expect(deepMergeContent(base, { phase6: { now: { learning: ['x'] } } }))
      .toEqual({ phase6: { now: { learning: ['x'] } } })
  })

  it('girdileri değiştirmez', () => {
    const base = { hero: { name: 'A' } }
    const overlay = { hero: { tagline: 'B' } }
    deepMergeContent(base, overlay)
    expect(base).toEqual({ hero: { name: 'A' } })
    expect(overlay).toEqual({ hero: { tagline: 'B' } })
  })

  it('overlay yoksa tabanı aynen verir', () => {
    const base = { a: 1 }
    expect(deepMergeContent(base, undefined)).toBe(base)
  })

  it('null/ilkel overlay tabanı ezer', () => {
    expect(deepMergeContent({ a: { b: 1 } }, null)).toBeNull()
    expect(deepMergeContent({ a: 1 }, 5)).toBe(5)
  })

  it('overlay içindeki `undefined` tabanı silmez', () => {
    expect(deepMergeContent({ a: 1, b: 2 }, { a: undefined })).toEqual({ a: 1, b: 2 })
  })
})
