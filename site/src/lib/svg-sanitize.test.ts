import { describe, expect, it } from 'vitest'
import { looksLikeSvg, sanitizeSvg } from './svg-sanitize'

/**
 * SVG temizleyici testleri (2026-10-16, admin ikon alanı).
 *
 * Neden bu kadar sıkı: yöneticinin yapıştırdığı işaretleme PUBLIC sitede
 * `dangerouslySetInnerHTML` ile basılıyor. Yani buradan geçen her şey
 * ziyaretçinin tarayıcısında çalışabilir. Kural tek: yalnız izinli SVG
 * öğe/niteliği kalır, gerisi İÇERİĞİYLE atılır.
 *
 * Testler kasten "kullanıcı çıktısına" bakıyor (`toContain`), iç veri
 * yapısına değil: asıl iddia "üretilen metin güvenli mi".
 */

/** İzinsiz öğeler: hem etiket hem içeriği gitmeli. */
const DROPPED_TAGS = [
  'script',
  'style',
  'foreignObject',
  'iframe',
  'object',
  'embed',
  'image',
  'animate',
  'set',
  'handler',
  'a',
  'audio',
  'video',
  'canvas',
  'filter',
]

/** Ölçülen tipik lucide ikonu — gerçek ikon bozulmadan geçmeli. */
const LUCIDE_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-icon"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'

describe('sanitizeSvg — tehlikeli içerik atılır', () => {
  it('<script> hem etiketi hem metniyle gider', () => {
    const out = sanitizeSvg('<svg><script>alert(1)</script><path d="M0 0"/></svg>')
    expect(out).not.toContain('<script')
    expect(out).not.toContain('alert(1)')
    expect(out).toContain('<path')
  })

  // Kapanmayan script: metin akışı kesilmezse içeriği sızar.
  it('kapatılmamış <script> içeriği de gitmez', () => {
    const out = sanitizeSvg('<svg><script>alert(1)<path d="M0 0"/>')
    expect(out).not.toContain('alert(1)')
  })

  it('onload / onclick / onmouseover (büyük harfli yazımlarıyla) atılır', () => {
    const out = sanitizeSvg('<svg onload="alert(1)"><path onclick="alert(1)" onMouseOver="x" d="M0 0"/></svg>')
    expect(out).not.toContain('onload')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('onmouseover')
    expect(out).toContain('d="M0 0"')
  })

  it('<style> öğesi ve içeriği gider; style="…" niteliği kalır mı diye sorulmaz → düşer', () => {
    const out = sanitizeSvg('<svg><style>.a{fill:red}</style><path class="a" style="fill:red" d="M0 0"/></svg>')
    expect(out).not.toContain('<style')
    expect(out).not.toContain('fill:red')
    expect(out).not.toContain('style')
    // Zararsız sınıf gerçekten korunmuş olmalı (iptal testi).
    expect(out).toContain('class="a"')
  })

  it('<foreignObject> içeriğiyle birlikte gider (HTML kaçırma yolu)', () => {
    const out = sanitizeSvg('<svg><foreignObject><div>hi</div></foreignObject><path d="M0 0"/></svg>')
    expect(out).not.toContain('foreignObject')
    expect(out).not.toContain('<div')
    expect(out).not.toContain('hi')
    expect(out).toContain('<path')
  })

  it('küçük harfli <foreignobject> yazımı da gider', () => {
    const out = sanitizeSvg('<svg><foreignobject><div>hi</div></foreignobject><path d="M0 0"/></svg>')
    expect(out).not.toContain('foreignobject')
    expect(out).not.toContain('hi')
  })

  // Drop listesi: her öğe gitmeli.
  it.each(DROPPED_TAGS)('<%s> atılır', (tag) => {
    const out = sanitizeSvg(`<svg><${tag}><path d="M0 0"/></${tag}></svg>`)
    expect(out).not.toContain(`<${tag}`)
  })

  // `script`/`style` htmlparser2'de RAW-TEXT öğesidir: içlerindeki `<path>` bile
  // metin sayılır, yani ikonun TAMAMI düşer (etiket gider, geriye bir şey kalmaz).
  it('script/style içeriği metin olarak yutulur → ikonun tamamı atılır', () => {
    for (const tag of ['script', 'style']) {
      expect(sanitizeSvg(`<svg><${tag}><path d="M0 0"/></${tag}></svg>`)).toBe('')
    }
    // Negatif kontrol: diğer öğelerde ikon ayakta kalır.
    expect(sanitizeSvg('<svg><a href="#x"><path d="M0 0"/></a></svg>')).toContain('<path')
  })

  // `<image>`/`<animate>` gibi öğeler kendini kapatan biçimde de gelir.
  it('kendini kapatan <image>/<animate> da atılır', () => {
    const out = sanitizeSvg('<svg><image href="https://evil.example/x.png" width="5" height="5"/><animate attributeName="href" values="javascript:alert(1)"/><path d="M0 0"/></svg>')
    expect(out).not.toContain('<image')
    expect(out).not.toContain('<animate')
    expect(out).not.toContain('evil.example')
    expect(out).toContain('<path')
  })

  it('bilinmeyen öğe atılır, içindeki izinli öğe korunur', () => {
    const out = sanitizeSvg('<svg><blink><path d="M0 0"/></blink></svg>')
    expect(out).not.toContain('<blink')
    expect(out).toContain('<path d="M0 0"')
  })

  it('izinli olsa bile <svg> dışındaki HTML taşınmaz (div/wrapper)', () => {
    const out = sanitizeSvg('<div class="x" onclick="alert(1)"><svg viewBox="0 0 1 1"><path d="M0 0"/></svg></div>')
    expect(out).not.toContain('<div')
    expect(out).toContain('<svg')
  })
})

describe('sanitizeSvg — href ve nitelik politikası', () => {
  it('dış href="https://…" atılır, iç href="#grad" korunur', () => {
    const out = sanitizeSvg('<svg><use href="https://evil.example/x"/><use href="#grad"/></svg>')
    expect(out).not.toContain('evil.example')
    expect(out).toContain('href="#grad"')
  })

  it('eski yazım xlink:href için de aynı kural', () => {
    const out = sanitizeSvg('<svg><use xlink:href="https://evil.example/x"/><use xlink:href="#grad"/></svg>')
    expect(out).not.toContain('evil.example')
    expect(out).toContain('xlink:href="#grad"')
  })

  it('protokol-göreli (//evil.example) ve göreli (x.svg#id) href de atılır', () => {
    const out = sanitizeSvg('<svg><use href="//evil.example/x"/><use href="x.svg#grad"/><use href="#ok"/></svg>')
    expect(out).not.toContain('evil.example')
    expect(out).not.toContain('x.svg')
    expect(out).toContain('href="#ok"')
  })

  it('javascript: (varlıkla gizlenmiş hâli dahil) hiçbir nitelikte kalmaz', () => {
    const out = sanitizeSvg('<svg><use href="javascript:alert(1)"/><use href="java&#115;cript:alert(1)"/><path fill="url(javascript:alert(1))" d="M0 0"/></svg>')
    expect(out).not.toContain('javascript')
    expect(out).toContain('d="M0 0"')
  })

  it('data:text/html taşıyan değer atılır', () => {
    const out = sanitizeSvg('<svg><path fill="data:text/html;base64,PHNjcmlwdD4=" d="M0 0"/></svg>')
    expect(out).not.toContain('data:text/html')
    expect(out).toContain('d="M0 0"')
  })

  it('izinli nitelikler korunur (id/class/role/aria-hidden/focusable/opacity)', () => {
    const out = sanitizeSvg('<svg id="icon" class="a b" role="img" aria-hidden="true" focusable="false" opacity=".5"><title>T</title><path d="M0 0"/></svg>')
    expect(out).toContain('id="icon"')
    expect(out).toContain('class="a b"')
    expect(out).toContain('role="img"')
    expect(out).toContain('aria-hidden="true"')
    expect(out).toContain('focusable="false"')
    expect(out).toContain('opacity=".5"')
  })

  it('bilinmeyen/data-* nitelikler atılır', () => {
    const out = sanitizeSvg('<svg><path d="M0 0" onclick="x" data-x="1" aria-label="3" foo="bar"/></svg>')
    expect(out).not.toContain('data-x')
    expect(out).not.toContain('aria-label')
    expect(out).not.toContain('foo')
    expect(out).toContain('d="M0 0"')
  })

  // Değerin içindeki tırnak kaçmazsa nitelik kaçışı (yeni nitelik uydurma) olurdu.
  it('değer içindeki tırnak kaçırılır → sahte nitelik üretilemez', () => {
    const out = sanitizeSvg('<svg><path d=\'M0 0" onload="alert(1)\'/></svg>')
    expect(out).not.toContain('onload="')
    expect(out).toContain('&quot;')
  })
})

describe('sanitizeSvg — gerçek ikon bozulmadan geçer', () => {
  it('iç içe <g>/<path> korunur', () => {
    const out = sanitizeSvg('<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor"><path d="M1 2" stroke-width="1.5"/></g></svg>')
    expect(out).toContain('<g fill="none" stroke="currentColor">')
    expect(out).toContain('<path d="M1 2" stroke-width="1.5"')
  })

  it('tipik lucide ikonu d ve stroke-width ile birlikte bozulmadan geçer', () => {
    const out = sanitizeSvg(LUCIDE_ICON)
    expect(out).toContain('viewBox="0 0 24 24"')
    expect(out).toContain('d="M18 6 6 18"')
    expect(out).toContain('d="m6 6 12 12"')
    expect(out).toContain('stroke-width="2"')
    expect(out).toContain('stroke-linecap="round"')
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(out).toContain('class="lucide lucide-x-icon"')
  })

  it('viewBox aynen korunur, width/height EKLENMEZ', () => {
    const out = sanitizeSvg('<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>')
    expect(out).toContain('viewBox="0 0 24 24"')
    expect(out).not.toContain('width')
    expect(out).not.toContain('height')
  })

  // htmlparser2 adları küçük harfe çevirir; geri yazılmazsa `viewbox` çizilmez.
  it('büyük harfli girdi de kanonik adlara iner (VIEWBOX → viewBox)', () => {
    const out = sanitizeSvg('<SVG VIEWBOX="0 0 24 24"><PATH D="M0 0"/></SVG>')
    expect(out).toContain('viewBox="0 0 24 24"')
    expect(out).toContain('<path d="M0 0"')
    expect(out).not.toContain('viewbox')
  })

  it('tema rengi currentColor korunur', () => {
    const out = sanitizeSvg('<svg fill="none"><path fill="currentColor" stroke="currentColor" d="M0 0"/></svg>')
    expect(out).toContain('fill="currentColor"')
    expect(out).toContain('stroke="currentColor"')
    expect(out).toContain('fill="none"')
  })

  it('gradient/clipPath/mask/pattern öğeleri kanonik yazımla korunur', () => {
    const out = sanitizeSvg('<svg><lineargradient id="g" gradientunits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="0"><stop offset="0.5" stop-color="currentColor" stop-opacity=".5"/></lineargradient><radialgradient id="r"/><clippath id="c"><circle cx="5" cy="5" r="3"/></clippath><mask id="m" maskunits="userSpaceOnUse"><rect width="1" height="1"/></mask><pattern id="p" patternunits="userSpaceOnUse" markerwidth="2" markerheight="2" preserveaspectratio="none"><path d="M0 0"/></pattern></svg>')
    for (const el of ['linearGradient', 'radialGradient', 'clipPath', 'mask', 'pattern']) {
      expect(out).toContain(`<${el}`)
    }
    expect(out).toContain('gradientUnits="userSpaceOnUse"')
    expect(out).toContain('maskUnits="userSpaceOnUse"')
    expect(out).toContain('patternUnits="userSpaceOnUse"')
    expect(out).toContain('markerWidth="2"')
    expect(out).toContain('markerHeight="2"')
    expect(out).toContain('preserveAspectRatio="none"')
    expect(out).toContain('stop-color="currentColor"')
    expect(out).not.toContain('lineargradient')
    expect(out).not.toContain('clippath')
  })

  it('defs/symbol ve iç #id referanslı use korunur', () => {
    const out = sanitizeSvg('<svg><defs><symbol id="s" viewBox="0 0 1 1"><path d="M0 0"/></symbol></defs><use href="#s" x="1" y="2"/></svg>')
    expect(out).toContain('<defs>')
    expect(out).toContain('<symbol id="s" viewBox="0 0 1 1">')
    expect(out).toContain('<use href="#s" x="1" y="2"')
  })

  it('text/tspan/title/desc metni korunur, kaçırılmış `<` metin olarak kalır', () => {
    const out = sanitizeSvg('<svg><title>Başlık</title><desc>açıklama</desc><text x="1" y="2">Hi <tspan x="3">there</tspan></text></svg>')
    expect(out).toContain('<title>Başlık</title>')
    expect(out).toContain('<desc>açıklama</desc>')
    expect(out).toContain('<tspan x="3">there</tspan>')
    expect(out).toContain('Hi ')
  })

  // Dış dosyalar/dosya içeriği kasten kirli gelir: `<svg>` öncesi/sonrası çöp
  // metin ve komşu HTML girer, temizlik sonrası yalnız ikon kalır.
  it('bir TSX bileşeninden çıkarılmış işaretleme kabul edilir (çevre kodu atılır)', () => {
    const out = sanitizeSvg('export const Icon = () => (\n  <svg viewBox="0 0 24 24"><path d="M4 4h16" stroke="currentColor"/></svg>\n)')
    expect(out).toContain('<svg viewBox="0 0 24 24">')
    expect(out).not.toContain('export')
    expect(out).not.toContain('const Icon')
  })

  it('bir URL\'den indirilmiş içerikteki komşu <script> taşınmaz', () => {
    const out = sanitizeSvg('<svg viewBox="0 0 1 1"><path d="M0 0"/></svg> trailing <script>alert(1)</script>')
    expect(out).toContain('<svg viewBox="0 0 1 1">')
    expect(out).not.toContain('<script')
    expect(out).not.toContain('alert(1)')
  })

  // NUL: indirilmiş dosyadan gelir, Postgres `text` sütunu INSERT'te reddeder.
  it('girdideki NUL baytı temizlenir (DB kaydı patlamasın)', () => {
    const out = sanitizeSvg('<svg><text x="1">a\u0000b</text><path d="M0 0"/></svg>')
    expect(out).not.toContain('\u0000')
    expect(out).toContain('<path')
  })
})

describe('sanitizeSvg — SVG olmayan / bozuk girdi', () => {
  it.each([
    'hello',
    'https://x/y.png',
    'mailto:a@b.c',
    '',
    '   ',
    '<div>not an icon</div>',
  ])('%j → boş dize', (input) => {
    expect(sanitizeSvg(input)).toBe('')
  })

  // Sözleşme: `<svg` yoksa VEYA temizlik sonrası çizilecek alt öğe kalmadıysa ''.
  it.each([
    '<svg></svg>',
    '<svg viewBox="0 0 24 24"></svg>',
    '<svg>just text</svg>',
    '<svg><!-- yalnız yorum --></svg>',
    '<svg><script>alert(1)</script></svg>',
    '<svg',
    '<svg>',
  ])('%j → boş dize (çizilebilir içerik yok)', (input) => {
    expect(sanitizeSvg(input)).toBe('')
  })

  it('bozuk/kapatılmamış girdi hata FIRLATMAZ', () => {
    for (const broken of ['<svg><g><path d="M0 0', '<svg><g>', '<svg><', '<svg', '<svg><path d="M0 0"></svg></g></svg>', '<svg><path d="M0 0"/></svg></svg>']) {
      expect(() => sanitizeSvg(broken)).not.toThrow()
      expect(typeof sanitizeSvg(broken)).toBe('string')
    }
  })

  it('bozuk girdi yine de temiz bir dize döndürür (çöp taşımaz)', () => {
    const out = sanitizeSvg('<svg viewBox="0 0 1 1"><g><path d="M0 0')
    expect(out).toContain('<svg viewBox="0 0 1 1">')
    expect(out).not.toContain('script')
  })
})

/**
 * İki aşamalı kapı: `looksLikeSvg` yalnız ŞEKLE bakar (kaydetme öncesi hızlı
 * "bu bir SVG mi?" uyarısı), asıl kararı `sanitizeSvg` verir. Bu yüzden
 * `<svg></svg>` "SVG gibi görünür" ama kaydedilemez (içerik yok).
 */
describe('looksLikeSvg', () => {
  it.each([
    '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>',
    '<svg>',
    '<SVG VIEWBOX="0 0 1 1">',
    '  <svg/>',
  ])('işaretleme: %j → true', (input) => {
    expect(looksLikeSvg(input)).toBe(true)
  })

  it.each([
    'icon.svg',
    '/assets/icons/star.svg',
    'https://cdn.example/a.svg?v=2',
    'icon.svg#grad',
  ])('dosya adı/URL: %j → true', (input) => {
    expect(looksLikeSvg(input)).toBe(true)
  })

  it.each([
    '',
    'hello',
    'https://x/y.png',
    'https://example.com/svg',
    '{"icon":"x"}',
  ])('svg olmayan: %j → false', (input) => {
    expect(looksLikeSvg(input)).toBe(false)
  })

  it('asıl kapı sanitizeSvg: boş <svg> "gibi görünür" ama kaydedilmez', () => {
    expect(looksLikeSvg('<svg></svg>')).toBe(true)
    expect(sanitizeSvg('<svg></svg>')).toBe('')
  })
})
