import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CreditsBrowser } from '@/components/credits/credits-browser'

/**
 * Credits listeleri key regresyonu — 2026-10-12.
 *
 * BUG (bulundu ve düzeltildi): `shownTeam.map((e, i) => e.render(i + 1))` ve
 * `shownSponsors.map(...)` DOĞRUDAN bir `<CreditRow>` elemanı döndürüyordu.
 * Bu elemanlar `<CreditGroup>`'un `children` dizisine **key'siz** giriyordu:
 *
 *   "Each child in a list should have a unique "key" prop.
 *    Check the render method of `CreditGroup`. It was passed a child from
 *    CreditsBrowser."
 *
 * Aynı dosyadaki contributors/translators/donors listeleri `<Fragment key=...>`
 * ile sarıldığı için uyarı yalnızca team + sponsors'tan geliyordu.
 *
 * Neden RENDER testi de var: tarayıcıda hidrasyon bu makinede çalışmıyor
 * (`next dev` + HMR ws → `ERR_INVALID_HTTP_RESPONSE`; bkz. playwright.config.ts),
 * yani konsol kanıtı bu ortamda alınamıyor. jsdom + React dev build aynı uyarıyı
 * `console.error`'a basar — asıl kanıt bu.
 *
 * Negatif kontrol: `Fragment key` sarması kaldırılırsa render testi de kaynak
 * sözleşmesi testi de KIRILIR.
 */
const FILE = join(process.cwd(), 'src/components/credits/credits-browser.tsx')
const SRC = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n')

const TEAM = [
  { name: 'Ekip Üyesi Bir', roleKey: 'credits.roleFounder' },
  { name: 'Ekip Üyesi İki', roleKey: 'credits.roleFounder' },
]

const SPONSORS = [
  { sponsor: 'alpha-sponsor', views: 1200, estimatedRevenue: 42.5 },
  { sponsor: 'beta-sponsor', views: 800, estimatedRevenue: 12.25 },
]

vi.mock('@/components/locale-provider', () => ({
  useT: () => ({ t: (key: string) => key, locale: 'tr' }),
}))

let consoleErrors: string[] = []
let errorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  consoleErrors = []
  errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args.map(a => String(a)).join(' '))
  })
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ items: SPONSORS }),
  })))
})

afterEach(() => {
  cleanup()
  errorSpy.mockRestore()
  vi.unstubAllGlobals()
})

function keyWarnings(): string[] {
  return consoleErrors.filter(m => /unique "key"|minified React error #418|minified React error #419|minified React error #423/.test(m))
}

async function renderCredits() {
  render(
    <CreditsBrowser
      contributors={[]}
      team={TEAM}
      translators={[]}
      topDonors={[]}
    />,
  )
  // Sponsors listesi fetch ile gelir; satır gerçekten render edilmeden test
  // boşuna geçmesin (vacuous pass koruması).
  expect(await screen.findByText('alpha-sponsor')).toBeTruthy()
  expect(screen.getByText('Ekip Üyesi Bir')).toBeTruthy()
}

describe('credits-browser key uyarısı', () => {
  it('team ve sponsors satırları key\'siz render edilmez (React "unique key" uyarısı yok)', async () => {
    await renderCredits()
    expect(keyWarnings(), keyWarnings().join('\n')).toEqual([])
  })

  it('shownTeam ve shownSponsors Fragment key ile sarılır (kaynak sözleşmesi)', () => {
    for (const name of ['shownTeam', 'shownSponsors']) {
      const at = SRC.indexOf(`${name}.map`)
      expect(at, `${name}.map bulunamadı`).toBeGreaterThan(-1)
      expect(SRC.slice(at, at + 200)).toContain('<Fragment key={e.key')
    }
    // Key'siz eski biçim geri gelmesin.
    expect(SRC).not.toMatch(/shownTeam\.map\(\(e, i\) => e\.render\(i \+ 1\)\)/)
    expect(SRC).not.toMatch(/shownSponsors\.map\(\(e, i\) => e\.render\(i \+ 1\)\)/)
  })
})
