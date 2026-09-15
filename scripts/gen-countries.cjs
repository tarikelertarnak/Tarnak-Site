// One-shot: convert react-international-phone countryData.ts into our static list.
// Input format tuples: [name, iso2, dialCode, (format|undefined), (priority|undefined), (areaCodes|undefined)]
const fs = require('fs')
const src = fs.readFileSync(
  'C:/Users/TARIKELER/AppData/Local/Temp/opencode/riph/react-international-phone-master/src/data/countryData.ts',
  'utf8',
)

// Extract the defaultCountries array source between the brackets.
const start = src.indexOf('export const defaultCountries')
const arrStart = src.indexOf('[', src.indexOf('=', start))
let depth = 0
let end = -1
for (let i = arrStart; i < src.length; i++) {
  if (src[i] === '[')
    depth++
  else if (src[i] === ']') {
    depth--
    if (depth === 0) {
      end = i
      break
    }
  }
}
const body = src.slice(arrStart + 1, end)

// Split top-level array items by tracking bracket/paren depth.
function splitTopLevel(text, opening, closing) {
  const parts = []
  let cur = ''
  let d = 0
  for (const ch of text) {
    if (ch === opening)
      d++
    else if (ch === closing)
      d--
    if (ch === ',' && d === 0) {
      parts.push(cur.trim())
      cur = ''
    }
    else {
      cur += ch
    }
  }
  if (cur.trim())
    parts.push(cur.trim())
  return parts
}

const items = splitTopLevel(body, '[', ']')

const out = []
for (const item of items) {
  // strip the wrapping [ ... ] of the tuple, then split its fields on top-level commas
  const inner = item.trim().replace(/^\[/, '').replace(/\]$/, '')
  const fields = splitTopLevel(inner, '[', ']')
  if (fields.length < 3)
    continue
  const name = fields[0].trim().replace(/^'|'$/g, '')
  const iso2 = fields[1].trim().replace(/^'|'$/g, '')
  const code = fields[2].trim().replace(/^'|'$/g, '')
  // Tuples with [name, iso, code, format, priority] or [name, iso, code, format, priority, areaCodes]
  // have a numeric 4th/index-4 element → that's the priority. Format-only tuples have the format
  // as a single string or object (not a bare number).
  let priority
  if (fields.length >= 5) {
    const p = fields[4].trim().replace(/^'|'$/g, '')
    if (/^\d+$/.test(p))
      priority = Number(p)
  }
  if (fields.length < 3 || !/^[a-z]{2}$/.test(iso2))
    continue
  out.push({ name, iso2, code, priority })
}

// Sort: priority first (same-code groups keep US/CA order), then name.
const sorted = [...out].sort((a, b) => {
  const pa = a.priority ?? 0
  const pb = b.priority ?? 0
  return pa - pb || a.name.localeCompare(b.name)
})

let ts = `// Generated from react-international-phone countryData.ts (data source:
// bl00mber/react-phone-input-2 rawCountries.js). DO NOT EDIT BY HAND.
// Regenerate: node scripts/gen-countries.cjs
export interface CountryRecord {
  /** English display name used for search. */
  name: string
  /** ISO 3166-1 alpha-2, lowercase. */
  iso2: string
  /** International calling code WITHOUT leading +. */
  code: string
}

export const COUNTRIES: CountryRecord[] = [
`
for (const c of sorted) {
  ts += `  { name: '${c.name.replace(/'/g, "\\'")}', iso2: '${c.iso2}', code: '${c.code}' },\n`
}
ts += `]\n`

fs.writeFileSync('C:/Users/TARIKELER/Documents/Projelerim/Tarnak/site/src/lib/countries-data.ts', ts)
console.log(`wrote ${sorted.length} countries`)
// sanity: 1-code group order
for (const code of ['1', '7', '39', '262', '599']) {
  const grp = sorted.filter(c => c.code === code)
  console.log(`+${code}:`, grp.map(c => `${c.name}[${c.priority ?? 0}]`).join(', '))
}