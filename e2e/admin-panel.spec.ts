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

const TAB_LABELS = [
  'Genel Bakış',
  'Profil & Hakkımda',
  'İçerik & Veri',
  'Site Ayarları',
  'Mesajlar & Kullanıcılar',
]

/** Konsol gürültüsü: ağ/favicon kaynaklı, uygulama hatası olmayan kalıplar. */
const IGNORED_CONSOLE = [
  /favicon/i,
  /Failed to load resource/i,
  /Download the React DevTools/i,
  /ERR_INVALID_HTTP_RESPONSE/,
]

test.beforeEach(async ({ context }) => {
  await context.addCookies([adminSessionCookie()])
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
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  return problems
}

test('baslik ana sayfa basliklariyla ayni bicimde cizilir', async ({ page }) => {
  await openAdmin(page)

  const h1 = page.getByRole('heading', { level: 1 })
  await expect(h1).toContainText('ADMİN PANELİ')

  const cls = await h1.evaluate(el => el.className)
  expect(cls, 'mavi alt cizgi (border-primary) yok').toContain('border-primary')
  expect(cls, 'buyuk harf (uppercase) yok').toContain('uppercase')
})

test('tam olarak 5 sekme var ve gelistirme fazi adi kalmadi', async ({ page }) => {
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

  const expectations: Array<{ tab: string, texts: string[] }> = [
    { tab: 'Genel Bakış', texts: ['Yetenekler'] },
    {
      tab: 'Profil & Hakkımda',
      texts: ['Profil Bilgileri', 'Bölüm Başlıkları'],
    },
    {
      tab: 'İçerik & Veri',
      texts: ['Ek Bölümler', 'Veri Yönetimi (Tablolar)'],
    },
    { tab: 'Site Ayarları', texts: ['Genel', 'Şifre Değiştir'] },
    { tab: 'Mesajlar & Kullanıcılar', texts: ['Kullanıcı Yönetimi'] },
  ]

  for (const { tab, texts } of expectations) {
    await page.getByRole('tab', { name: tab, exact: false }).click()
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
  await page.getByRole('tab', { name: 'İçerik & Veri', exact: false }).click()

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
  await page.getByRole('tab', { name: 'Profil & Hakkımda', exact: false }).click()
  await expect(page.getByText('Profil Bilgileri', { exact: false }).first()).toBeVisible()

  const input = page.locator('input[type="text"]:visible').first()
  await input.fill('Tarayici Testi')
  await input.blur()

  await expect(
    page.getByText('Kaydedilmemiş değişiklikler var', { exact: false }).first(),
  ).toBeVisible()

  const dialogs: string[] = []
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message())
    await dialog.dismiss() // "Kal" secenegi
  })

  await page.getByRole('tab', { name: 'Genel Bakış', exact: false }).click()
  await expect.poll(() => dialogs.length).toBeGreaterThan(0)
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
