import { describe, expect, it } from 'vitest'
import {
  detectIconKind,
  extractSvgFromTsx,
  ICON_KIND_LABELS,
  ICON_KINDS,
  jsxAttrsToSvg,
  normalizeIconKind,
  shadcnRegistryFrom,
} from './icon-kind'

/** Toolbox ikon alanına yapıştırılan metnin türü — sıra testleriyle birlikte. */
describe('detectIconKind — yapistirilan metni siniflandirir', () => {
  it.each([
    ['tsx', 'import type { SVGProps } from "react";\n\nexport function CodexHtml(props: SVGProps<SVGSVGElement>) {\n  return (\n    <svg {...props} viewBox="0 0 24 24" />\n  )\n}'],
    ['svg', '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>'],
    ['shadcn', 'npx shadcn@latest add @icons0/codex/html'],
    ['shadcn', 'npx shadcn add @icons0/logos/nextjs-icon'],
    ['url', 'https://www.gstatic.com/images/branding/product/1x/html_48dp.png'],
    ['url', 'data:image/svg+xml;base64,AAAA'],
    ['path', '/uploads/icons/html.svg'],
    ['path', './x.svg'],
    ['path', '../icons/x.svg'],
    ['iconify', 'logos:nextjs-icon'],
    ['iconify', 'mdi:html5'],
    ['iconify', 'simple-icons:react'],
  ])('%s olarak algılanır', (kind, raw) => {
    expect(detectIconKind(raw)).toBe(kind)
  })

  it.each([
    ['boş', ''],
    ['yalnız boşluk', '   \n  '],
    ['düz kelime', 'html'],
    ['sayı', '1234'],
    ['iki kelime', 'hello world'],
  ])('%s -> null', (_, raw) => {
    expect(detectIconKind(raw)).toBeNull()
  })

  it('baştaki/sondaki boşluk algılamayı bozmaz', () => {
    expect(detectIconKind('  logos:nextjs-icon  ')).toBe('iconify')
  })

  it('her türün TR etiketi var', () => {
    for (const kind of ICON_KINDS) {
      expect(ICON_KIND_LABELS[kind]).toMatch(/\S/)
    }
  })
})

describe('detectIconKind + extractSvgFromTsx — gerçek TSX örneği (icons0/codex/html)', () => {
  const code = `import type { SVGProps } from "react";

export function CodexHtml(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M16.695 5a2 2 0 0 1 1.98 2.282l-1.249 8.784a2 2 0 0 1-1.365 1.621l-3.446 1.114a2 2 0 0 1-1.23 0l-3.446-1.114a2 2 0 0 1-1.365-1.621l-1.25-8.784A2 2 0 0 1 7.305 5z"/><path d="M15 8.4H9l.429 3.394h5.142l-.214 1.485l-.214 1.485L12 15.4l-2.143-.636l-.086-.425"/></g></svg>
  );
}

export default CodexHtml;
`

  it('tsx olarak algılanır', () => {
    expect(detectIconKind(code)).toBe('tsx')
  })

  it('temiz SVG kodu döner: stroke-width/stroke-linecap var, JSX artığı yok', () => {
    const svg = extractSvgFromTsx(code)
    expect(svg).not.toBeNull()
    expect(svg!.startsWith('<svg')).toBe(true)
    expect(svg!.endsWith('</svg>')).toBe(true)
    expect(svg).toContain('stroke-width=')
    expect(svg).toContain('stroke-linecap=')
    expect(svg).not.toContain('{')
    expect(svg).not.toContain('strokeWidth')
    expect(svg).not.toContain('className')
    // SVG'nin kendi camelCase niteliği kebab'a çevrilmez.
    expect(svg).toContain('viewBox="0 0 24 24"')
  })

  it('<svg> yoksa null', () => {
    expect(extractSvgFromTsx('export function X() { return null }')).toBeNull()
  })

  it('kapanış etiketi yoksa null', () => {
    expect(extractSvgFromTsx('<svg viewBox="0 0 24 24">')).toBeNull()
  })
})

describe('jsxAttrsToSvg — nitelik dönüşümleri', () => {
  it('yayılım, JSX değerli nitelik ve className temizlenir', () => {
    const svg = jsxAttrsToSvg('<svg {...props} key={item.id} style={{ width: 24 }} className="icon" htmlFor="x"><path strokeWidth="2" strokeLinecap="round" /></svg>')
    expect(svg).toBe('<svg class="icon" for="x"><path stroke-width="2" stroke-linecap="round" /></svg>')
  })

  it('viewBox/preserveAspectRatio korunur, xmlnsXlink iki noktaya döner', () => {
    const svg = jsxAttrsToSvg('<svg xmlnsXlink="http://www.w3.org/1999/xlink" preserveAspectRatio="none" viewBox="0 0 1 1" />')
    expect(svg).toBe('<svg xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="none" viewBox="0 0 1 1" />')
  })
})

describe('shadcnRegistryFrom — komuttan registry adı', () => {
  it('@icons0/ sonrasını döner', () => {
    expect(shadcnRegistryFrom('npx shadcn@latest add @icons0/codex/html')).toBe('codex/html')
    expect(shadcnRegistryFrom('npx shadcn@latest add "@icons0/logos/nextjs-icon"')).toBe('logos/nextjs-icon')
  })

  it('@icons0/ öneki yoksa null', () => {
    expect(shadcnRegistryFrom('npx shadcn@latest add button')).toBeNull()
  })
})

describe('normalizeIconKind — elle seçim kazanır', () => {
  it('manual \'tsx\' düz SVG\'yi de tsx yapar', () => {
    expect(normalizeIconKind('<svg viewBox="0 0 24 24" />', 'tsx')).toBe('tsx')
  })

  it('manual \'auto\'/null/undefined -> algıla', () => {
    expect(normalizeIconKind('logos:nextjs-icon', 'auto')).toBe('iconify')
    expect(normalizeIconKind('logos:nextjs-icon', null)).toBe('iconify')
    expect(normalizeIconKind('logos:nextjs-icon')).toBe('iconify')
  })

  it('algılanamayan metin + auto -> null', () => {
    expect(normalizeIconKind('hello world', 'auto')).toBeNull()
  })
})
