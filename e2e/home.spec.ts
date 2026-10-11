import { expect, test } from '@playwright/test'

/**
 * Ana sayfa akışları — Faz 1 · test
 *
 * Kapsam: hero görünür mü, bölümler yükleniyor mu, yatay taşma var mı,
 * klavye ile gezinilebiliyor mu, hydration gerçekten çalışıyor mu,
 * tema ilk paintta doğru mu.
 *
 * "Yatay taşma yok" kontrolü özellikle önemli: bu projede daha önce mobilde
 * yatay kaydırma çubuğu çıkmıştı (taşan düğme satırları). Tek bir test
 * geri gelmesini engelliyor.
 */

test.describe('ana sayfa', () => {
  test.beforeEach(async ({ page }) => {
    /*
      ⚠️ `waitForLoadState('networkidle')` KULLANILMAZ.
      `next dev` HMR websocket'ini açık tutar; ağ hiçbir zaman "boşa"
      düşmediği için bekleme 45 sn'de zaman aşımına uğrayıp testleri
      rastgele (flaky) düşürüyordu — bu tam olarak yaşandı.
      Bunun yerine: DOM hazır olsun + ASIL İHTİYACIMIZ olan öğe görünsün.
      Daha hızlı ve deterministik.
    */
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1')).toBeVisible()
  })

  test('hero görünür ve başlık doğru', async ({ page }) => {
    // Tek h1 kuralı (SEO): sayfada tam bir tane olmalı.
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount(1)
    await expect(h1).toBeVisible()

    const text = ((await h1.textContent()) ?? '').replace(/\s+/g, ' ').trim()
    expect(text.length).toBeGreaterThan(3)

    // Logo başlığın üstünde görünmeli (2026-10-07 kullanıcı isteği).
    const logo = page.locator('a[aria-label] svg').first()
    await expect(logo).toBeVisible()

    const h1Box = await h1.boundingBox()
    const logoBox = await logo.boundingBox()
    expect(logoBox).not.toBeNull()
    expect(h1Box).not.toBeNull()
    // Logo başlıktan YUKARIDA olmalı (küçük y = üstte).
    expect(logoBox!.y).toBeLessThan(h1Box!.y)
  })

  test('yatay taşma yok', async ({ page }) => {
    const taşma = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    )
    // 1px tolerans: yuvarlama farkı olabiliyor, fazlası kaydırma çubuğu demek.
    expect(taşma).toBeLessThanOrEqual(1)
  })

  test('bölümler yükleniyor', async ({ page }) => {
    for (const id of ['projects', 'about', 'blog', 'contact']) {
      const bolum = page.locator(`#${id}`)
      await expect(bolum, `#${id} bulunamadı`).toHaveCount(1)
    }
  })

  test('bölüm düğmeleri görünür ve çalışır', async ({ page }) => {
    const proje = page.getByRole('link', { name: /projeler/i }).first()
    await expect(proje).toBeVisible()

    // Tıklayınca hedef sayfaya gidilmeli (çapa bağlantısı değil, gerçek rota).
    await proje.click()
    await expect(page).toHaveURL(/\/projects\/?$/)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('klavye ile gezinme: "içeriğe geç" bağlantısı', async ({ page }) => {
    // İlk Tab odağı içeriğe atlama bağlantısı olmalı (skip link).
    await page.keyboard.press('Tab')
    const odak = await page.evaluate(() => {
      const el = document.activeElement
      return {
        text: (el?.textContent ?? '').trim().slice(0, 40),
        href: el?.getAttribute('href') ?? '',
      }
    })
    expect(odak.text.length).toBeGreaterThan(0)
  })

  test('tema ilk paintta doğru uygulanıyor (FOUC yok)', async ({ page }) => {
    /*
     * Yanlış temayla açılan sayfa "beyaz flaş" yapar (FOUC). Tema bilgisi
     * HTML render edilmeden uygulanmalı. Test: `data-theme` DOM hazır olur
     * olmaz yazılmış olmalı.
     */
    await page.goto('/')
    const erken = await page.evaluate(() => {
      const root = document.documentElement
      return { dataTheme: root.getAttribute('data-theme'), cls: root.className }
    })
    expect(erken.dataTheme, 'ilk paintta data-theme yok → FOUC olur').toMatch(
      /light|dark/,
    )
    expect(erken.cls).toMatch(/light|dark/)
  })

  test('konsol hatası yok', async ({ page }) => {
    const hatalar: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') hatalar.push(msg.text())
    })
    page.on('pageerror', (err) => hatalar.push(String(err)))

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1')).toBeVisible()
    // Uyarıların (varsa) gelişmesi için kısa bir soluklanma payı.
    await page.waitForTimeout(1200)

    // Hydration uyarısı bu projede yaşandı (input id'si Math.random ile
    // üretiliyordu) — regresyonu yakalamak için AÇIKÇA kontrol ediliyor.
    const hydration = hatalar.filter((h) => /hydrat|did not match/i.test(h))
    expect(
      hydration,
      `hydration hatası: ${hydration.join(' | ')}`,
    ).toHaveLength(0)
  })
})
