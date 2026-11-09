import type { DesignOverride } from '@/lib/design'
import { describe, expect, it } from 'vitest'
import { buildDesignCss, overrideToCss, resolveOverrideText, safeId } from '@/lib/design'
import { designPageSchema } from '@/lib/design-schema'

/**
 * Görsel düzenleme veri modeli (2026-10-30).
 *
 * REGRESYON KİLİDİ: kayıtlar tek bir CSS bloğuna derleniyor ve sayfa filtresi
 * olmadan uygulanırsa `/about` için yazılan bir kural ana sayfayı da bozar.
 * `resolveOverrideText` "Hepsi" (`all`) geri dönüşü olmadan çalışırsa dil
 * değiştiren ziyaretçi eski metni görür.
 */

function override(patch: Partial<DesignOverride> = {}): DesignOverride {
  return {
    id: 'abc-1',
    page: '/',
    selector: 'main h1',
    label: 'h1 · Başlık',
    ...patch,
  }
}

describe('overrideToCss', () => {
  it('stili işaretli seçiciye yazar', () => {
    const css = overrideToCss(override({ style: { color: 'red', fontSize: '2rem' } }))
    expect(css).toBe('[data-tar-el="abc-1"] { font-size: 2rem; color: red }')
  })

  it('boş stil için kural üretmez', () => {
    expect(overrideToCss(override())).toBe('')
  })

  it('keyframes varsa animasyon kuralı üretir', () => {
    const css = overrideToCss(
      override({ animation: { durationMs: 400, keyframes: 'from { opacity: 0 } to { opacity: 1 }' } }),
      'animation',
    )
    expect(css).toContain('@keyframes tar-anim-abc-1')
    expect(css).toContain('animation: tar-anim-abc-1 400ms ease 0ms 1 both')
  })

  it('keyframes yoksa geçiş (transition) yazar, süre 0 ise yazmaz', () => {
    expect(overrideToCss(override({ animation: { durationMs: 200 } }), 'animation'))
      .toBe('[data-tar-el="abc-1"] { transition: all 200ms ease 0ms; }')
    expect(overrideToCss(override({ animation: { durationMs: 0 } }), 'animation')).toBe('')
  })

  it('serbest CSS aynen geçer', () => {
    expect(overrideToCss(override({ css: '  .x { color: blue }  ' }), 'raw')).toBe('.x { color: blue }')
  })
})

describe('buildDesignCss', () => {
  it('yalnızca istenen sayfanın kayıtlarını derler', () => {
    const css = buildDesignCss([
      override({ style: { color: 'red' } }),
      override({ id: 'abc-2', page: '/about', style: { color: 'blue' } }),
    ], '/')
    expect(css).toContain('color: red')
    expect(css).not.toContain('color: blue')
  })

  it('kayıt yoksa boş döner', () => {
    expect(buildDesignCss(undefined, '/')).toBe('')
    expect(buildDesignCss([], '/')).toBe('')
  })
})

describe('resolveOverrideText', () => {
  it('dile özel metin varsa onu verir', () => {
    expect(resolveOverrideText(override({ text: { tr: 'Merhaba', all: 'Hello' } }), 'tr')).toBe('Merhaba')
  })

  it('dile özel metin yoksa "Hepsi" (all) kullanılır', () => {
    expect(resolveOverrideText(override({ text: { all: 'Hello' } }), 'tr')).toBe('Hello')
  })

  it('boşluktan ibaret değer yok sayılır', () => {
    expect(resolveOverrideText(override({ text: { tr: '   ', all: 'Hello' } }), 'tr')).toBe('Hello')
    expect(resolveOverrideText(override({ text: { tr: '   ' } }), 'tr')).toBeUndefined()
    expect(resolveOverrideText(override(), 'tr')).toBeUndefined()
  })
})

describe('safeId', () => {
  it('cSS/anahtar güvenli hale getirir', () => {
    expect(safeId('a b/c.d')).toBe('a-b-c-d')
    expect(safeId('abc-1')).toBe('abc-1')
  })
})

describe('designPageSchema', () => {
  it('geçerli kaydı kabul eder', () => {
    const result = designPageSchema.safeParse({
      page: '/',
      overrides: [{ id: 'a', page: '/', selector: 'h1', label: 'h1', text: { tr: 'Merhaba' } }],
    })
    expect(result.success).toBe(true)
  })

  it('aşırı uzun metni reddeder (güven sınırı)', () => {
    const result = designPageSchema.safeParse({
      page: '/',
      overrides: [{ id: 'a', page: '/', selector: 'h1', label: 'h1', html: 'x'.repeat(20_001) }],
    })
    expect(result.success).toBe(false)
  })

  it('seçicisiz kaydı reddeder', () => {
    const result = designPageSchema.safeParse({
      page: '/',
      overrides: [{ id: 'a', page: '/', selector: '', label: 'h1' }],
    })
    expect(result.success).toBe(false)
  })
})
