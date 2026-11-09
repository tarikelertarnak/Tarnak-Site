import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Admin sekme şeridi yerleşim sözleşmesi (2026-10-13).
 *
 * Kullanıcı: "Oklar sayfanın ortasında duruyor, Tablolar kartlarının üstüne
 * biniyor" + "alttaki 4 daireyi kaldır".
 *
 * Kök neden: `children` (Lobehub `Tabs`) hem sekme şeridini hem panelleri
 * kapsıyor; oklar `absolute top-1/2` ile TÜM yükseklik üzerinden konumlanıp
 * panel alanının ortasına düşüyordu. Çözüm: oklar flex kardeş ve yükseklikleri
 * şeritten ölçülür. Bölüm noktaları (`TabScrollDots`) tamamen silindi.
 */
const SRC = readFileSync(
  join(process.cwd(), 'src/components/admin/scrollable-tabs.tsx'),
  'utf8',
)
const HOOK = readFileSync(
  join(process.cwd(), 'src/hooks/use-scroll-state.ts'),
  'utf8',
)
const CSS = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('scrollable-tabs sözleşmesi', () => {
  it('oklar mutlak konumlandırılmaz (eski `top-1/2` hatası geri gelmesin)', () => {
    // Sınıf listesinde YOK (yorumda anılması serbest).
    expect(SRC).not.toMatch(/className=[^>]{0,240}top-1\/2/)
    expect(SRC).not.toContain('-translate-y-1/2')
  })

  it('oklar şeridin kendi yüksekliğine hizalanır', () => {
    expect(SRC).toContain('state.stripHeight')
    expect(SRC).toContain('items-start')
    expect(HOOK).toContain('clientHeight')
  })

  it('bölüm noktaları (TabScrollDots) tamamen kaldırıldı', () => {
    expect(SRC).not.toContain('TabScrollDots')
    expect(SRC).not.toContain('pageCount')
    expect(HOOK).not.toContain('pageCount')
    expect(HOOK).not.toContain('activeTabPage')
  })

  it('şeritte yatay kaydırma çubuğu gizlenir', () => {
    expect(SRC).toContain('admin-tabs-strip')
    expect(CSS).toMatch(/\.admin-tabs-strip \[role=['"]tablist['"]\]/)
    expect(CSS).toContain('scrollbar-width: none')
  })

  it('ok 200 px kaydırır ve yumuşak kayar (tek kaynak: hook)', () => {
    expect(HOOK).toContain('ARROW_STEP = 200')
    expect(HOOK).toContain('behavior: \'smooth\'')
    expect(SRC).toContain('state.scrollBy(-1)')
    expect(SRC).toContain('state.scrollBy(1)')
  })

  it('oklar kenarda pasifleşir', () => {
    expect(SRC).toContain('disabled={!state.canScrollLeft}')
    expect(SRC).toContain('disabled={!state.canScrollRight}')
  })

  it('aktif sekme ortalanır (scrollIntoView YOK — ataları kaydırmasın)', () => {
    expect(HOOK).toContain('centerScrollLeft')
    expect(SRC).toMatch(/state\.scrollToTab\(/)
    expect(SRC).not.toMatch(/\.scrollIntoView\(/)
  })
})
