import { expect, test } from '@playwright/test'

/**
 * Sohbet sayfası yerleşim regresyonu (2026-10-11).
 * Kullanıcı: "chat başlığı grubun içine giriyor".
 *
 * Ölçüm gerçek DOM kutularıyla yapılır: başlığın alt kenarı, sohbet
 * kutusunun üst kenarından BÜYÜK OLMAMALI. Birden çok ekran yüksekliğinde
 * çalıştırılır çünkü hata yalnız kısa ekranlarda oluyordu.
 *
 * Not: bu sayfa statik CSS ile ölçülüyor (hidrasyon gerekmiyor); bu makinede
 * `next dev` hidrasyon yapmıyor (bkz. playwright.config.ts).
 */
const HEIGHTS = [1080, 900, 768, 640, 560]

for (const h of HEIGHTS) {
  test(`/chat ${h}px: baslik sohbet kutusuna girmez`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: h })
    await page.goto('/chat')

    const title = page.locator('main h2').first()
    const box = page.getByTestId('chat-slot')
    await expect(title).toBeVisible()
    await expect(box).toBeVisible()

    const t = (await title.boundingBox())!
    const b = (await box.boundingBox())!
    // sohbet kutusu ekranda da taşmasın
    expect(t.y + t.height, 'baslik alt kenarı kutunun ust kenarindan yuksekte').toBeLessThanOrEqual(b.y)
    expect(b.y + b.height, 'sohbet kutusu ekrandan tasma').toBeLessThanOrEqual(h + 1)
  })
}

test('baslik "absolute" degil — akista kardes olarak durur', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 640 })
  await page.goto('/chat')
  const info = await page.evaluate(() => {
    const h2 = document.querySelector('main h2')!
    let el: HTMLElement | null = h2.parentElement
    let absoluteAncestor = false
    while (el && el.tagName !== 'MAIN') {
      if (getComputedStyle(el).position === 'absolute')
absoluteAncestor = true
      el = el.parentElement
    }
    return { absoluteAncestor }
  })
  expect(info.absoluteAncestor).toBe(false)
})
