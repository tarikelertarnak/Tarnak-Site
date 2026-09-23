/**
 * CSV uretimi — saf fonksiyonlar (test edilebilir, yan etkisiz).
 *
 * Neden ayri dosya: CSV'de dogru kacis (escaping) yapmak gorundugunden zor ve
 * yanlis yapilirsa veri BOZULUR veya guvenlik acigi olusur. Bu yuzden kacis
 * mantigini arayuzden ayirip birim testine bagliyoruz.
 *
 * Iki kritik konu:
 *
 * 1) CSV ENJEKSIYONU (formula injection) — gercek guvenlik acigi.
 *    Hucre `=`, `+`, `-`, `@`, TAB veya CR ile baslarsa Excel/Sheets bunu
 *    FORMUL olarak calistirir. Bir saldirgan iletisim formuna
 *    `=HYPERLINK("http://kotu","tikla")` veya `=cmd|'/c calc'!A1` yazarsa,
 *    admin CSV'yi actiginda komut calisabilir / veri sizabilir.
 *    Cozum: bu karakterlerle baslayan degerlerin onune `'` koy.
 *    (OWASP onerisi. Metin bozulmaz, Excel onu duz metin sayar.)
 *
 * 2) AYIRICI `;` — Turkce Excel'in "liste ayirici"si noktali virguldur.
 *    Virgul kullanirsak tr-TR Excel tum satiri TEK hucreye koyar; kullanici
 *    "CSV bozuk" der. `;` + UTF-8 BOM ile Turkce karakterler de dogru acilir.
 */

export const CSV_DELIMITER = ';'
const BOM = '\uFEFF'

/** Excel'in formul saydigi baslangic karakterleri. */
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r']

function escapeCell(value: unknown, delimiter: string): string {
  let text: string

  if (value === null || value === undefined) {
    text = ''
  }
  else if (Array.isArray(value)) {
    // tags gibi dizi alanlar: virgul+ bosluk ile birlestir (okunabilir olsun)
    text = value.map(v => String(v)).join(', ')
  }
  else if (typeof value === 'object') {
    text = JSON.stringify(value)
  }
  else if (typeof value === 'boolean') {
    text = value ? 'Evet' : 'Hayır'
  }
  else {
    text = String(value)
  }

  // 1) Formul enjeksiyonunu etkisizlestir
  if (text.length > 0 && FORMULA_PREFIXES.includes(text[0])) {
    text = `'${text}`
  }

  // 2) Gerekliyse tirnakla ve icteki tirnaklari ikizle
  if (
    text.includes(delimiter)
    || text.includes('"')
    || text.includes('\n')
    || text.includes('\r')
  ) {
    text = `"${text.replace(/"/g, '""')}"`
  }

  return text
}

export interface CsvColumn {
  /** Nesnedeki alan adi */
  key: string
  /** Basliktaki gorunen ad */
  label: string
}

/**
 * Satirlardan CSV metni uretir.
 * `bom: true` (varsayilan) → Excel'in UTF-8'i taniyip Turkce karakterleri
 * dogru gostermesi icin basa BOM eklenir.
 */
export function toCsv(
  columns: readonly CsvColumn[],
  rows: readonly Record<string, unknown>[],
  options: { bom?: boolean, delimiter?: string } = {},
): string {
  const { bom = true, delimiter = CSV_DELIMITER } = options

  const header = columns.map(c => escapeCell(c.label, delimiter)).join(delimiter)
  const lines = rows.map(row =>
    columns.map(c => escapeCell(row[c.key], delimiter)).join(delimiter),
  )

  const body = [header, ...lines].join('\r\n')
  return bom ? BOM + body : body
}

/** Indirilecek dosya adi: `kaynak-YYYY-AAGG.csv` */
export function csvFilename(resourceKey: string, now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const safe = resourceKey.replace(/[^a-z0-9-]/gi, '')
  return `${safe}-${y}-${m}${d}.csv`
}
