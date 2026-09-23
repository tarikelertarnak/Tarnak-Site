import { describe, expect, it } from 'vitest'

import { CSV_DELIMITER, csvFilename, toCsv } from '@/lib/admin/csv'

/**
 * CSV testleri.
 *
 * En onemli iki iddia:
 *  1) FORMUL ENJEKSIYONU engellenmeli (guvenlik).
 *  2) Kacis (escaping) dogru olmali — yoksa veri bozulur.
 */

const COLS = [
  { key: 'name', label: 'Ad' },
  { key: 'note', label: 'Not' },
]

function csv(rows: Record<string, unknown>[], bom = false) {
  return toCsv(COLS, rows, { bom })
}

describe('toCsv', () => {
  it('basligi ve satirlari ayiriciyla birlestirir', () => {
    expect(csv([{ name: 'Ali', note: 'selam' }]))
      .toBe(`Ad${CSV_DELIMITER}Not\r\nAli${CSV_DELIMITER}selam`)
  })

  it('varsayilan olarak UTF-8 BOM ekler (Excel Turkce karakterleri tanishsin)', () => {
    const withBom = toCsv(COLS, [{ name: 'Çığ' }])
    expect(withBom.startsWith('\uFEFF')).toBe(true)
    expect(withBom).toContain('Çığ')
  })

  it('bom:false ile BOM eklemez', () => {
    expect(csv([{ name: 'a' }]).startsWith('\uFEFF')).toBe(false)
  })

  it('null/undefined hucreleri bos birakir', () => {
    expect(csv([{ name: null, note: undefined }]))
      .toBe(`Ad${CSV_DELIMITER}Not\r\n${CSV_DELIMITER}`)
  })

  it('boolean degerleri Evet/Hayır yazar', () => {
    const rows = [{ name: true, note: false }]
    expect(csv(rows)).toContain(`Evet${CSV_DELIMITER}Hayır`)
  })

  it('dizi alanlari (tags) virgulle birlestirir', () => {
    expect(csv([{ name: ['react', 'next'] }])).toContain('react, next')
  })

  // ---------------------------------------------------------- KACIS (escaping)

  it('ayirici iceren degeri tirnaklar', () => {
    const out = csv([{ name: `a${CSV_DELIMITER}b` }])
    expect(out).toContain(`"a${CSV_DELIMITER}b"`)
  })

  it('icteki tirnaklari ikizler', () => {
    const out = csv([{ name: 'de"di' }])
    expect(out).toContain('"de""di"')
  })

  it('satir sonu iceren degeri tirnaklar (satir bozulmasin)', () => {
    const out = csv([{ name: 'ilk\nikinci' }])
    expect(out).toContain('"ilk\nikinci"')
    // Tirnaklanmasaydi CSV 3 satir olurdu; baslik + 1 satir olmali
    expect(out.split('\r\n')).toHaveLength(2)
  })

  it('noktali virgulu ayirici olarak kullanir (Turkce Excel)', () => {
    expect(CSV_DELIMITER).toBe(';')
  })

  it('farkli ayirici verilebilir', () => {
    const out = toCsv(COLS, [{ name: 'a', note: 'b' }], { bom: false, delimiter: ',' })
    expect(out).toBe('Ad,Not\r\na,b')
  })

  // ------------------------------------------------- GUVENLIK: formul enjeksiyonu

  it('= ile baslayan degeri etkisizlestirir', () => {
    const out = csv([{ name: '=1+1' }])
    expect(out).toContain("'=1+1")
  })

  it('HYPERLINK formulunu etkisizlestirir', () => {
    const evil = '=HYPERLINK("http://kotu.example","tikla")'
    const out = csv([{ name: evil }])
    // Formul artik calismaz: onunde ' var ve hucre tirnakli
    expect(out).toContain("'=HYPERLINK")
    expect(out).not.toMatch(/\r\n=HYPERLINK/)
  })

  it('cmd komut calistirma payloadini etkisizlestirir', () => {
    const out = csv([{ name: `=cmd|'/c calc'!A1` }])
    expect(out).toContain("'=cmd")
  })

  it('+, -, @ ile baslayanlari da etkisizlestirir', () => {
    expect(csv([{ name: '+1' }])).toContain("'+1")
    expect(csv([{ name: '-1' }])).toContain("'-1")
    expect(csv([{ name: '@SUM(A1)' }])).toContain("'@SUM(A1)")
  })

  it('normal metni DEGISTIRMEZ (yanlis pozitif yok)', () => {
    const out = csv([{ name: 'Merhaba dünya' }])
    expect(out).toContain('Merhaba dünya')
    expect(out).not.toContain("'Merhaba")
  })

  it('basligi da kacistan gecirir', () => {
    const out = toCsv([{ key: 'a', label: 'Ad;Soyad' }], [{ a: 'x' }], { bom: false })
    expect(out.startsWith('"Ad;Soyad"')).toBe(true)
  })
})

describe('csvFilename', () => {
  // ⚠️ Tarihi HER ZAMAN disaridan ver: `new Date()` kullanmak testi gune
  // bagimli yapar ve gece yarisi kendiliginden KIRILIR (bir kez yasandi).
  const DAY = new Date(2026, 8, 22)

  it('kaynak adi ve tarihten dosya adi uretir', () => {
    expect(csvFilename('posts', DAY)).toBe('posts-2026-0922.csv')
  })

  it('ay sayisini iki haneye tamamlar', () => {
    expect(csvFilename('ad-slots', new Date(2026, 0, 5))).toBe('ad-slots-2026-0105.csv')
  })

  it('dosya adinda guvensiz karakter birakmaz', () => {
    expect(csvFilename('../../etc/passwd', DAY)).toBe('etcpasswd-2026-0922.csv')
  })

  it('bos anahtarda da bozuk dosya adi uretmez', () => {
    expect(csvFilename('!!!', DAY)).toBe('-2026-0922.csv')
  })
})
