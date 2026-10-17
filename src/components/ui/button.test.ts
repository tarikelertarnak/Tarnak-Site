import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { primarySolidClass } from '@/components/ui/button'

/**
 * Buton dilinin TEK kural olduğunu kanıtlayan testler (2026-10-17).
 *
 * CANLI ÖLÇÜM (CDP, koyu tema, `localhost:3000`): LobeButton tabanlı primary
 * butonlar `border-width: 0px` + `border-radius: 0px` iken hero/split butonları
 * `border-width: 1px` (beyaz) + `border-radius: 8px` çiziyordu → aynı sayfada
 * iki farklı buton dili. Kullanıcı hero dilinin referans olmasını istedi.
 *
 * Ayrıca: hover/active GEOMETRİYİ değiştirmemeli (kayma şikâyeti). Aynı ölçümde
 * hiçbir `:hover`/`:active` kuralı geometri özelliği (transform/width/height/
 * padding/border-width/font-size) taşımıyordu; bu test o kuralı kaynakta kilitler.
 */

const GEO_METRIGE = /(hover|active):(?:.*:)?(translate|scale|rotate|h-|w-|py-|px-|p-|m-|text-\[|border-2|border-4)/

describe('primarySolidClass — tek buton dili', () => {
  it('mavi zemin + zıt renk kenarlık taşır (hero referansı)', () => {
    const cls = primarySolidClass()
    expect(cls).toContain('!bg-primary')
    expect(cls).toContain('!text-primary-fg')
    expect(cls).toContain('!border')
    expect(cls).toContain('!border-primary-fg')
  })

  it('köşe yuvarlaklığı hero/split butonlarla aynı (`!rounded-md`)', () => {
    expect(primarySolidClass()).toContain('!rounded-md')
  })

  it('ikon-only butonlarda daire şekli korunur (radius zorlanmaz)', () => {
    expect(primarySolidClass(true)).not.toContain('!rounded-md')
    // Diğer kurallar aynen kalır.
    expect(primarySolidClass(true)).toContain('!border-primary-fg')
    expect(primarySolidClass(true)).toContain('!bg-primary')
  })

  it('hover/active yalnızca RENK değiştirir, geometriye dokunmaz', () => {
    const cls = primarySolidClass()
    expect(cls).toContain('hover:!bg-primary/90')
    expect(cls).not.toMatch(GEO_METRIGE)
    expect(cls).not.toContain('hover:!border')
    expect(cls).not.toContain('active:')
  })
})

describe('buton benzeri öğelerde kayma yok (yapısal regresyon)', () => {
  const KOK = process.cwd()

  it('`window`/buton stillerinde geometri değiştiren hover utility kalmaz', () => {
    const kaynaklar = [
      'src/components/ui/button.tsx',
      'src/components/ui/hero-button-style.ts',
      'src/components/ui/split-button.tsx',
      'src/components/ui/load-more-button.tsx',
      'src/components/ui/input.tsx',
      'src/components/ui/textarea.tsx',
    ]
    for (const rel of kaynaklar) {
      const src = readFileSync(join(KOK, rel), 'utf-8')
      // Sınıf dizesi olarak geometri değiştiren hover/active utility yasak.
      const bulunan = src.match(new RegExp(GEO_METRIGE.source, 'g')) ?? []
      expect(bulunan, `${rel} içinde kayma yapan sınıf var`).toEqual([])
    }
  })

  it('`Button` yükseklik ve radius kuralı CSS jetonundan türetilir', () => {
    const button = readFileSync(join(KOK, 'src/components/ui/button.tsx'), 'utf-8')
    // Yükseklik `!h-10` (40px) — çağıran `h-9` yazsa bile kazanır.
    expect(button).toContain('isIconOnly ? \'!h-10 !w-10\' : \'!h-10\'')
    // Radius `--radius-md` (8px) jetonundan gelir; elle px yazılmaz.
    expect(button).not.toMatch(/rounded-\[\d+px\]/)
  })
})
