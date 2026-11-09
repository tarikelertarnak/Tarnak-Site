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
 *
 * 2026-10-13: `PLAYWRIGHT_PORT` ile geçersiz kılınabilir. Gerekçe: geliştirme
 * sunucusu günlerdir açık kalınca modül grafiği bayatlıyor (yeniden adlandırılan
 * dosya "Module not found" olarak takılı kalıyor) ve 3000'e bağlanan testler
 * UYGULAMAYI DEĞİL o bayat süreci ölçüyor. İzole bir kopyada taze sunucu açıp
 * `PLAYWRIGHT_PORT=3210` ile aynı paket koşulabiliyor.
 */
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000)
/**
 * `localhost` — `127.0.0.1` DEĞİL (2026-10-13 ölçüldü).
 *
 * Geliştirme sunucusu Next 16'da `/_next/hmr` ve diğer dev kaynaklarını
 * "cross-origin" sayıp BLOKLUYOR:
 *   ⚠ Blocked cross-origin request to Next.js dev resource /_next/hmr from "127.0.0.1".
 * Bloklanınca istemci JS'i (hidrasyon) hiç çalışmıyor: SSR HTML görünür ama
 * hiçbir buton/form yanıt vermiyor. Yıllardır "dev sunucusu hydrate olmuyor"
 * diye anılan belirtinin kökü buydu — uygulama değil, test adresi yanlıştı.
 */
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  /*
   * YEREL WORKER TAVANI = 6 (2026-10-31 ölçüldü). Neden: bu pakette TÜM
   * tarayıcılar TEK bir `next dev` sunucusuna bağlanıyor (aşağıdaki webServer
   * notu). 24 mantıksal çekirdekli makinede Playwright varsayılanı 10 worker
   * açıyor; 10 eşzamanlı tarayıcı aynı sunucudan ilk kez derlenen rotaları
   * isteyince sunucu kuyruğa giriyor ve zaman aşımına dayalı testler düşüyor.
   * Ölçüm: aynı `e2e/admin-panel.spec.ts` tek başına 12/12, `chat-fixes` 15/15
   * geçerken tam pakette 4 admin + 1 chat testi "Yükleniyor…" ekranında
   * kırmızıydı — yani hata uygulamada değil, yük dağıtımındaydı. CI tek worker
   * ile koşmaya devam eder.
   */
  workers: process.env.CI ? 1 : 6,
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
