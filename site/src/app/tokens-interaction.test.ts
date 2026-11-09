import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Etkileşim/animation sözleşmesi (2026-10-21).
 *
 * Kullanıcı isteği: "UI/UX/GUI animasyon her açıdan iyileştir". Bu turda
 * eklenen davranışlar kaynak düzeyinde kilitlenir — biri sessizce silinirse
 * test kırmızıya döner (regresyon kontrolü).
 */

const tokens = readFileSync(join(process.cwd(), 'src/app/tokens.css'), 'utf8')
const globals = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('etkileşim jetonları (tokens.css)', () => {
  it('basma efektinde GEOMETRİ değişimi YOK (2026-10-31 kullanıcı isteği)', () => {
    // Kullanıcı: "buton gibi basıldığında küçülüyor — bu küçülüp büyümeyi her
    // yerden kaldır". `press-feedback` (scale 0.985) tamamen kaldırıldı;
    // geri eklerse bu test kırmızıya döner.
    expect(tokens).not.toContain('press-feedback')
    expect(tokens).not.toContain('transform: scale(0.985)')
    // Basma geri bildirimi olarak `:active` altında geometri kuralı olmamalı.
    expect(tokens).not.toMatch(/:active\s*\{[^}]*transform/)
  })

  it('dokunmatik gecikme (300ms tap delay) kaldırılmış', () => {
    expect(tokens).toContain('touch-action: manipulation')
  })

  it('bağlantı alt-çizgisi geçişi buton görünümlü linkleri dışlar', () => {
    expect(tokens).toContain('text-decoration-color')
    // Buton sınıflı linkler kapsam dışı olmalı, yoksa alt-çizgi butonlara sızar.
    expect(tokens).toContain('a:not([class*=\'bg-\'])')
  })

  it('devre dışı bırakma (reduce-motion) kuralı TÜM animasyonları keser', () => {
    expect(globals).toMatch(/data-reduce-motion='true'[\s\S]*animation: none !important/)
    expect(globals).toMatch(/prefers-reduced-motion: reduce[\s\S]*transition-duration: 0\.01ms !important/)
  })
})
