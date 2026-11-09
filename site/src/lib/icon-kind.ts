/**
 * İkon metni sınıflandırma — Toolbox ikon alanına YAPIŞTIRILAN metnin türü.
 *
 * Saf ve izomorfik: DOM, node built-in, React yok. Sunucu (API) ve istemci
 * (panel rozeti) aynı kararı görsün diye kural TEK yerde durur.
 *
 * Sıra ÖNEMLİ: `tsx` `svg`den önce gelir (her TSX bir `<svg` içerir), `shadcn`
 * url/path'ten önce gelir.
 */

export type IconKind = 'svg' | 'tsx' | 'shadcn' | 'url' | 'path' | 'iconify'

export const ICON_KINDS: readonly IconKind[] = ['svg', 'tsx', 'shadcn', 'url', 'path', 'iconify']

/** TR etiketleri (UI rozetleri icin) */
export const ICON_KIND_LABELS: Record<IconKind, string> = {
  svg: 'SVG kodu',
  tsx: 'React/TSX bileşeni',
  shadcn: 'shadcn komutu',
  url: 'Görsel URL',
  path: 'Yerel yol',
  iconify: 'Iconify adı',
}

/** Yapistirilan metni siniflandirir. Bos/algilanamaz -> null. */
export function detectIconKind(raw: string): IconKind | null {
  const text = raw.trim()
  if (!text)
    return null
  // TSX: `<svg` + JSX'e özgü bağlam (import/export/return). Düz SVG kodunda
  // bunların hiçbiri olmaz.
  if (text.includes('<svg') && /(?:^|\s)(?:export\s+(?:default\s+)?function|import\s|return\s*\()/.test(text)) {
    return 'tsx'
  }
  if (text.includes('<svg'))
    return 'svg'
  if (/(?:^|\s)npx\s+shadcn(?:@\S+)?\s/i.test(text) || text.includes('@icons0/'))
    return 'shadcn'
  if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image/'))
    return 'url'
  if (text.startsWith('/') || text.startsWith('./') || text.startsWith('../'))
    return 'path'
  if (/^[a-z0-9][a-z0-9-]*:[a-z0-9-]+$/i.test(text))
    return 'iconify'
  return null
}

/** Elle secim: manual 'auto'|null|undefined -> detectIconKind(raw), aksi halde manual. */
export function normalizeIconKind(raw: string, manual?: IconKind | 'auto' | null): IconKind | null {
  return manual && manual !== 'auto' ? manual : detectIconKind(raw)
}

/** JSX/TSX kodundan ilk <svg ...>...</svg> blogunu cikarir; yoksa null. */
export function extractSvgFromTsx(code: string): string | null {
  // `<svg` sonrası boşluk/`>`/`/` şart: yoksa `SVGProps<SVGSVGElement>` tip
  // anotasyonundaki `<SVG...` yanlış eşleşir (gerçek icons0 TSX'inde var).
  const start = code.search(/<svg[\s/>]/i)
  if (start === -1)
    return null
  const end = code.toLowerCase().indexOf('</svg>', start)
  if (end === -1)
    return null
  return jsxAttrsToSvg(code.slice(start, end + '</svg>'.length))
}

/** JSX niteliklerini SVG'ye cevirir (strokeWidth->stroke-width ...). */
export function jsxAttrsToSvg(svg: string): string {
  // (a) yayılım: {...props}  (b) JSX değerli nitelik: attr={...} (tek seviye iç içe)
  const flat = svg
    .replace(/\s*\{\.\.\.[^{}]*\}/g, '')
    .replace(/\s+[A-Z_:][\w:.-]*=\{(?:[^{}]|\{[^{}]*\})*\}/gi, '')
  // (c)(d)(e) yalnız ETİKETLERİN İÇİNDE: nitelik değerleri (path `d`, url)
  // kazara dönüşmesin.
  return flat.replace(/<[^>]*>/g, (tag) => {
    return tag
      .replace(/\bclassName=/g, 'class=')
      .replace(/\bhtmlFor=/g, 'for=')
      .replace(/(\s)([a-z][A-Za-z0-9]*)=/g, (_, ws: string, name: string) => `${ws}${svgAttrName(name)}=`)
      .replace(/\s{2,}/g, ' ')
  })
}

/** `npx shadcn@latest add @icons0/codex/html` -> 'codex/html'; yoksa null. */
export function shadcnRegistryFrom(command: string): string | null {
  const m = /@icons0\/([^\s"']+)/.exec(command)
  return m ? m[1] : null
}

/** camelCase -> kebab-case; SVG'nin kendi camelCase nitelikleri KORUNUR. */
function svgAttrName(name: string): string {
  if (name === 'viewBox' || name === 'preserveAspectRatio')
    return name
  if (name === 'xmlnsXlink')
    return 'xmlns:xlink'
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}
