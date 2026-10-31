/**
 * GÖRSEL DÜZENLEME VERİ MODELİ (2026-10-30).
 *
 * Neden: admin panelindeki alan listeleri yalnızca ÖNCEDEN tanımlı metinleri
 * düzenleyebiliyordu. Boss "her şeyi istisnasız, kodsuz düzenleyebileyim"
 * dedi → sayfadaki herhangi bir öğe seçilip stil/metin/HTML/JS ile
 * değiştirilebiliyor. Değişiklikler `content.design` altında SAKLANIR ve
 * ziyaretçiye CSS olarak uygulanır (DOM'a React dışından dokunulmaz).
 *
 * TASARIM KARARI: kayıt = "seçici + stil + metin". Sunucu bu kayıtları tek bir
 * `<style>` bloğuna derler; runtime yalnızca hedef öğeleri
 * `[data-tar-el="<id>"]` ile işaretler. Böylece hiçbir sayfa bileşeni
 * değişmek zorunda kalmaz ve kayıt sayısı arttıkça render maliyeti sabit kalır.
 *
 * GÜVENLİK: HTML/JS alanları yalnızca ADMIN'in yazabileceği bir uçtan gelir
 * (`/api/admin/design` → `isAdminUser`). Yine de JS, CSP `script-src` nonce
 * politikası gereği üretimde `new Function` ile çalışmayabilir; bu bilinçli
 * bir sınırdır, CSP gevşetilmez.
 */

export type DesignLocaleKey = string

export interface DesignStyle {
  fontFamily?: string
  fontSize?: string
  fontWeight?: string
  lineHeight?: string
  letterSpacing?: string
  textAlign?: string
  textTransform?: string
  color?: string
  background?: string
  opacity?: string
  borderWidth?: string
  borderStyle?: string
  borderColor?: string
  borderRadius?: string
  padding?: string
  margin?: string
  width?: string
  maxWidth?: string
  height?: string
  gap?: string
  boxShadow?: string
  transform?: string
  filter?: string
  zIndex?: string
}

export interface DesignAnimation {
  /** Geçiş/animasyon süresi (ms). */
  durationMs?: number
  /** `ease`, `ease-in-out`, `cubic-bezier(...)`… */
  easing?: string
  delayMs?: number
  /** 1 | 3 | infinite */
  iteration?: string
  /**
   * Dolu ise `@keyframes` gövdesi olarak kullanılır:
   * `from { opacity: 0 } to { opacity: 1 }`
   * Boşsa alanlar CSS `transition` olarak uygulanır.
   */
  keyframes?: string
}

export interface DesignOverride {
  id: string
  /** Kaydedildiği sayfa yolu ('/', '/blog', '/about' …). */
  page: string
  /** Hedef seçici (sayfa içinde benzersiz olacak şekilde üretilir). */
  selector: string
  /** Panelde görünen ad ('BLOG başlığı'). */
  label: string
  /** Panelde gruplama başlığı ('Bölüm: blog' gibi). */
  group?: string
  /** Dile özel metin. `all` anahtarı tüm dillere uygulanır. */
  text?: Record<DesignLocaleKey, string>
  /** Öğenin innerHTML'i (yalnızca verilirse). */
  html?: string
  /** Öğe işaretlendikten sonra çalışan JS gövdesi (yalnızca admin yazar). */
  js?: string
  style?: DesignStyle
  animation?: DesignAnimation
  /** Serbest CSS bloğu — olduğu gibi stil dosyasına eklenir. */
  css?: string
}

const STYLE_PROPS: Record<keyof DesignStyle, string> = {
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  lineHeight: 'line-height',
  letterSpacing: 'letter-spacing',
  textAlign: 'text-align',
  textTransform: 'text-transform',
  color: 'color',
  background: 'background',
  opacity: 'opacity',
  borderWidth: 'border-width',
  borderStyle: 'border-style',
  borderColor: 'border-color',
  borderRadius: 'border-radius',
  padding: 'padding',
  margin: 'margin',
  width: 'width',
  maxWidth: 'max-width',
  height: 'height',
  gap: 'gap',
  boxShadow: 'box-shadow',
  transform: 'transform',
  filter: 'filter',
  zIndex: 'z-index',
}

/** Öğe işaretleyicisi — runtime ve CSS aynı niteliği kullanır. */
export function elAttr(id: string): string {
  return `data-tar-el="${id}"`
}

/** `design.id` → güvenli CSS/anahtar parçası. */
export function safeId(id: string): string {
  return id.replace(/[^\w-]/g, '-')
}

function styleDeclarations(style?: DesignStyle): string {
  if (!style)
    return ''
  const out: string[] = []
  for (const key of Object.keys(STYLE_PROPS) as (keyof DesignStyle)[]) {
    const value = style[key]
    if (value === undefined || value === '')
      continue
    out.push(`${STYLE_PROPS[key]}: ${value}`)
  }
  return out.join('; ')
}

/**
 * Tek bir kaydı CSS'e çevirir.
 *
 * `mode: 'base'` → yalnız temel kurallar (stil/geçiş), `'animation'` →
 * keyframes/animasyon, `'raw'` → serbest CSS. Ayrı üretilmesinin nedeni:
 * animasyon bloğu `@keyframes` içerdiği için kural sırası korunmalı.
 */
export function overrideToCss(
  override: DesignOverride,
  mode: 'base' | 'animation' | 'raw' = 'base',
): string {
  const id = safeId(override.id)
  const selector = `[data-tar-el="${id}"]`

  if (mode === 'raw')
    return override.css?.trim() ?? ''

  if (mode === 'base') {
    const decls = styleDeclarations(override.style)
    if (!decls)
      return ''
    return `${selector} { ${decls} }`
  }

  const anim = override.animation
  if (!anim)
    return ''
  const duration = Math.max(0, anim.durationMs ?? 0)
  const delay = Math.max(0, anim.delayMs ?? 0)
  const easing = anim.easing?.trim() || 'ease'
  const iteration = anim.iteration?.trim() || '1'
  const keyframes = anim.keyframes?.trim()

  if (keyframes) {
    return [
      `@keyframes tar-anim-${id} { ${keyframes} }`,
      `${selector} { animation: tar-anim-${id} ${duration}ms ${easing} ${delay}ms ${iteration} both; }`,
    ].join('\n')
  }

  if (!duration)
    return ''
  // Anahtar kare yoksa "geçiş" olarak uygula (renk/boyut değişimleri için).
  return `${selector} { transition: all ${duration}ms ${easing} ${delay}ms; }`
}

/** Sayfaya ait tüm kayıtları tek stil bloğuna derler. */
export function buildDesignCss(
  overrides: DesignOverride[] | undefined,
  page: string,
): string {
  if (!overrides?.length)
    return ''
  const forPage = overrides.filter(o => o.page === page)
  if (!forPage.length)
    return ''
  const blocks = forPage.flatMap(o => [
    overrideToCss(o, 'base'),
    overrideToCss(o, 'animation'),
    overrideToCss(o, 'raw'),
  ])
  return blocks.filter(Boolean).join('\n')
}

/**
 * Metin çözümü — dile özel kayıt varsa o, yoksa `all`, o da yoksa `undefined`
 * (mevcut metin korunur).
 */
export function resolveOverrideText(
  override: DesignOverride,
  locale: string,
): string | undefined {
  const text = override.text
  if (!text)
    return undefined
  const direct = text[locale]
  if (typeof direct === 'string' && direct.trim())
    return direct
  const all = text.all
  if (typeof all === 'string' && all.trim())
    return all
  return undefined
}

/** Kısa, insan-okur etiket: `<h1>` + ilk 28 karakter. */
export function elementLabel(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  const short = text.length > 28 ? `${text.slice(0, 28)}…` : text
  return short ? `${tag} · ${short}` : tag
}

/**
 * Bir öğe için sayfa içinde kararlı sayılabilecek CSS yolu üretir.
 * `nth-of-type` zinciri kullanılır: kardeş sayısı değişirse seçici kayabilir,
 * bu yüzden panelde seçici elle düzeltilebilir.
 */
export function cssPath(el: Element, root: Element): string {
  const parts: string[] = []
  let current: Element | null = el
  while (current && current !== root && current.parentElement) {
    const tag = current.tagName.toLowerCase()
    const siblings = [...current.parentElement.children].filter(
      s => s.tagName === current!.tagName,
    )
    const index = siblings.indexOf(current) + 1
    parts.unshift(`${tag}:nth-of-type(${index})`)
    current = current.parentElement
  }
  const rootTag = root.tagName.toLowerCase()
  return `${rootTag} > ${parts.join(' > ')}`
}
