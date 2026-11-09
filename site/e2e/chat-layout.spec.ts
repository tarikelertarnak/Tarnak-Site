import { expect, test } from '@playwright/test'

/**
 * Sohbet sayfası yerleşim regresyonu (2026-10-13).
 *
 * 2026-10-11'de bu test "başlık sohbet kutusuna girmesin" diye yazılmıştı.
 * Kullanıcı 2026-10-13'te "Sohbet başlığı boşa yer kaplıyor" dediği için başlık
 * bloğu TAMAMEN kaldırıldı. Test artık şunu kanıtlar: sayfada sohbet başlığı
 * YOK, kutu sabit TopBar'ın (56px) altında durur ve ekrandan taşmaz.
 *
 * Birden çok ekran yüksekliğinde çalışır çünkü kutu yüksekliği `100svh`e bağlı.
 *
 * Not: bu sayfa statik CSS ile ölçülüyor (hidrasyon gerekmiyor); bu makinede
 * `next dev` hidrasyon yapmıyor (bkz. playwright.config.ts).
 */
const HEIGHTS = [1080, 900, 768, 640, 560]
const TOPBAR = 56

for (const h of HEIGHTS) {
  test(`/chat ${h}px: kutu TopBar altinda, ekrandan tasmiyor`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: h })
    await page.goto('/chat')

    const box = page.getByTestId('chat-slot')
    await expect(box).toBeVisible()
    const b = (await box.boundingBox())!
    expect(b.y, 'sabit TopBar altinda kalsin').toBeGreaterThanOrEqual(TOPBAR)
    expect(b.y + b.height, 'sohbet kutusu ekrandan tasmasin').toBeLessThanOrEqual(h + 1)
  })
}

test('/chat: "Sohbet" baslik blogu kaldirildi (geri gelmesin)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/chat')
  // Başlık kaldırıldı; `main` içinde hiç başlık öğesi kalmamalı (2026-10-13).
  await expect(page.locator('main h1, main h2')).toHaveCount(0)
})
