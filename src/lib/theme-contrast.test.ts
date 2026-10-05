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

/**
 * Tema bloklarını çıkarır.
 *
 * 2026-10-05: seçici `html[data-theme='light']` / `html[data-theme='dark']`
 * OLDU. Sebep: `@theme inline` derlemede kendi `:root { --tsurface-2: ... }`
 * çıktısını üretir ve bu çıktı dosyadaki bloklardan SONRA gelir. `:root`
 * yazınca derleyicinin değeri kazanır, koyu tema değişkenleri HİÇ
 * uygulanmıyordu — canlıda `html.class="dark"` ve siyah body vardı ama
 * `--tsurface-2` light değerinde kalıyor, kart koyu temada beyaz görünüyordu.
 * `html[data-theme=...]` özgüllüğü (0,1,1) > `:root` (0,1,0) olduğu için
 * tema değerleri kazanır.
 *
 * `data-theme`'i `ThemeInitScript` her yüklemede yazıyor — test de aynı
 * yolu ölçüyor.
 */
function themeBlock(selector: 'light' | 'dark') {
  return css.match(new RegExp(`html\\[data-theme=['"]${selector}['"]\\]\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? ''
}

const token = (block: string, name: string) => block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]

/**
 * `--color-foreground-500: <deger>;` satirindeki degeri dondurur.
 * `[^;\s]` ile basliyor: boylece bastaki `\s*` ile govde karakter siniflari
 * ust uste binmiyor (super-linear backtracking lint'i).
 */
const FG500 = /--color-foreground-500:\s*([^;\s][^;]*);/

/**
 * `--color-background: var(--tbg)` seklinde bir esleme. Grubu (ornegin
 * `--tfg-200`) dondurur; `--tbg`'ye baglanirsa kart yuzeyi sayfa zemininin
 * aynisi olur ve light temada gruplama kaybolur.
 */
const BG_ALIAS = /--color-background:\s*var\((--[a-z0-9-]+)\)/

describe('globals.css tema kontrasti', () => {
  const light = themeBlock('light')
  const dark = themeBlock('dark')

  it('light ve dark token bloklarini bulur', () => {
    expect(token(light, '--tbg')).toBe('#ffffff')
    expect(token(dark, '--tbg')).toBe('#0a0a0c')
  })

  /**
   * `--color-background` = İÇ KART (`--tsurface-2`). Kartin ayrışması gereken
   * yer sayfa zemini DEĞİL, üstündeki dış gruptur — açık temada kart ve sayfa
   * ikisi de beyaz (birebir 1.00) olduğu için bu eski test artık geçersiz.
   * Gerçek kural: kart HER iki temada da dış gruptan ayrışmalı.
   * Hiyerarşi testinin ayrıntılı kontrolü bir aşağıdaki testte.
   */
  it('kart yuzeyi sayfa zeminiYLE ayni olabilir ama gruptan ayrilir', () => {
    const alias = BG_ALIAS.exec(css)?.[1]
    expect(alias, '--color-background bir var() ile eslenmeli').toBeTruthy()

    for (const [name, block] of [['light', light], ['dark', dark]] as const) {
      const card = token(block, alias!)!
      const group = token(block, '--tsurface-1')!
      expect(card, `${name}: ${alias} tanimli degil`).toBeTruthy()
      expect(group, `${name}: --tsurface-1 tanimli degil`).toBeTruthy()
      expect(contrast(card, group), `${name}: kart dis gruba yapisti`)
        .toBeGreaterThan(1.05)
    }
  })

  /**
   * KOK NEDEN (2026-10-05): dis grup ile ic kart ayni renkti — canli
   * olcumde konteyner `rgb(231,232,235)`, kart da `rgb(231,232,235)`.
   * Ikisi de `--tsurface` idi (kart `bg-background`, kutu da ayni token).
   *
   * DUZELTME: uc katman ayri tokenlara bolundu.
   *   --tsurface-0 sayfa, --tsurface-1 dis grup, --tsurface-2 ic kart.
   * Koyu temada 1 en koyu, 2 belirgin acik. Aydinlık temada TERS yon:
   * 1 sayfadan koyu, 2 tekrar acik. Her iki temada da ardışık katmanlar
   * arası kontrast >1.05 olmali, yoksa ayrim kaybolur.
   */
  it('yuzey hiyerarsisi: dis grup ve ic kart ayirt edilebilir', () => {
    for (const [name, block] of [['light', light], ['dark', dark]] as const) {
      const s0 = token(block, '--tsurface-0')!
      const s1 = token(block, '--tsurface-1')!
      const s2 = token(block, '--tsurface-2')!
      const s3 = token(block, '--tsurface-3')!

      expect(s0, `${name}: --tsurface-0 tanimli degil`).toBeTruthy()
      expect(s1, `${name}: --tsurface-1 tanimli degil`).toBeTruthy()
      expect(s2, `${name}: --tsurface-2 tanimli degil`).toBeTruthy()
      expect(s3, `${name}: --tsurface-3 tanimli degil`).toBeTruthy()

      // Sayfa < dis grup < kart (light) ve sayfa > dis grup, kart > dis
      // grup (dark) — yon temaya gore degisir, MUTLAKA ayrim olmali.
      expect(contrast(s1!, s0!), `${name}: dis grup sayfaya yapisti (s1-s0)`)
        .toBeGreaterThan(1.05)
      expect(contrast(s2!, s1!), `${name}: kart dis gruba yapisti (s2-s1)`)
        .toBeGreaterThan(1.05)
      // Kart ici eleman da kart uzerinde ayirt edilmeli.
      expect(contrast(s3!, s2!), `${name}: kart ici eleman karta yapisti (s3-s2)`)
        .toBeGreaterThan(1.05)
    }
  })

  /**
   * Kart kenarligi: hover'siz halde de kartin cizgisi gorunmeli. Aksi halde
   * ayni renkteki iki yuzey yalnizca hover'da ayrisiyordu.
   */
  it('kart kenarligi her iki temada tanimli ve saydam degil', () => {
    for (const [name, block] of [['light', light], ['dark', dark]] as const) {
      const decl = block.match(/--tsurface-border:\s*([^;]+);/)?.[1]?.trim()
      expect(decl, `${name}: --tsurface-border tanimli degil`).toBeTruthy()
      expect(decl, `${name}: kenarlik saydam olmamali`).toMatch(/^rgba?\(\s*0\s*,\s*0\s*,\s*0|^rgba?\(\s*255/)
    }
  })

  it('bg-background artik kart (surface-2) yuzeyini okuyor', () => {
    // Geriye donuk uyum: `--tsurface` dis gruba esitlenmis olmali.
    const alias = BG_ALIAS.exec(css)?.[1]
    expect(alias).toBe('--tsurface-2')
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

  it('primary zemin rengi her iki temada okunur', () => {
    // Birincil RENKİN sayfa zeminine karşı görünürlüğü (buton üstündeki
    // yazı kontrastı aşağıdaki `--tprimary-fg` testinde ayrıca ölçülüyor).
    expect(contrast(token(light, '--tprimary')!, '#ffffff')).toBeGreaterThanOrEqual(3)
    expect(contrast(token(dark, '--tprimary')!, '#050507')).toBeGreaterThanOrEqual(3)
  })

  /**
   * KOK NEDEN (2026-10-05): kullanici primary butonlarin yazi ve ikonlarinin
   * SİYAH olmasini istedi. `--tprimary-fg` her iki temada da `#ffffff` idi ve
   * bilesenlerde sert `text-white` vardi; yani degistirilmedigi surece
   * ayar etkisiz kalirdi.
   *
   * Kural: primary buton YAZISI = `--tprimary-fg`, ve o zemin olan
   * `--tprimary` uzerinde AA (4.5:1) gecmeli.
   *
   * FIZIKSEL CAKISMA (bilinçli seçim): `--tprimary` `#2563eb` üzerinde SİYAH
   * yazi sadece 4.06:1 veriyor — AA düşüyor. Zemin koyulaştırılırsa siyah
   * daha da kötüleşiyor (`#1d4ed8` → 3.13:1) çünkü siyah ile zemin aynı
   * tarafa gidiyor. Tek çıkış zeminin parlak tona çekilmesi:
   * light `#3b82f6` + siyah = 5.71:1.
   * Koyu temada kontrast yönü ters dönüyor: `#2563eb` + beyaz = 5.17:1.
   */
  it.each([
    ['light', '#3b82f6', '#000000'],
    ['dark', '#2563eb', '#ffffff'],
  ] as const)('%s temada primary buton yazisi zemininde AA gecer', (theme, bg, fg) => {
    const primaryBg = token(theme === 'light' ? light : dark, '--tprimary')
    const primaryFg = token(theme === 'light' ? light : dark, '--tprimary-fg')

    expect(primaryBg, `${theme}: --tprimary tanimli degil`).toBe(bg)
    expect(primaryFg, `${theme}: --tprimary-fg ${fg} olmali`).toBe(fg)

    const ratio = contrast(primaryFg!, primaryBg!)
    expect(ratio, `${theme}: primary yazisi ${primaryFg} on ${primaryBg} = ${ratio.toFixed(2)}:1`)
      .toBeGreaterThanOrEqual(4.5)
  })

  /**
   * Sert `text-white` primary butonun uzerinde kalirsa token degisimi
   * HICBIR SEYE ETKI ETMEZ — CSS specificity'de utility sinifi utility'yi
* KAPSAM DISI (bilinçli): `bg-primary/15` gibi saydam tonlar zemin degil —
   * bir panelin USTUNDE, orada beyaz yazi dogru. `bg-danger`,
   * `bg-white/10`, `dark:text-white` tamamen farkli tokenlar. Bu test
   * dosyanin kendisi de yorumlarinda kelimeyi geciyor, atlanir.
   */
  it('bg-primary tasiyan butonlarda sert text-white kalmaz', () => {
    const offenders: string[] = []

    for (const file of walk(join(process.cwd(), 'src'))) {
      if (file.endsWith('theme-contrast.test.ts'))
        continue
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        // Yalnizca TAM `bg-primary` — saydam ton degil.
        if (!/\bbg-primary(?![\w/-])/.test(line))
          continue
        if (/text-primary-fg/.test(line))
          continue
        if (/\btext-white\b/.test(line))
          offenders.push(`${file.replace(`${process.cwd()}\\`, '')}: ${line.trim().slice(0, 90)}`)
      }
    }

    expect(offenders, `primary zeminde sert text-white:\n${offenders.join('\n')}`).toEqual([])
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
