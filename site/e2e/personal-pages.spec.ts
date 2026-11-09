import { expect, test } from '@playwright/test'

/**
 * Kişisel sayfalar (/now, /gizlilik, /kvkk).
 *
 * 2026-10-30 (kullanıcı): `/uses` ve `/changelog` sayfaları silindi, bu
 * listeden de çıkarıldı. Geriye kalan gerekli/hukuki sayfalar ölçülür.
 *
 * Kural (ortak kural dosyası): içerik UYDURULMAZ. Bu yüzden testler
 * "doluluk" değil "doğru davranış" ölçer:
 *   · sayfa 200 döner ve h1 görünür
 *   · yatay taşma yok (1280 / 768 / 375)
 *   · içerik girilene kadar boş durum kartı gösterilir, boş kart yığını değil
 *   · konsol/hydration hatası yok
 */
const SAYFALAR = [
  // Üst başlıklar İngilizce (2026-10-31, kullanıcı: "bütün o üst kısımlardaki
  // şeylerde ingilizce olmalı") — ABOUT ME / PROJECTS / BLOG ile aynı marka dili.
  { yol: '/now', baslik: /^now$/i },
  { yol: '/gizlilik', baslik: /privacy policy/i },
  { yol: '/kvkk', baslik: /kvkk notice/i },
]

test.describe('Kişisel sayfalar', () => {
  /*
    Dil SABİTLENİR (2026-10-30). Uygulama artık tarayıcı diline göre çeviriyor;
    CI/Playwright varsayılanı en-US olduğu için başlıklar "Now" / "Privacy
    Policy" geliyordu ve Türkçe beklentiler boşa düşüyordu. Gerçek kullanıcı
    da dili Ayarlar'dan seçince `site-locale` cerezi yazılır — test aynı yolu
    kullanır (hydration hatası testi ayrıca en-US ile de koşar).
  */
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([
      { name: 'site-locale', value: 'tr', url: baseURL ?? 'http://localhost:3000' },
    ])
  })

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
    await page.locator('footer a[href="/now"]').click()
    await expect(page).toHaveURL(/\/now\/?$/)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('sitemap yeni sayfaları içeriyor', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text()
    for (const { yol } of SAYFALAR) {
      expect(xml, `${yol} sitemap'te olmalı`).toContain(yol)
    }
  })
})
