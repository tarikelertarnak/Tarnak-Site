import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright — Faz 1 · test & CI
 *
 * TASARIM KARARLARI:
 *
 * 1) SUNUCU: `next build` + `next start` DEĞİL, `next dev`.
 *    Gerekçe: CI'da build zaten ayrı bir adımda çalışıyor ve
 *    `start` port/bellek tarafından kırılgan. `dev` sunucusu gerçek
 *    uygulamayı aynı kodla çalıştırır, testler daha güvenilir olur.
 *    Lokalde `localhost:3000` zaten açıksa (`reuseExistingServer`) yeniden
 *    başlatılmaz.
 *
 * 2) İKİ PROJE = masaüstü + mobil (Chromium). İkisi de Chromium ki
 *    Chromium indirması tek (CI süresi ve disk için).
 *
 * 3) TEMA: her iki temada da koşacak tek bir "tema" testi yazmak yerine
 *    `colorScheme` emülasyonuyla ikisini de geziyoruz. Açık/koyu değişimi
 *    ayrı bir testte gerçek tıklama ile doğrulanıyor (reduced-motion
 *    kırılması bu testte yakalanır).
 *
 * 4) `trace: retain-on-failure` — hata olursa iz (trace) CI'ya artifact
 *    olarak gider, sonradan "nasıl oldu" sorusu kalıcı yanıt bulur.
 */
/**
 * Sunucu portu 3000 ve BİRİNCİ dev sunucusuna bağlanır.
 *
 * Gerekçe: Next 16 aynı dizinde ikinci bir `next dev` başlatmayı reddediyor
 * ("Another next dev server is already running") — port 3100'da ikinci
 * sunucu açmak da denendi, ÇALIŞMADI. Bu yüzden:
 *   · Lokalde: `reuseExistingServer` ile açık olan sunucuya bağlanır.
 *   · CI'da: 3000 boş olduğu için Playwright kendi sunucusunu başlatır.
 * Ayrı iki port yerine tek kaynak (3000) hem CI'da hem lokalde aynı davranışı
 * veriyor.
 */
const PORT = 3000
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    // Site `svh` kullanıyor; CI'da mobil viewport emülasyonu bunu bozabiliyor.
    hasTouch: false,
  },

  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    /*
      PRODUCTION BUILD ÜZERİNDE TEST (2026-10-07 düzeltmesi).
      Önce `next dev` ile denendi ve iki sebeple vazgeçildi:
        1) `next dev` HMR WebSocket'i `ERR_INVALID_HTTP_RESPONSE` ile ölüyor
           ve hydration başlamıyor — testler "düğmeye tıklanmıyor" diye
           patlıyordu, oysa uygulama kaynaklı bir hata yok.
        2) Turbopack dev çıktısı, kullanıcının gerçekten gördüğü paket
           değil. Testin ölçtüğü şey ÜRETİM olmalı.
      `next build && next start` hem hızlı hem sadık.
    */
    command: 'npx next build && npx next start --port 3000',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
