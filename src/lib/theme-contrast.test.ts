import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** src/ altindaki tum .ts/.tsx dosyalari (fs.globSync @types/node'da yok). */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory())
      return walk(full)
    return /\.tsx?$/.test(name) ? [full] : []
  })
}

/**
 * Tema kontrast regresyonu.
 *
 * KOK NEDEN (2026-10-04): `@theme inline` icinde `--color-foreground-500`
 * SABIT `#a1a1aa` idi ve temaya bagli degildi. Light temada arka plan
 * `#ffffff` oldugu icin 176 kullanim `text-foreground-500` -> 2.56:1
 * (WCAG AA FAIL, neredeyse okunmaz). Duzeltme: `var(--tfg-600)` —
 * light #3f3f46 (10.44:1), dark #a1a1aa (7.95:1, onceki degerle ayni).
 *
 * NOT: `inline` theme'de deger build sirasinda utility'ye basilir; sonradan
 * `--color-foreground-500` yeniden tanimlamak utility'yi ETKILEMEZ. Bu
 * yuzden duzeltme `@theme inline` blogunun icinde olmak ZORUNDA.
 */

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(h))
    throw new Error(`gecersiz hex: ${hex}`)
  return [0, 2, 4].map(i => Number.parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]
}

function luminance([r, g, b]: [number, number, number]) {
  return [r, g, b]
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(hexToRgb(a)), luminance(hexToRgb(b))].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function themeBlock(selector: 'root' | 'dark') {
  return css.match(new RegExp(`(?:^|\\n)${selector === 'root' ? ':root' : '\\.dark'}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? ''
}

const token = (block: string, name: string) => block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]

/**
 * `--color-foreground-500: <deger>;` satirindeki degeri dondurur.
 * `[^;\s]` ile basliyor: boylece bastaki `\s*` ile govde karakter siniflari
 * ust uste binmiyor (super-linear backtracking lint'i).
 */
const FG500 = /--color-foreground-500:\s*([^;\s][^;]*);/

describe('globals.css tema kontrasti', () => {
  const light = themeBlock('root')
  const dark = themeBlock('dark')

  it('light ve dark token bloklarini bulur', () => {
    expect(token(light, '--tbg')).toBe('#ffffff')
    expect(token(dark, '--tbg')).toBe('#050507')
  })

  it('foreground-500 tema degistirir (sabit deger degil)', () => {
    const decl = css.match(FG500)?.[1]?.trim()
    // Sabit hex degil, temaya bagli olmali
    expect(decl).toMatch(/^var\(--tfg-\d+\)$/)
  })

  // GERCEK mapping'i coz: `--color-foreground-500: var(--tfg-XXX)` -> o temadaki hex.
  // Boylece test, gercekte tarayiciya cikan rengi olcer (token degil).
  const effective = (theme: 'light' | 'dark') => {
    const decl = css.match(FG500)?.[1]?.trim() ?? ''
    const ref = decl.match(/^var\(--([\w-]+)\)$/)?.[1]
    if (!ref)
      return decl // sabit hex -> temadan bagimsiz
    return token(theme === 'light' ? light : dark, `--${ref}`)!
  }

  it.each([
    ['light', '#ffffff'],
    ['dark', '#050507'],
  ] as const)('%s temada foreground-500 WCAG AA gecer (4.5:1)', (theme, bg) => {
    const value = effective(theme)
    const ratio = contrast(value, bg)
    expect(ratio, `${theme}: ${value} on ${bg} = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
  })

  it('primary her iki temada AA gecer', () => {
    expect(contrast(token(light, '--tprimary')!, '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(contrast(token(dark, '--tprimary')!, '#050507')).toBeGreaterThanOrEqual(3)
  })

  // Ayni hata sinifinin agi: light temada beyaz uzerine beyaz = gorunmez.
  // `border-white/N` her kullanimda ya globals override'i ya da `dark:` prefix'i
  // olmali. Bu bir BUG avcisi degil, ag (guard) — sinif temiz tutuluyor.
  //
  // `bg-white/N` ve `bg-white/[0.06]` KAPSAM DIISI: project-card carousel oklari
  // ve dropdown fotografin/karanlik yuzeyin USTUNDE, orada beyaz katman dogru.
  // Yuzey baglami koddan okunamayacagi icin bu siniflar otomatik dogrulanamaz.
  it('tum border-white/N kullanimlari light temada gorunur', () => {
    const missing: string[] = []
    const used = new Set<string>()

    for (const file of walk(join(process.cwd(), 'src'))) {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        for (const m of line.matchAll(/\bborder-white\\?\/\d+/g)) {
          const cls = m[0]
          used.add(cls)
          const inOverride = css.includes(`html[data-theme="light"] .${cls.replace('/', '\\/')}`)
          const darkPrefixed = /\bdark:[^"']*border-white\\?\/\d+/.test(line)
          if (!inOverride && !darkPrefixed) {
            missing.push(`${file.replace(`${process.cwd()}\\`, '')}: ${cls}`)
          }
        }
      }
    }

    expect(used.size, 'border-white sinifi hic kullanilmamis — kontrol guncellenmeli').toBeGreaterThan(0)
    expect(missing, `light temada gorunmez border-white:\n${missing.join('\n')}`).toEqual([])
  })
})
