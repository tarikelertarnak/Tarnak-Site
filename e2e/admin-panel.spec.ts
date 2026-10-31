import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * Admin paneli — GERÇEK TARAYICI sözleşmesi (2026-10-13).
 *
 * Neden gerekli: panel yenilemesi (11 sekme → 5 grup, kaydırılabilir kaynak
 * şeridi, kaydedilmemiş değişiklik uyarısı) o ana kadar yalnız jsdom testiyle
 * doğrulanmıştı; jsdom'da `ResizeObserver`/`scrollTo` stub'ı var, yani
 * "taşma var mı, ok nerede, tıklayınca kayıyor mu" sorusu SAHTE ölçülüyordu.
 * Bu spec gerçek Chromium'da ölçer.
 *
 * Oturum: `admin_session` cookie'si yerel `ADMIN_SECRET` ile burada imzalanır
 * (parola bilinmiyor, uydurulmaz; sır hiçbir yere yazılmaz/ekrana basılmaz).
 */

/** Playwright konfigi proje kokunden kosar (ESM: `__dirname` yok). */
const ROOT = process.cwd()

function envValue(key: string): string {
  const text = readFileSync(path.join(ROOT, '.env.local'), 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }
    const eq = line.indexOf('=')
    if (eq === -1) {
      continue
    }
    if (line.slice(0, eq).trim() === key) {
      return line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '')
    }
  }
  throw new Error(`${key} .env.local icinde bulunamadi`)
}

/** `username.expires.hmac` — src/lib/auth.ts createSessionToken ile ayni bicim. */
function adminSessionCookie() {
  const secret = envValue('ADMIN_SECRET')
  const admin = JSON.parse(
    readFileSync(path.join(ROOT, 'data/admin.json'), 'utf8'),
  ) as { username: string }
  const expires = Date.now() + 60 * 60 * 1000
  const payload = `${admin.username}.${expires}`
  const signature = createHmac('sha256', secret).update(payload).digest('hex')
  return {
    name: 'admin_session',
    value: `${payload}.${signature}`,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax' as const,
    expires: Math.floor(expires / 1000),
  }
}

/*
  GERÇEK sekme listesi (2026-10-30 ölçüldü): panel 7 sekmeye ayrıldı —
  eski 5'li gruplama ("Profil & Hakkımda", "İçerik & Veri", "Mesajlar &
  Kullanıcılar") bölündü. Liste uygulamadan birebir okunmalı; bir sekme
  eklenirse burada da güncellenir.
*/
const TAB_LABELS = [
  'Genel Bakış',
  'Profil',
  'Sayfa Düzenle',
  'Şifre & Güvenlik',
  'Site Ayarları',
  'Veri Yönetimi',
  'Kullanıcılar',
]

/** Konsol gürültüsü: ağ/favicon kaynaklı, uygulama hatası olmayan kalıplar. */
const IGNORED_CONSOLE = [
  /favicon/i,
  /Failed to load resource/i,
  /Download the React DevTools/i,
  /ERR_INVALID_HTTP_RESPONSE/,
]

test.beforeEach(async ({ context }) => {
  // Dil SABİT: sekme/bölüm adları Türkçe doğrulanıyor; Playwright varsayılanı
  // en-US olduğu için site İngilizce metin döndürürse testler boşa düşer.
  await context.addCookies([
    adminSessionCookie(),
    { name: 'site-locale', value: 'tr', domain: 'localhost', path: '/' },
  ])
})

/** Sayfayı açar, konsol/sayfa hatalarını toplar, panelin geldiğini doğrular. */
async function openAdmin(page: import('@playwright/test').Page) {
  const problems: string[] = []
  page.on('console', (msg) => {
    if (msg.type() !== 'error') {
      return
    }
    const text = msg.text()
    if (!IGNORED_CONSOLE.some(re => re.test(text))) {
      problems.push(`console.error: ${text}`)
    }
  })
  page.on('pageerror', err => problems.push(`pageerror: ${err.message}`))

  await page.goto('/admin')
  /*
   * BEKLEME SÜRESİ 40 sn (2026-10-31 ölçüldü). `/admin` bir istemci kapısıdır:
   * önce `/api/admin/session`, sonra `/api/admin/content` çeker ve ancak ikisi
   * de dönünce h1 çizilir. `next dev` bu rotayı İLK istekte derler; tam pakette
   * onlarca worker aynı sunucuya yüklenince ilk derleme varsayılan 10 sn'lik
   * `expect` penceresini aşıyor → test "Yükleniyor…" ekranında düşüyordu
   * (kanıt: aynı spec tek başına 12/12 geçiyor, tam pakette 4 test kırmızı).
   * Yükleme ekranı bir hata değil, yavaşlık; süre tanınıyor — başlık hiç
   * gelmezse test yine ve aynı şekilde kırmızı olur.
   */
  await expect(
    page.getByRole('heading', { level: 1 }),
    '/admin paneli 40 sn içinde çizilmedi — kapı istekleri takılmış olabilir',
  ).toBeVisible({ timeout: 40_000 })
  return problems
}

/**
 * Sekmeye geçer ve SEÇİMİN GERÇEKTEN DEĞİŞTİĞİNİ doğrular (2026-10-31).
 *
 * Neden: sekme şeridi genişliğe göre kayıyor (`ScrollableTabs` +
 * `ResizeObserver`) ve tam pakette — 6 worker TEK dev sunucusuna yüklenirken —
 * tıklama ara sıra kayboluyordu: `Profil` tıklandıktan sonra "Genel Bakış"
 * hâlâ seçiliydi, panel metni hiç gelmiyordu, test "Profil Bilgileri yok"
 * diye düşüyordu. Aynı spec tek başına 12/12 geçtiği için bu bir yarış.
 * Tıklama, `aria-selected` değişene kadar en fazla 3 kez tekrarlanır; sekme
 * gerçekten bozuksa test son denemede net mesajla yine kırmızı olur.
 */
async function switchTab(page: import('@playwright/test').Page, name: string, exact = true) {
  const tab = page.getByRole('tab', { name, exact }).first()
  for (let deneme = 1; deneme <= 3; deneme++) {
    await tab.click()
    try {
      await expect(tab, `"${name}" sekmesi seçilemedi`).toHaveAttribute('aria-selected', 'true', { timeout: 3000 })
      return
    }
    catch {
      // Tıklama sekme şeridinin yeniden yerleşmesi sırasında kayboldu → tekrar dene.
    }
  }
  await expect(tab, `"${name}" sekmesi 3 denemede seçilemedi`).toHaveAttribute('aria-selected', 'true')
}

test('baslik ana sayfa basliklariyla ayni bicimde cizilir', async ({ page }) => {
  await openAdmin(page)

  const h1 = page.getByRole('heading', { level: 1 })
  await expect(h1).toContainText('ADMİN PANELİ')

  const cls = await h1.evaluate(el => el.className)
  expect(cls, 'mavi alt cizgi (border-primary) yok').toContain('border-primary')
  expect(cls, 'buyuk harf (uppercase) yok').toContain('uppercase')
})

test('tam olarak 7 sekme var ve gelistirme fazi adi kalmadi', async ({ page }) => {
  await openAdmin(page)

  const tabs = page.getByRole('tab')
  await expect(tabs).toHaveCount(TAB_LABELS.length)
  expect(await tabs.allInnerTexts()).toEqual(TAB_LABELS)
  // `innerText` burada doğru API: görünür metni (DOM'da çizilmiş) arar;
  // Playwright'ın locator'ı olmadığı için unicorn kuralı susturulur.
  // eslint-disable-next-line unicorn/prefer-dom-node-text-content
  expect(await page.locator('body').innerText()).not.toMatch(/Faz\s*6|phase6/i)
})

test('her sekme acilir ve kendi bolumlerini gosterir', async ({ page }) => {
  await openAdmin(page)

  /*
    Genel Bakış VARSAYILAN sekmedir ve kartları veri çekildikten sonra çizilir
    (2026-10-30 ölçümü: masaüstü ~1.8s, mobil ~2.3s). Sekmeyi yeniden
    tıklamak yükleme durumunu tazelediği için liste döngüsüne SOKULMAZ;
    burada bir kez beklenir.
  */
  await expect(
    page.getByText('Yetenekler', { exact: false }).first(),
    '"Genel Bakış" kartlari gelmedi',
  ).toBeVisible({ timeout: 30_000 })

  const expectations: Array<{ tab: string, texts: string[] }> = [
    { tab: 'Profil', texts: ['Profil Bilgileri', 'Hakkımda Sayfası (/about)'] },
    { tab: 'Sayfa Düzenle', texts: ['Bölüm Başlıkları', 'CV (Özgeçmiş)'] },
    { tab: 'Şifre & Güvenlik', texts: ['Şifre Değiştir', 'Güvenlik İpuçları'] },
    { tab: 'Site Ayarları', texts: ['Hero (Ana Ekran)', 'Sosyal Medya'] },
    { tab: 'Veri Yönetimi', texts: ['Veri Yönetimi (Tablolar)'] },
    { tab: 'Kullanıcılar', texts: ['Kullanıcı Yönetimi'] },
  ]

  for (const { tab, texts } of expectations) {
    await switchTab(page, tab, false)
    for (const text of texts) {
      await expect(
        page.getByText(text, { exact: false }).first(),
        `"${tab}" sekmesinde "${text}" gorunmuyor`,
      ).toBeVisible()
    }
  }
})

test('kaynak seridi: oklar seritle ayni hizada, uclarda dogru durumda', async ({ page }) => {
  await openAdmin(page)
  await switchTab(page, 'Veri Yönetimi', false)

  // Kaynak seridi (DataManager) — sayfadaki 2. serit.
  const strips = page.locator('.admin-tabs-strip')
  await expect.poll(async () => strips.count()).toBeGreaterThan(1)
  const strip = strips.last()

  /*
   * Oklar sayfa genelinde ARANMAZ: mobilde ana sekme seridi de tasiyor, yani
   * 2 tane "Sağa kaydır" butonu olur (2026-10-13'te tam bu yüzden test
   * "strict mode violation" ile dustu). Bu yuzden ok, ait oldugu seridin
   * SATIRINDAN (`.admin-tabs-strip`in ebeveyni) alinir.
   */
  const row = strip.locator('xpath=..')
  const left = row.getByRole('button', { name: 'Sola kaydır' })
  const right = row.getByRole('button', { name: 'Sağa kaydır' })

  const measured = await strip.evaluate((el) => {
    const box = el as HTMLElement
    return {
      overflow: box.scrollWidth > box.clientWidth + 1,
      scrollLeft: box.scrollLeft,
    }
  })

  if (measured.overflow) {
    await expect(right).toBeVisible()
    // Baslangicta en solda: sol ok devre disi.
    await expect(left).toBeDisabled()

    await right.click()
    await expect
      .poll(async () => strip.evaluate(el => (el as HTMLElement).scrollLeft))
      .toBeGreaterThan(measured.scrollLeft)
    // Kaydirinca sol ok artik etkin olmali.
    await expect(left).toBeEnabled()
  }
  else {
    // Tasma yoksa oklar HIC render edilmez (tasarim karari).
    await expect(left).toHaveCount(0)
    await expect(right).toHaveCount(0)
  }
})

test('kaydedilmemis degisiklikte sekme degisimi onay ister', async ({ page }) => {
  await openAdmin(page)
  // Once profil sekmesine gec: orada duzenlenebilir alanlar var.
  await switchTab(page, 'Profil')
  await expect(page.getByText('Profil Bilgileri', { exact: false }).first()).toBeVisible()

  const input = page.locator('input[type="text"]:visible').first()
  await input.fill('Tarayici Testi')
  await input.blur()

  /*
    Kirli durumun İŞARETİ sabit kaydetme çubuğudur (SaveBar): `dirty` iken
    "Kaydet" + "İptal Et" ekranın altına yapışır. Onay penceresi ise native
    `window.confirm`'dir (admin-panel.tsx) — eski test burada sayfada geçen
    "Kaydedilmemiş değişiklikler var" METNİNİ arıyordu; o metin hiç DOM'a
    basılmaz, yalnız confirm iletişi olarak çıkar (2026-10-30 ölçüldü).
  */
  await expect(page.getByRole('button', { name: 'Kaydet', exact: true }).first()).toBeVisible()

  const dialogs: string[] = []
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message())
    await dialog.dismiss() // "Kal" secenegi
  })

  await page.getByRole('tab', { name: 'Genel Bakış', exact: true }).click()
  await expect.poll(() => dialogs.length).toBeGreaterThan(0)
  expect(dialogs[0], 'onay metni').toContain('Kaydedilmemiş değişiklikler var')
  // Reddedildi: eski sekme ekranda kalir.
  await expect(page.getByText('Profil Bilgileri', { exact: false }).first()).toBeVisible()
})

test('panel hicbir konsol hatasi uretmez', async ({ page }) => {
  const problems = await openAdmin(page)
  for (const tab of TAB_LABELS) {
    await page.getByRole('tab', { name: tab, exact: false }).click()
    await page.waitForTimeout(600)
  }
  expect(problems, problems.join('\n')).toEqual([])
})
