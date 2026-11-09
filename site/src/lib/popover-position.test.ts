/**
 * computePopoverPosition SAF FONKSIYON testi — tarayici olcumu yerine.
 * JSDOM'da getBoundingClientRect calismadigi icin dogrudan girdiler verilir.
 */
import { describe, expect, it } from 'vitest'
import { computePopoverPosition, rectsOverlap } from '@/lib/popover-position'

const VP = { width: 718, height: 700 }
const PANEL = { width: 256, height: 415 }
const GAP = 6
const PAD = 8

/** Panelin gercekten tetikleyiciden ayri oldugunu ve ekranda oldugunu dogrular. */
function dogrula(
  trigger: { top: number, bottom: number, left: number, right: number },
  p: ReturnType<typeof computePopoverPosition>,
) {
  const panel = {
    top: p.top,
    bottom: p.top + p.maxHeight,
    left: p.left,
    right: p.left + p.maxWidth,
  }
  // 1) butonla kesismiyor
  expect(rectsOverlap(trigger, panel)).toBe(false)
  // 2) ekranin icinde (en fazla 1px tolerans)
  expect(panel.top).toBeGreaterThanOrEqual(-1)
  expect(panel.left).toBeGreaterThanOrEqual(-1)
  expect(panel.bottom).toBeLessThanOrEqual(VP.height + 1)
  expect(panel.right).toBeLessThanOrEqual(VP.width + 1)
  // 3) aralarinda en az 1px var.
  //    Dikey yerlesimde (alt/üst) DİKEY boşluk, yanal yerlesimde (sağ/sol)
  //    YAN boşluk ölçülür — panel yanda açıldığında dikeyde örtüşebilir,
  //    bu normal ve kabul edilen davranış.
  const dikey = p.placement === 'bottom' || p.placement === 'top'
  const aralik = dikey
    ? (panel.top >= trigger.bottom ? panel.top - trigger.bottom : trigger.top - panel.bottom)
    : (panel.left >= trigger.right ? panel.left - trigger.right : trigger.left - panel.right)
  expect(aralik).toBeGreaterThan(0)
}

describe('computePopoverPosition', () => {
  it('altta yer varsa ALTINA, 6px boslukla acilir', () => {
    const t = { top: 100, bottom: 140, left: 200, right: 360 }
    const p = computePopoverPosition(t, PANEL, VP, { gap: GAP, padding: PAD })
    expect(p.placement).toBe('bottom')
    expect(p.top).toBe(t.bottom + GAP)
    expect(rectsOverlap(t, { top: p.top, bottom: p.top + p.maxHeight, left: p.left, right: p.left + p.maxWidth })).toBe(false)
    dogrula(t, p)
  })

  it('alta sigmazsa USTUNE gecer (ustte de yer varsa)', () => {
    // buton ekranin alt kenarina yakin: altta 100px, ustte 300px kaldi
    const t = { top: 590, bottom: 630, left: 200, right: 360 }
    const p = computePopoverPosition(t, PANEL, VP, { gap: GAP, padding: PAD })
    expect(p.placement).toBe('top')
    expect(p.top).toBe(t.top - GAP - PANEL.height)
    dogrula(t, p)
  })

  it('alta ve uste sigmazsa SAGA duser (kullanici oncelik sirasi: alt → üst → sağ → sol)', () => {
    // viewport ortasinda tetikleyici: ust 326px, alt 306px; panel 415px → ikisi de sigmaz
    // ama saga 344px var ve panel 256px genis → 'right'
    const t = { top: 340, bottom: 380, left: 200, right: 360 }
    const p = computePopoverPosition(t, PANEL, VP, { gap: GAP, padding: PAD })
    expect(p.placement).toBe('right')
    expect(p.left).toBe(t.right + GAP)
    dogrula(t, p)
  })

  it('hicbir yon sigmazsa (sag da sol da dar) kirpma devreye girer', () => {
    // 320px genislik: tetikleyici ortada → sag 146px, sol 146px < 256px panel
    const dar = { width: 320, height: 700 }
    const t = { top: 340, bottom: 380, left: 60, right: 160 }
    const p = computePopoverPosition(t, PANEL, dar, { gap: GAP, padding: PAD })
    expect(['bottom', 'top']).toContain(p.placement)
    // kirpma olmali (panel 415 > kalan yer)
    const kalan = p.placement === 'bottom'
      ? dar.height - t.bottom - GAP - PAD
      : t.top - GAP - PAD
    expect(p.maxHeight).toBeLessThanOrEqual(kalan)
    const panel = { top: p.top, bottom: p.top + p.maxHeight, left: p.left, right: p.left + p.maxWidth }
    expect(rectsOverlap(t, panel)).toBe(false)
    expect(panel.bottom).toBeLessThanOrEqual(dar.height + 1)
  })

  it('cok genis panelde sigmayan yonu kirpar', () => {
    const genis = { width: 600, height: 200 }
    const t = { top: 100, bottom: 140, left: 60, right: 160 }
    const p = computePopoverPosition(t, genis, VP, { gap: GAP, padding: PAD })
    expect(p.placement).toBe('bottom')
    expect(p.maxWidth).toBeLessThanOrEqual(VP.width - PAD * 2)
    dogrula(t, p)
  })

  it('panelin sol kenarini ekrandan tasirmaz', () => {
    const t = { top: 100, bottom: 140, left: 690, right: 710 }
    const p = computePopoverPosition(t, PANEL, VP, { gap: GAP, padding: PAD })
    expect(p.left + p.maxWidth).toBeLessThanOrEqual(VP.width)
    dogrula(t, p)
  })

  it('cok kucuk viewportta da kirpma + kesismeme korunur', () => {
    const kucuk = { width: 320, height: 300 }
    const t = { top: 140, bottom: 180, left: 10, right: 110 }
    const p = computePopoverPosition(t, { width: 256, height: 415 }, kucuk, { gap: GAP, padding: PAD })
    const panel = { top: p.top, bottom: p.top + p.maxHeight, left: p.left, right: p.left + p.maxWidth }
    expect(rectsOverlap(t, panel)).toBe(false)
    expect(panel.bottom).toBeLessThanOrEqual(kucuk.height + 1)
    expect(panel.right).toBeLessThanOrEqual(kucuk.width + 1)
  })

  it('hICBIR konumda butonla kesismez — 200 rastgele konum denenir', () => {
    const rastgele = (n: number) => {
      // deterministik sozde-rastgele
      const x = Math.sin(n * 12.9898) * 43758.5453
      return x - Math.floor(x)
    }
    for (let i = 0; i < 200; i++) {
      const w = 60 + rastgele(i) * 300
      const h = 40
      const t = {
        top: rastgele(i + 1) * (VP.height - h),
        left: rastgele(i + 2) * (VP.width - w),
        bottom: 0,
        right: 0,
      }
      t.bottom = t.top + h
      t.right = t.left + w

      const p = computePopoverPosition(t, { width: 256, height: 415 }, VP, { gap: GAP, padding: PAD })
      const panel = { top: p.top, bottom: p.top + p.maxHeight, left: p.left, right: p.left + p.maxWidth }
      expect(rectsOverlap(t, panel), `konum ${i}: panel tetikleyiciyle kesisti`).toBe(false)
      expect(panel.top, `konum ${i}: ust tasta`).toBeGreaterThanOrEqual(-1)
      expect(panel.left, `konum ${i}: sol tasta`).toBeGreaterThanOrEqual(-1)
    }
  })
})
