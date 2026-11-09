import sanitizeHtml from 'sanitize-html'

/**
 * SVG temizleyici (2026-10-16, admin ikon alanı — YENİ).
 *
 * Yönetici ikonu üç yoldan yapıştırır: düz `<svg>` kodu, bir TSX
 * bileşeninden çıkarılmış işaretleme ya da bir URL'den indirilmiş dosya
 * içeriği. Sonuç veritabanına yazılır ve PUBLIC sitede
 * `dangerouslySetInnerHTML` ile basılır — yani bu metin XSS kapısıdır
 * (`markdown.ts` aynı sorunu HTML izin listesiyle çözer, burası SVG için).
 *
 * `sanitize-html` saf JavaScript'tir, DOM (`document`/`DOMParser`) veya Node
 * yerleşiği istemez → hem vitest/Node hem tarayıcı önizlemesinde aynı sonucu
 * verir.
 *
 * İki teknik ayrıntı (ikisi de `node_modules/sanitize-html` üzerinde
 * ölçüldü, 2.17.7):
 *  1. htmlparser2 nitelik ADLARINI küçük harfe çevirir (`viewBox` → `viewbox`).
 *     SVG ise büyük/küçük harfe DUYARLIDIR: `viewbox`/`lineargradient` ile
 *     ikon çizilmez. Bu yüzden izin listesi kanonik adlarla yazılır ve
 *     `transformTags` adları kanonik yazıma geri çevirir — hem küçük hem
 *     BÜYÜK harfli girdi (`<SVG VIEWBOX=…>`) aynı sonuca iner.
 *     (README bu sorunu `parser: { lowerCaseTags: false }` ile çözmeyi önerir;
 *     o yol `<SVG>` girdisini tamamen düşürür ve htmlparser2
 *     varsayılanlarını değiştirir — README'nin güvenlik notu bunu önermiyor.)
 *  2. `disallowedTagsMode: 'completelyDiscard'`: izinsiz öğe İÇERİĞİYLE atılır,
 *     aksi hâlde `<script>alert(1)</script>` → geriye düz metin `alert(1)`
 *     kalırdı (kullanıcıya görünen çöp; ayrıca metin yolu açık kalırdı).
 *     İzinsiz öğenin İÇİNDEKİ izinli SVG öğeleri korunur (README kuralı).
 */

/** Yalnız bunlar kalır; her başka öğe içeriğiyle birlikte atılır. */
const ALLOWED_TAGS = [
  'svg',
  'g',
  'defs',
  'symbol',
  'use',
  'title',
  'desc',
  'path',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'ellipse',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'mask',
  'pattern',
  'text',
  'tspan',
]

/**
 * Yalnız bunlar kalır (tüm öğeler için ortak liste). `on*`, `style`, `filter`,
 * `mask` gibi nitelikler ve `data-*` burada YOK → düşer.
 * `href`/`xlink:href` listede ama `safeAttributes` yalnız `#id` hâlini geçirir.
 */
const ALLOWED_ATTRIBUTES = [
  'viewBox',
  'width',
  'height',
  'fill',
  'fill-rule',
  'clip-rule',
  'clip-path',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'stroke-miterlimit',
  'opacity',
  'transform',
  'd',
  'points',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'id',
  'class',
  'preserveAspectRatio',
  'xmlns',
  'role',
  'aria-hidden',
  'focusable',
  'gradientUnits',
  'offset',
  'stop-color',
  'stop-opacity',
  'patternUnits',
  'maskUnits',
  'markerWidth',
  'markerHeight',
  'href',
  'xlink:href',
]

/** Çok kelimeli SVG öğelerinin kanonik yazımı (kalan adlar zaten küçük harf). */
const TAG_CASE: Record<string, string> = {
  lineargradient: 'linearGradient',
  radialgradient: 'radialGradient',
  clippath: 'clipPath',
}

/** Çok kelimeli SVG niteliklerinin kanonik yazımı. */
const ATTRIBUTE_CASE: Record<string, string> = {
  viewbox: 'viewBox',
  preserveaspectratio: 'preserveAspectRatio',
  gradientunits: 'gradientUnits',
  patternunits: 'patternUnits',
  maskunits: 'maskUnits',
  markerwidth: 'markerWidth',
  markerheight: 'markerHeight',
}

/** Girdide `<svg` var mı (büyük/küçük harf duyarsız) — erken çıkış kapısı. */
const HAS_SVG_TAG = /<svg/i

/**
 * Temizlik sonrası ÇİZİLEBİLİR SVG var mı: `<svg …>` gövdesinde en az bir alt
 * öğe bulunmalı. `<svg></svg>` veya yalnız metin taşıyan `<svg>merhaba</svg>`
 * boş ikondur; kaydetmeye değmez. `</svg` bu desene uymaz (`<` sonrası `/`).
 */
const SVG_WITH_CHILD_ELEMENT = /<svg[^>]*>\s*<[a-z]/i

function safeAttributes(attribs: sanitizeHtml.Attributes): sanitizeHtml.Attributes {
  const out: sanitizeHtml.Attributes = {}
  for (const [rawName, rawValue] of Object.entries(attribs)) {
    const name = ATTRIBUTE_CASE[rawName.toLowerCase()] ?? rawName
    // Değer her zaman dize olmalı; eksik değer (`<path d>`) çökmemeli.
    const value = rawValue ?? ''
    // `href`/`xlink:href` yalnız aynı belgedeki `#id`e işaret edebilir:
    // dış adres (`https://evil…`, `//evil…`, `x.svg#id`) ve `javascript:` düşer.
    if (name === 'href' || name === 'xlink:href') {
      if (value.startsWith('#'))
        out[name] = value
      continue
    }
    const lower = value.toLowerCase()
    if (lower.includes('javascript:') || lower.includes('data:text/html'))
      continue
    out[name] = value
  }
  return out
}

/**
 * TEK nitelik politikası: adı kanonik yazıma çevir + `href` kuralını uygula.
 * `on*`/`style`/bilinmeyen nitelikler zaten `allowedAttributes` ile düşer.
 */
function canonicalizeTag(tagName: string, attribs: sanitizeHtml.Attributes): sanitizeHtml.Tag {
  return {
    tagName: TAG_CASE[tagName.toLowerCase()] ?? tagName,
    attribs: safeAttributes(attribs),
  }
}

const SVG_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: { '*': ALLOWED_ATTRIBUTES },
  // Şema yok: dış kaynak yasak. `href` zaten `#id` olmak zorunda — bu ikinci kat.
  allowedSchemes: [],
  allowProtocolRelative: false,
  disallowedTagsMode: 'completelyDiscard',
  transformTags: { '*': canonicalizeTag },
}

/** SVG işaretlemesini güvenli hale getirir. Girdide `<svg` yoksa `''` döner. */
export function sanitizeSvg(markup: string): string {
  if (!HAS_SVG_TAG.test(markup))
    return ''
  const clean = sanitizeHtml(markup, SVG_OPTIONS)
  if (!SVG_WITH_CHILD_ELEMENT.test(clean))
    return ''
  // NUL baytı: indirilmiş dosyadan gelebilir ve Postgres `text` sütunu onu
  // reddeder (INSERT hatası). İstemcide gerçekleşen kayıt bu yüzden patlamasın.
  return clean.replaceAll('\u0000', '')
}

/** Metin/URL bir SVG gibi görünüyor mu? (kaydetme öncesi kontrol) */
export function looksLikeSvg(markup: string): boolean {
  return HAS_SVG_TAG.test(markup) || /\.svg(?:[?#]|$)/i.test(markup.trim())
}
