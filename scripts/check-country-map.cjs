// Verifies every IANA timezone → ISO2 entry in use-contact-form.ts:
// 1) exists in the generated COUNTRIES list, 2) has no duplicate timezone keys.
// Run: node scripts/check-country-map.cjs
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const hook = fs.readFileSync(path.join(root, 'src/hooks/use-contact-form.ts'), 'utf8')
const countriesSrc = fs.readFileSync(path.join(root, 'src/lib/countries-data.ts'), 'utf8')

const block = hook.match(
  /TIMEZONE_COUNTRY: Record<string, string> = \{([\s\S]*?)\n\}/,
)
if (!block)
  throw new Error('TIMEZONE_COUNTRY block not found in use-contact-form.ts')

const entries = [...block[1].matchAll(/'([^']+)': '([a-z]{2})'/g)].map(x => ({
  tz: x[1],
  iso2: x[2],
}))
if (entries.length === 0)
  throw new Error('No timezone entries parsed')

const valid = new Set(
  [...countriesSrc.matchAll(/iso2: '(..)'/g)].map(x => x[1]),
)
const bad = entries.filter(e => !valid.has(e.iso2))
const dup = entries.filter((e, i) => entries.findIndex(x => x.tz === e.tz) !== i)

if (bad.length || dup.length) {
  console.error('INVALID:')
  bad.forEach(e => console.error(`  unknown iso2 "${e.iso2}" for ${e.tz}`))
  dup.forEach(e => console.error(`  duplicate timezone ${e.tz}`))
  process.exit(1)
}

console.log(`OK: ${entries.length} timezone→country mappings valid`)