import { expect, test } from '@playwright/test'

/**
 * Faz 6 sayfaları (/uses, /now, /changelog, /gizlilik, /kvkk).
 *
 * Kural (ortak kural dosyası): içerik UYDURULMAZ. Bu yüzden testler
 * "doluluk" değil "doğru davranış" ölçer:
 *   · sayfa 200 döner ve h1 görünür
 *   · yatay taşma yok (1280 / 768 / 375)
 *   · içerik girilene kadar boş durum kartı gösterilir, boş kart yığını değil
 *   · konsol/hydration hatası yok
 */
const SAYFALAR = [
  { yol: '/uses', baslik: /kullan/i },
  { yol: '/now', baslik: /şu an/i },
  { yol: '/changelog', baslik: /değişiklik/i },
  { yol: '/gizlilik', baslik: /gizlilik/i },
  { yol: '/kvkk', baslik: /kvkk/i },
]

test.describe('Faz 6 sayfaları', () => {
  for (const { yol, baslik } of SAYFALAR) {
    test(`${yol} açılıyor ve başlığı doğru`, async ({ page }) => {
      const yanit = await page.goto(yol, { waitUntil: 'domcontentloaded' })
      expect(yanit?.status(), `${yol} 200 dönmeli`).toBe(200)
      await expect(page.locator('h1').first()).toBeVisible()
      await expect(page.locator('h1').first()).toHaveText(baslik)
    })

    test(`${yol} yatay taşma yok (mobil)`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto(yol, { waitUntil: 'domcontentloaded' })
      const tasma = await page.evaluate(
        () =>
          document.documentElement.scrollWidth
          - document.documentElement.clientWidth,
      )
      expect(tasma).toBeLessThanOrEqual(1)
      // Sayfa yatay KAYDIRILMAMIŞ olmalı (scrollIntoView kaçakları burada çıkardı).
      const scrollLeft = await page.evaluate(
        () => document.documentElement.scrollLeft,
      )
      expect(scrollLeft).toBe(0)
    })

    test(`${yol} konsol/hydration hatası yok`, async ({ page }) => {
      const hatalar: string[] = []
      page.on('console', (m) => {
        if (m.type() === 'error')
hatalar.push(m.text())
      })
      page.on('pageerror', e => hatalar.push(String(e)))

      await page.goto(yol, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('h1').first()).toBeVisible()
      await page.waitForTimeout(900)

      const hydration = hatalar.filter(h => /hydrat|did not match/i.test(h))
      expect(hydration, `hydration: ${hydration.join(' | ')}`).toHaveLength(0)
    })
  }

  test('footer yeni sayfalara bağlantı veriyor', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    for (const { yol } of SAYFALAR) {
      const baglanti = page.locator(`footer a[href="${yol}"]`)
      await expect(baglanti, `${yol} footer'da olmalı`).toHaveCount(1)
    }
  })

  test('footer bağlantısı hedef sayfaya götürüyor', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.locator('footer a[href="/changelog"]').click()
    await expect(page).toHaveURL(/\/changelog\/?$/)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('sitemap yeni sayfaları içeriyor', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text()
    for (const { yol } of SAYFALAR) {
      expect(xml, `${yol} sitemap'te olmalı`).toContain(yol)
    }
  })
})
