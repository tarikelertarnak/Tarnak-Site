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
  it('basma geri bildirimi (press-feedback) tanımlı ve reduced-motion ile korunuyor', () => {
    expect(tokens).toContain('.press-feedback')
    expect(tokens).toContain('transform: scale(0.985)')
    // Geçiş yalnızca hareket tercihi kapalıyken — aksi halde reduced-motion ihlali.
    expect(tokens).toMatch(/prefers-reduced-motion:\s*no-preference[\s\S]*press-feedback/)
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
