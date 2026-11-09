import type { APIRequestContext, Page } from '@playwright/test'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'

/**
 * SOHBET DÜZELTMELERİ — GERÇEK TARAYICI sözleşmesi (2026-10-13).
 *
 * Neden gerekli: bu turda düzeltilen 5 maddenin 4'ü SAF YERLEŞİM/ETKİLEŞİM
 * kusuru ve jsdom bunları SAHTE ölçer (`getBoundingClientRect` sıfır döner,
 * `dvh`/`env(safe-area-inset-*)`/`matchMedia` yoktur):
 *   · `fixed` menü kaydırılan bir atada gerçekten kırpılıyor mu,
 *   · kart 390px'de gerçekten ekranı kaplıyor mu (8px kenar),
 *   · sağ tık menüsü İMLECİN noktasında mı açılıyor, kenara taşınca içeri mi
 *     kayıyor,
 *   · 768px kırılma geçişinde seçili sohbet ve kaydırma konumu korunuyor mu.
 *
 * VERİ: gerçek oturum (`admin_session` yerel `ADMIN_SECRET` ile burada
 * imzalanır) + gerçek kişi listesi/sohbet özetleri.
 * YAZMA: yalnızca `/chat` sayfasını açmanın doğal yan etkisi (idempotent
 * `open` + presence nabzı). Mesaj fixture'ı kullanan son testte `POST /api/chat`
 * ve mesaj yükleme çağrıları TESTTE karşılanır → Supabase'e hiç yazılmaz.
 *
 * MASAÜSTÜ PROJESİNDE koşar; genişlikler test içinde `setViewportSize` ile
 * ayarlanır (390 / 900 / 1440).
 */

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

test.beforeEach(async ({ context }) => {
  // Genişlikler test içinde ayarlanır; mobil projede (isMobile + touch) ikinci
  // kez koşmasın.
  test.skip(test.info().project.name !== 'desktop', 'masaüstü projesinde koşar')
  await context.addCookies([
    adminSessionCookie(),
    /*
      Dil SABİT (2026-10-30): site tarayıcı diline göre çeviriyor; Playwright
      varsayılanı en-US olduğu için menü etiketleri İngilizce gelip Türkçe
      metin bekleyen 6 test boşa düşüyordu. Gerçek kullanıcı da dili seçince
      bu cerez yazılır.
    */
    { name: 'site-locale', value: 'tr', domain: 'localhost', path: '/' },
  ])
})

/** Sunucu daha fazla alan döner; bileşenin kullandıkları yeter. */
interface PeerLite { id: string, username: string, fullName: string | null, nickname: string | null }
interface ConvLite {
  id: string
  direct_key: string | null
  last_preview: string | null
  last_sender_name: string | null
}
interface ChatData { users: PeerLite[], chatId: string, conversations: ConvLite[] }

/**
 * Tek istek; AĞ düzeyinde kopmada (`ECONNRESET` vb.) BİR kez tekrar (2026-10-31).
 *
 * Neden: paket tek bir `next dev` sunucusuna bağlanıyor ve rota ilk kez
 * derlenirken eşzamanlı isteklerde sunucu bağlantıyı sıfırlayabiliyor. Ölçüm:
 * tam pakette `/api/chat` `read ECONNRESET` döndü, aynı test tek başına geçti.
 * Yalnızca AĞ hatasında tekrar denenir; 4xx/5xx YANITI tekrar denenmez, yoksa
 * gerçek bir hata maskelenir.
 */
async function getJson(ctx: APIRequestContext, url: string) {
  for (let deneme = 0; ; deneme++) {
    try {
      return await ctx.get(url)
    }
    catch (err) {
      const mesaj = String((err as Error).message)
      const agHatasi = /ECONNRESET|ECONNREFUSED|socket hang up/i.test(mesaj)
      if (deneme >= 1 || !agHatasi) {
        throw err
      }
    }
  }
}

/** Kişi listesi + sohbet özetleri — tarayıcı bağlamının çerezleriyle. */
async function chatData(ctx: APIRequestContext): Promise<ChatData> {
  const [usersRes, convsRes] = await Promise.all([
    getJson(ctx, '/api/chat/users'),
    getJson(ctx, '/api/chat'),
  ])
  const usersJson = (await usersRes.json()) as { users?: PeerLite[], chatId?: string }
  const convsJson = (await convsRes.json()) as { conversations?: ConvLite[] }
  return {
    users: usersJson.users ?? [],
    chatId: usersJson.chatId ?? '',
    conversations: convsJson.conversations ?? [],
  }
}

/** Listede ve başlıkta görünen ad. */
function peerLabel(peer: PeerLite): string {
  return peer.nickname || peer.fullName || peer.username
}

/**
 * TIKLANACAK satırlar (2026-10-13 kullanıcı kuralı): hiç sohbeti olmayan kayıt
 * listelenmez; kendi satırım bu yardımcıdan HARİÇ — testler tıklayacak bir
 * KARŞI taraf arıyor (kendi satırım ayrı testte doğrulanır). Panelde görünen
 * toplam satır = `panelPeers(data).length + 1`.
 */
function panelPeers(data: ChatData): PeerLite[] {
  return data.users.filter(u =>
    u.id !== data.chatId
    && data.conversations.some(c => (c.direct_key ?? '').split('|').includes(u.id)),
  )
}

function card(page: Page) {
  return page.locator('[data-testid="chat-slot"] > div')
}
function listPanel(page: Page) {
  return page.locator('[data-testid="chat-slot"] aside')
}
function threadPanel(page: Page) {
  return page.locator('[data-testid="chat-slot"] section')
}
function scroller(page: Page) {
  return page.locator('[data-testid="chat-slot"] section .overflow-y-auto').first()
}

async function openChat(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })
  await page.goto('/chat')
  // Gerçek `/api/chat/users` listesi gelene kadar bekle.
  await expect(page.locator('button[data-peer-id]').first()).toBeVisible({ timeout: 20_000 })
}

/* ────────────────────────────────────────────────────────────────────────────
   MADDE 1 — kişi listesi önizlemesi SON MESAJI GÖNDERENİ gösterir
   ──────────────────────────────────────────────────────────────────────────── */
test('kişi listesi önizlemesi göndereni gösterir; sohbetsiz kayıt listelenmez', async ({ page, context }) => {
  /*
    FİKSTÜR (2026-10-13): canlı veride önizlemeli sohbet HER ZAMAN olmayabilir —
    ölçüldü: karşı tarafla sohbetin mesajları silinmişti (`last_preview: null`)
    ve bu test "veriye bağlı" diye kırmızıya düştü. Önizleme artık YANITTA
    eklenir: kişiler, sohbetler ve mesaj durumu GERÇEK kalır, Supabase'e hiç
    yazılmaz (dosyadaki son testin de yaptığı gibi). Gönderen KASITLI olarak
    BEN'im — eski hata, satırın önizlemesinde KARŞI TARAFIN adını yazmasıydı.
  */
  const base = await chatData(context.request)
  const me = base.chatId
  const meUser = base.users.find(u => u.id === me)
  const target = base.conversations.find(
    c => (c.direct_key ?? '').split('|').some(part => part && part !== me),
  )
  expect(meUser, 'kendi kaydım listede yok — bu test veriye bağlı').toBeTruthy()
  expect(target, 'karşı tarafla sohbet yok — bu test veriye bağlı').toBeTruthy()

  const PREVIEW = 'e2e önizleme 👋'
  const LABEL = `@${meUser!.username} · ${PREVIEW}`
  await page.route('**/api/chat', async (route) => {
    if (route.request().method() !== 'GET') {
      return route.continue()
    }
    const res = await route.fetch()
    const json = (await res.json()) as { conversations?: ConvLite[] }
    await route.fulfill({
      response: res,
      json: {
        ...json,
        conversations: (json.conversations ?? []).map(c =>
          c.id === target!.id
            ? { ...c, last_preview: PREVIEW, last_sender_name: meUser!.username }
            : c),
      },
    })
  })

  await openChat(page, 1440, 900)
  const data = await chatData(context.request)

  const peerId = (target!.direct_key ?? '').split('|').find(part => part && part !== me)!
  const peer = data.users.find(u => u.id === peerId)
  expect(peer, 'sohbetin karşı tarafı kişi listesinde yok').toBeTruthy()

  const row = page.locator(`button[data-peer-id="${peerId}"]`)
  await expect(row).toContainText(LABEL)
  // Eski hata: satır KARŞI TARAFIN adını yazıyordu.
  await expect(row).not.toContainText(`@${peer!.username} ·`)

  /*
    HİÇ SOHBETİ OLMAYAN KAYIT LİSTELENMEZ (2026-10-13 kullanıcı isteği:
    "grupta yer almayıp sadece benimle konuşabilen kişi gözükmesin"). Eski
    hâlde satır vardı ve "Henüz mesaj yok…" yazıyordu.

    KENDİ SATIRIM (aynı gün, SON istek: "admin kendisini görsün kendisiyle
    konuşa bilsin ama ismi TARIK ELER TARNAK (Siz) görünsün") artık YÖNETİCİDE
    görünür — o yüzden aşağıdaki satır sayısı `+1`. Etiketi ve tıklanması ayrı
    testte doğrulanır. Normal kullanıcıda kendi satırı yine hiç görünmez.
  */
  const withoutConv = data.users.filter(
    u => u.id !== me && !data.conversations.some(c => (c.direct_key ?? '').split('|').includes(u.id)),
  )
  for (const u of withoutConv) {
    await expect(page.locator(`button[data-peer-id="${u.id}"]`)).toHaveCount(0)
  }
  // Panelde sohbeti olan kişiler + kendi satırım (yalnız yöneticiye görünür).
  await expect(page.locator('button[data-peer-id]')).toHaveCount(panelPeers(data).length + 1)
})

/* ────────────────────────────────────────────────────────────────────────────
   KENDİ SATIRIM (2026-10-13, son kullanıcı isteği)
   ──────────────────────────────────────────────────────────────────────────── */
test('kendi satırım tam adımla + "(Siz)" ekiyle görünür ve kendimle sohbet açılır', async ({ page, context }) => {
  await openChat(page, 1440, 900)
  const data = await chatData(context.request)

  const me = data.users.find(u => u.id === data.chatId)
  expect(me, 'kendi kaydım listede yok — bu test veriye bağlı').toBeTruthy()

  const selfRow = page.locator(`button[data-peer-id="${data.chatId}"]`)
  await expect(selfRow).toHaveCount(1)
  // TAKMA ADIM değil ORJİNAL adım (profil tam adı) + dile göre ek.
  await expect(selfRow).toContainText(me!.fullName || me!.username)
  await expect(selfRow).toContainText(/\((Siz|You)\)/)
  if (me!.nickname) {
    await expect(selfRow, 'takma adım gösterilmemeli').not.toContainText(me!.nickname)
  }

  // Kendisiyle KONUŞABİLİR: satır tıklanınca sohbet açılır, başlık aynı etiketi
  // gösterir ve mesaj alanı görünür (sunucu `<id>|<id>` sohbetini destekler).
  await selfRow.click()
  const header = threadPanel(page).locator('div[data-peer-id]').first()
  await expect(header).toContainText(me!.fullName || me!.username)
  await expect(header).toContainText(/\((Siz|You)\)/)
  await expect(scroller(page)).toBeVisible()
})

/* ────────────────────────────────────────────────────────────────────────────
   MADDE 3 — masaüstünde ESKİ geometri korunur (regresyon)
   ──────────────────────────────────────────────────────────────────────────── */
test('masaüstü 1440px: kart 11rem payı ve iki panel yan yana', async ({ page }) => {
  await openChat(page, 1440, 900)

  const box = (await card(page).boundingBox())!
  // Üst: TopBar payı 56 + pt-20 80 + pt-2 8 = 144. Yükseklik: 100svh - 11rem.
  expect(Math.round(box.y)).toBe(144)
  expect(Math.round(box.height)).toBe(900 - 176)
  // Yatay: `Section` xl'de px-0 → boşluğu slot verir (16px).
  expect(Math.round(box.x)).toBe(16)
  expect(Math.round(box.width)).toBe(1440 - 32)

  await expect(listPanel(page)).toBeVisible()
  await expect(threadPanel(page)).toBeVisible()
  const list = (await listPanel(page).boundingBox())!
  const thread = (await threadPanel(page).boundingBox())!
  expect(list.x + list.width).toBeLessThanOrEqual(thread.x + 1)
})

/* ────────────────────────────────────────────────────────────────────────────
   MADDE 2 — 768px kırılma noktası: tablette liste paneli KAYBOLMAZ
   ──────────────────────────────────────────────────────────────────────────── */
test('tablet 900px: iki panel yan yana kalır', async ({ page }) => {
  await openChat(page, 900, 800)

  const box = (await card(page).boundingBox())!
  expect(Math.round(box.y)).toBe(144)
  expect(Math.round(box.height)).toBe(800 - 176)
  expect(Math.round(box.x)).toBe(48) // Section px-8 + slot px-4
  expect(Math.round(box.width)).toBe(900 - 96)

  await expect(listPanel(page)).toBeVisible()
  await expect(threadPanel(page)).toBeVisible()
  const list = (await listPanel(page).boundingBox())!
  const thread = (await threadPanel(page).boundingBox())!
  expect(list.width).toBeGreaterThan(200)
  expect(thread!.x).toBeGreaterThanOrEqual(list.x + list.width - 1)
})

/* ────────────────────────────────────────────────────────────────────────────
   MADDE 3 + 2 — mobil: kart tam ekran (8px kenar), İKİ PANEL yan yana
   (2026-10-13 SON istek: "tam ekran liste görünümü tamamen kaldırılsın")
   ──────────────────────────────────────────────────────────────────────────── */
test('mobil 390px: kart tam ekran + 8px kenar; liste ve sohbet YAN YANA', async ({ page, context }) => {
  await openChat(page, 390, 780)
  const data = await chatData(context.request)
  const peer = panelPeers(data)[0]

  const before = (await card(page).boundingBox())!
  // Tam genişlik/yükseklik, kenar boşluğu 8px (istenen üst sınır 8–12px).
  expect(Math.round(before.x)).toBe(8)
  expect(Math.round(390 - (before.x + before.width))).toBe(8)
  expect(Math.round(before.y)).toBe(64) // TopBar payı 56 + 8
  expect(Math.round(780 - (before.y + before.height))).toBe(8)

  // İKİ PANEL AYNI ANDA: 480px altında liste OTOMATİK KOMPAKT (72px, istek 3),
  // sohbet alanı kalan genişliği alır ve görünür kalır.
  await expect(listPanel(page)).toBeVisible()
  await expect(threadPanel(page)).toBeVisible()
  /*
    Genişlik GEÇİŞLİ (200ms). Anlık `boundingBox()` animasyonun ortasını
    ölçüyordu (72 beklenirken 140/195 okundu — 2026-10-30'da yaşandı).
    `expect.poll` geçiş oturana kadar bekler.
  */
  await expect.poll(async () => Math.round((await listPanel(page).boundingBox())!.width)).toBe(72)
  const compact = (await listPanel(page).boundingBox())!
  // Arama kutusu ve isim/son mesaj blokları kompakt modda GİZLİ (istek 3).
  // ⚠️ `span[title]` DEĞİL: çevrimiçi/çevrimdışı noktası da `title` taşır ve
  // kompakt modda avatarın üstünde kalır (2026-10-30'da ölçüldü) — burada
  // aranan, isim/son mesaj sarmalayıcısının yokluğudur.
  await expect(listPanel(page).locator('input[type="search"]')).toBeHidden()
  await expect(listPanel(page).locator('span.min-w-0')).toHaveCount(0)

  // Kişiye tıkla → sohbet SAĞDA açılır; liste KAPANMAZ (istek 5), geometri aynı.
  await page.locator(`button[data-peer-id="${peer.id}"]`).click()
  await expect(threadPanel(page).locator('div').first()).toContainText(peerLabel(peer))
  await expect(listPanel(page)).toBeVisible()
  const after = (await card(page).boundingBox())!
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(Math.round(after[key]), key).toBe(Math.round(before[key]))
  }

  // Yazma alanı altta ve KARTIN İÇİNDE (klavye açılınca kart `dvh` ile küçülür).
  const composer = (await page.locator('[data-testid="chat-slot"] .chat-composer-field').first().boundingBox())!
  expect(composer.y + composer.height).toBeLessThanOrEqual(after.y + after.height)
  expect(composer.y + composer.height).toBeLessThanOrEqual(780)

  /*
    HAMBURGER → liste GENİŞLER (tam ekran kaplama DEĞİL): kayıtlı genişlik
    (288px) kartın %55'iyle sınırlanır → 390px'te ~205px; sohbet alanı yanında
    durmaya devam eder. (2026-10-30: eski beklenti `28vw` = 109px idi; panel o
    genişlikte isim/son mesajı sığdıramıyordu. sınır artık kartın oranı.)
  */
  await page.locator('[data-testid="chat-panel-toggle"]').click()
  await expect(listPanel(page).locator('input[type="search"]')).toBeVisible()
  const expectedWide = 0.55 * after.width
  const wide = await (async () => {
    // Genişlik animasyonu otursun (bkz. yukarıdaki aynı not).
    await expect.poll(async () => Math.abs((await listPanel(page).boundingBox())!.width - expectedWide))
      .toBeLessThanOrEqual(2)
    return (await listPanel(page).boundingBox())!
  })()
  expect(Math.abs(wide.width - expectedWide), 'kart genişliğinin %55 sınırı').toBeLessThanOrEqual(2)
  expect(Math.round(wide.width)).toBeGreaterThan(Math.round(compact.width))
  const thread = (await threadPanel(page).boundingBox())!
  // Yan yana: sohbet alanı listenin SAĞINDAN başlar, ikisi kartı aşmaz.
  expect(Math.round(thread.x)).toBeGreaterThanOrEqual(Math.round(wide.x + wide.width))
  expect(Math.round(thread.x + thread.width)).toBeLessThanOrEqual(Math.round(after.x + after.width))
  // Tam ekran kaplama YOK: liste kartın tamamını kaplamaz.
  expect(Math.round(wide.width)).toBeLessThan(Math.round(after.width))

  // Hamburger geri → KOMPAKT; seçili sohbet korunur (eski hâlde siliniyordu).
  await page.locator('[data-testid="chat-panel-toggle"]').click()
  await expect(listPanel(page).locator('input[type="search"]')).toBeHidden()
  await expect(threadPanel(page).locator('div').first()).toContainText(peerLabel(peer))

  // Seçim LOCALSTORAGE'da hatırlanır (istek 4): yeniden yüklemede kompakt kalır.
  await expect.poll(() => page.evaluate(() => localStorage.getItem('chat-panel-open'))).toBe('0')
})

/* ────────────────────────────────────────────────────────────────────────────
   MADDE 2 — pencere yeniden boyutlandırılınca seçim korunur
   ──────────────────────────────────────────────────────────────────────────── */
test('boyut değişimi: seçili sohbet ve mesaj alanı korunur', async ({ page, context }) => {
  await openChat(page, 390, 780)
  const data = await chatData(context.request)
  const peer = panelPeers(data)[0]

  await page.locator(`button[data-peer-id="${peer.id}"]`).click()
  await expect(threadPanel(page).locator('div').first()).toContainText(peerLabel(peer))
  await expect(scroller(page)).toBeVisible()

  // İki panel HER genişlikte durur (2026-10-13: kaplama kaldırıldı); boyut
  // değişimi seçimi ve kaydırma kabını bozmaz.
  const listW = async () => Math.round((await listPanel(page).boundingBox())!.width)
  const at390 = await listW()

  await page.setViewportSize({ width: 900, height: 800 })
  await expect(listPanel(page)).toBeVisible()
  await expect(threadPanel(page).locator('div').first()).toContainText(peerLabel(peer))
  await expect(scroller(page)).toBeVisible()

  await page.setViewportSize({ width: 390, height: 780 })
  await expect(listPanel(page)).toBeVisible()
  await expect(threadPanel(page).locator('div').first()).toContainText(peerLabel(peer))
  // Seçim korunur; dar ekranda liste otomatik KOMPAKT genişliğe döner.
  expect(await listW()).toBe(at390)
})

/* ────────────────────────────────────────────────────────────────────────────
   MADDE 4 — kişi menüsü: imleç konumu, taşma, kapatma, klavye
   ──────────────────────────────────────────────────────────────────────────── */
test('kişi menüsü imleçte açılır, ekrana sığar, kapatılır ve klavyeyle gezilir', async ({ page }) => {
  await openChat(page, 1440, 900)
  const row = page.locator('button[data-peer-id]').first()
  const box = (await row.boundingBox())!
  const px = Math.round(box.x + box.width - 4) // satırın SAĞ ucuna yakın
  const py = Math.round(box.y + box.height / 2)

  await page.mouse.click(px, py, { button: 'right' })
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  const mb = (await menu.boundingBox())!

  // Sağ kenardan taşınca SOLA kayar; tamamı ekranın içinde kalır (kırpılmaz).
  expect(mb.x + mb.width).toBeLessThanOrEqual(1440)
  expect(mb.y + mb.height).toBeLessThanOrEqual(900)
  expect(mb.height).toBeGreaterThan(200)
  /*
    KIRPILMA REGRESYONU: menü kaydırılan listenin DIŞINA taşar. Eskiden öğenin
    İÇİNDE `absolute` konumluydu ve listenin `overflow-y-auto`'su tarafından
    kesiliyordu → menü yarım görünüyordu.
  */
  const listBox = (await listPanel(page).boundingBox())!
  expect(mb.x + mb.width).toBeGreaterThan(listBox.x + listBox.width)

  // Kullanıcının istediği maddeler.
  for (const label of [
    'Profilini incele',
    'Takma ad koy',
    'Favorilere ekle',
    'Önemli kişi olarak işaretle',
    'Engelle',
    'Sohbeti temizle',
    'Sohbeti sil',
  ]) {
    await expect(menu.getByText(label, { exact: true })).toBeVisible()
  }

  // "Sohbeti sil" KIRMIZI ve ayrı vurgulu. (Chromium oklch'yi `lab(...)`
  // döndürdüğü için sabit `rgb()` beklentisi kırılgan; jetonu ve komşusundan
  // FARKLI rengi ölçüyoruz.)
  const colorOf = (label: string) =>
    menu.getByText(label, { exact: true }).evaluate(el => getComputedStyle(el.closest('button')!).color)
  expect(await menu.getByText('Sohbeti sil', { exact: true })
    .evaluate(el => el.closest('button')!.className)).toContain('text-red-500')
  expect(await colorOf('Sohbeti sil')).not.toBe(await colorOf('Sohbeti temizle'))

  // Klavye: açılışta ilk madde odaklı, ok tuşu ilerletir (metin ikonu da içerir).
  expect(await page.evaluate(() => document.activeElement?.textContent?.trim()))
    .toContain('Profilini incele')
  await page.keyboard.press('ArrowDown')
  expect(await page.evaluate(() => document.activeElement?.textContent?.trim()))
    .toContain('Takma ad koy')

  // Esc kapatır.
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()

  // Yeniden aç → dışarı tıklama kapatır.
  await page.mouse.click(px, py, { button: 'right' })
  await expect(menu).toBeVisible()
  await page.mouse.click(20, 890)
  await expect(menu).toBeHidden()

  // Yeniden aç → "Takma ad koy" menüyü KAPATMAZ, içinde form açar.
  await page.mouse.click(px, py, { button: 'right' })
  await menu.getByText('Takma ad koy', { exact: true }).click()
  await expect(menu).toBeVisible()
  await expect(menu.getByPlaceholder('Takma ad')).toBeVisible()
})

/* ────────────────────────────────────────────────────────────────────────────
   MADDE 4 — mobilde uzun basma aynı menüyü açar (sağ tık yok)
   ──────────────────────────────────────────────────────────────────────────── */
test('mobilde uzun basma kişi menüsünü açar (sohbeti açmadan)', async ({ page }) => {
  await openChat(page, 390, 780)
  const row = page.locator('button[data-peer-id]').first()
  const box = (await row.boundingBox())!

  // Parmakla uzun basma: `dispatchEvent` bazı sürümlerde `pointerType`'ı
  // taşımıyor → olayı sayfada AÇIKÇA `PointerEvent` olarak kur (yine gerçek
  // tarayıcı olayı, hidrasyon dahil).
  await row.evaluate((el, [x, y]) => {
    el.dispatchEvent(new PointerEvent('pointerdown', {
      pointerType: 'touch',
      clientX: x,
      clientY: y,
      isPrimary: true,
      bubbles: true,
    }))
  }, [box.x + 40, box.y + 20])

  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible({ timeout: 3_000 })
  // Uzun basma satırı SEÇMEZ: hiçbir kişi seçili olmaz (başlıkta `data-peer-id`
  // taşıyan öğe yok) ve liste ile sohbet paneli yerinde durur.
  await expect(listPanel(page)).toBeVisible()
  await expect(threadPanel(page)).toBeVisible()
  await expect(page.locator('[data-testid="chat-slot"] div[data-peer-id]')).toHaveCount(0)
  const mb = (await menu.boundingBox())!
  expect(mb.x + mb.width).toBeLessThanOrEqual(390)
  expect(mb.y + mb.height).toBeLessThanOrEqual(780)
})

/* ────────────────────────────────────────────────────────────────────────────
   MADDE 5 — mesaj menüsü + gönderen satırı + gruplama + İLET
   Mesajlar ve POST'lar TESTTE karşılanır → Supabase'e yazılmaz.
   ──────────────────────────────────────────────────────────────────────────── */
test('mesaj menüsü imleçte; gönderen satırı gruplanır; İlet hedefe gönderir', async ({ page, context }) => {
  const data = await chatData(context.request)
  const me = data.chatId
  const peer = panelPeers(data)[0]
  expect(peer, 'karşı taraf bulunamadı').toBeTruthy()
  const peerId = peer!.id

  const posted: Array<Record<string, unknown>> = []
  const FIXTURE = Array.from({ length: 24 }, (_, i) => ({
    id: `f-${i}`,
    conversation_id: 'e2e-conv',
    // ilk iki mesaj AYNI gönderenden (gruplama), kalanı ben.
    sender_id: i < 2 ? peerId : me,
    sender_name: i < 2 ? 'e2e-karsi' : 'e2e-ben',
    text: `fixture ${i}`,
    kind: 'text',
    file_url: null,
    file_name: null,
    file_type: null,
    file_size: null,
    audio_duration: null,
    reply_to_id: null,
    delivered_at: new Date().toISOString(),
    read_at: null,
    pinned: false,
    pinned_at: null,
    deleted_for_all: false,
    deleted_by: null,
    deleted_at: null,
    created_at: new Date(Date.now() - (24 - i) * 60_000).toISOString(),
  }))

  await page.route(
    url => url.pathname === '/api/chat',
    async (route) => {
      const req = route.request()
      if (req.method() === 'POST') {
        posted.push(req.postDataJSON() as Record<string, unknown>)
        await route.fulfill({ json: { success: true, conversation: { id: 'e2e-conv' } } })
        return
      }
      if (req.url().includes('conversationId=')) {
        await route.fulfill({ json: { success: true, messages: FIXTURE } })
        return
      }
      await route.continue() // sohbet özetleri gerçek
    },
  )

  await openChat(page, 1440, 900)
  await page.locator(`button[data-peer-id="${peerId}"]`).click()

  const bubbles = page.locator('[data-message-id]')
  await expect(bubbles).toHaveCount(24)

  /*
    GÖNDEREN SATIRI balonun ÜSTÜNDE; art arda aynı gönderende TEKRARLANMAZ
    (2 fixture mesajına rağmen 1 satır) ve kendi mesajımda gösterilmez.
  */
  const senderRows = page.getByText(/^@e2e-karsi$/)
  await expect(senderRows).toHaveCount(1)
  await expect(page.getByText(/^@e2e-ben$/)).toHaveCount(0)
  const firstBubble = (await bubbles.first().boundingBox())!
  const senderBox = (await senderRows.first().boundingBox())!
  expect(senderBox.y + senderBox.height).toBeLessThanOrEqual(firstBubble.y + 1)

  // Karşı taraf SOLDA, benim mesajım SAĞDA ve tema renginde (mavi).
  const otherBox = (await bubbles.first().boundingBox())!
  const mineBox = (await bubbles.last().boundingBox())!
  expect(otherBox.x).toBeLessThan(mineBox.x)
  expect(await bubbles.last().getAttribute('class')).toContain('bg-primary')

  // Sağ tık → menü İMLECİN konumunda (eskiden tam ekran ortalanmış diyalogdu).
  // İlk balon 24 mesajla yukarı taştığı için önce görünür alana kaydırılır
  // (aksi hâlde tıklama ekran dışına düşer).
  await bubbles.first().scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const otherNow = (await bubbles.first().boundingBox())!
  const px = Math.round(otherNow.x + 30)
  const py = Math.round(otherNow.y + 10)
  await page.mouse.click(px, py, { button: 'right' })
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  const mb = (await menu.boundingBox())!
  expect(Math.abs(mb.x - px)).toBeLessThanOrEqual(2)
  expect(Math.abs(mb.y - py)).toBeLessThanOrEqual(2)
  // Ekranı karartan tam ekran arka plan YOK.
  await expect(page.locator('.bg-black\\/50')).toHaveCount(0)

  for (const label of ['Kopyala', 'Yanıtla', 'İlet', 'Sabitle', 'Mesaj bilgisi', 'Sil']) {
    await expect(menu.getByText(label, { exact: true })).toBeVisible()
  }
  // Sil kırmızı (jeton + komşusundan farklı renk; bkz. kişi menüsü notu).
  const msgColorOf = (label: string) =>
    menu.getByText(label, { exact: true }).evaluate(el => getComputedStyle(el.closest('button')!).color)
  expect(await menu.getByText('Sil', { exact: true })
    .evaluate(el => el.closest('button')!.className)).toContain('text-red-500')
  expect(await msgColorOf('Sil')).not.toBe(await msgColorOf('Kopyala'))

  // İLET → hedef seçici → seçilen kişiye gönderilir (POST open + POST send).
  await menu.getByText('İlet', { exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Kime iletilsin?')).toBeVisible()
  await dialog.locator('button', { hasText: `@${peer!.username}` }).first().click()
  await expect(dialog).toBeHidden()
  const send = posted.find(p => p.action === 'send')
  expect(send, 'POST send yapılmadı').toBeTruthy()
  expect(send!.text).toBe('fixture 0')
  expect(send!.conversationId).toBe('e2e-conv')

  // Sağ kenara yakın sağ tık → menü SOLA kayar ve ekrandan taşmaz (kendi
  // mesajım sağa yaslı olduğu için taşma gerçekten zorlanır).
  await bubbles.last().scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  const mineNow = (await bubbles.last().boundingBox())!
  const cx = Math.round(mineNow.x + mineNow.width - 4)
  const cy = Math.round(mineNow.y + 10)
  await page.mouse.click(cx, cy, { button: 'right' })
  await expect(menu).toBeVisible()
  const cm = (await menu.boundingBox())!
  expect(cm.x + cm.width).toBeLessThanOrEqual(1440)
  expect(cm.y + cm.height).toBeLessThanOrEqual(900)
  expect(cm.x).toBeLessThan(cx)
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()

  // KAYDIRMA KONUMU boyut değişiminde korunur (aynı DOM düğümü kalır).
  const sc = scroller(page)

  /*
    KONUM SÖZLEŞMESİ (2026-10-30, yük altında ölçülerek düzeltildi):
    daralmada metin YENİDEN SARILIR, içerik yüksekliği değişir; tarayıcının
    scroll-anchoring'i ekrandaki mesajı tutar ama `scrollTop` SAYISI kayar.
    Eski test sabit 32px tolerans koyuyordu → paralel koşuda (2 worker) 80px
    sapma ile YANLIŞ kırmızı üretti; oysa kullanıcıya görünen davranış
    doğruydu (aynı düğüm, aynı mesaj ekranda, konum ne 0'a ne en alta
    kaçmıyor). Bu yüzden ÖLÇÜLEN ŞEY sayı değil bu üç sözleşme.
  */
  const snap = () =>
    sc.evaluate((el) => {
      const box = el.getBoundingClientRect()
      const items = [...el.querySelectorAll('[data-message-id]')]
      const top = items.find(n => n.getBoundingClientRect().bottom > box.top + 1)
      return {
        scrollTop: Math.round(el.scrollTop),
        max: Math.round(el.scrollHeight - el.clientHeight),
        topId: top?.getAttribute('data-message-id') ?? null,
      }
    })
  /** Yeniden sarımdan sonra anchoring gecikmeli uygulanır → iki okuma aynı olana kadar bekle. */
  const settle = async () => {
    await page.waitForTimeout(400)
    let last = await snap()
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(150)
      const now = await snap()
      if (now.scrollTop === last.scrollTop) {
        return now
      }
      last = now
    }
    return last
  }

  await sc.evaluate(el => el.scrollTo({ top: 200 }))
  await expect.poll(() => sc.evaluate(el => el.scrollTop), { timeout: 5_000 }).toBeGreaterThanOrEqual(200)
  await sc.evaluate(el => el.setAttribute('data-e2e-scroller', 'stable'))
  const s0 = await settle()
  expect(s0.scrollTop).toBeGreaterThan(0)
  expect(s0.topId, 'tepede görünen mesaj bulunamadı').toBeTruthy()

  await page.setViewportSize({ width: 390, height: 780 })
  const s1 = await settle()

  // Aynı DOM düğümü: scroller yeniden mount edilmedi (işaret hâlâ üzerinde).
  await expect(page.locator('[data-e2e-scroller="stable"]'), 'scroller yeniden mount edilmemeli').toHaveCount(1)
  expect(s1.scrollTop, 'konum 0a kaçmamalı').toBeGreaterThan(0)
  expect(s1.scrollTop, 'konum en alta çakılmamalı').toBeLessThan(s1.max)
  /*
    ÖLÇÜM (2026-10-30, 2 worker + repeat-each=4, 4/4 koşu): 200 → 200, tepedeki
    mesaj f-3 sabit. Sapma payı yalnız yeniden sarımın birkaç satırı için.
  */
  expect(Math.abs(s1.scrollTop - s0.scrollTop), 'konum alta kaçmamalı').toBeLessThanOrEqual(32)
  // Baktığın mesaj daralmadan sonra da ekranda kalmalı (asıl kullanıcı sözleşmesi).
  await expect(
    sc.locator(`[data-message-id="${s0.topId}"]`),
    'baktığın mesaj daralmada ekranda kalmalı',
  ).toBeInViewport()

  await page.setViewportSize({ width: 1440, height: 900 })
  const s2 = await settle()

  expect(s2.scrollTop, 'geri dönünce konum 0a kaçmamalı').toBeGreaterThan(0)
  /*
    Genişliğe geri dönünce sarım da geri döner; ölçülen sapma 2026-10-30: 0px.
    Sabit tolerans yalnız gecikmeli yerleşim payı.
  */
  expect(Math.abs(s2.scrollTop - s0.scrollTop), 'geri dönünce konum korunur').toBeLessThanOrEqual(32)
  await expect(
    sc.locator(`[data-message-id="${s0.topId}"]`),
    'geri dönüşte de aynı mesaj ekranda',
  ).toBeInViewport()
})

/* ────────────────────────────────────────────────────────────────────────────
   MADDE 4 — "sohbet sayfasında kayma var, düzelt; grubun içinde olsun ama o
   sayfada olmasın": belge tam ekrana oturur, kaydırma MESAJ ALANINDA kalır.
   ──────────────────────────────────────────────────────────────────────────── */
test('sohbet sayfası kaymaz: belge tam ekrana oturur (her genişlikte)', async ({ page }) => {
  for (const [w, h] of [[1440, 900], [1024, 800], [900, 700], [768, 800], [390, 780], [360, 640]] as const) {
    await openChat(page, w, h)
    const m = await page.evaluate(() => ({
      docH: document.documentElement.scrollHeight,
      winH: window.innerHeight,
      docW: document.documentElement.scrollWidth,
      winW: window.innerWidth,
      scrollY: window.scrollY,
    }))
    /*
      ÖLÇÜLDÜ (düzeltmeden önce): kart sarmalayıcısındaki `min-h-screen` 56px'lik
      TopBar payının ALTINA tam bir ekran daha ekliyordu → belge her boyutta
      56px taşıyor ve sohbet sayfası kaydırılabiliyordu.
    */
    expect(m.docH, `${w}x${h} dikey taşma`).toBe(m.winH)
    expect(m.docW, `${w}x${h} yatay taşma`).toBe(m.winW)
    expect(m.scrollY, `${w}x${h} kaydırma konumu`).toBe(0)
  }
})

test('yeni mesaj SAYFAYI kaydırmaz: kaydırma mesaj alanının İÇİNDE kalır', async ({ page, context }) => {
  const data = await chatData(context.request)
  const peer = panelPeers(data)[0]
  expect(peer, 'karşı taraf bulunamadı').toBeTruthy()
  const me = data.chatId

  // Mesajlar ve POST'lar TESTTE karşılanır → Supabase'e yazılmaz.
  const FIXTURE = Array.from({ length: 30 }, (_, i) => ({
    id: `s-${i}`,
    conversation_id: 'e2e-scroll',
    sender_id: i % 2 === 0 ? peer!.id : me,
    sender_name: i % 2 === 0 ? 'e2e-karsi' : 'e2e-ben',
    text: `kaydirma ${i}`,
    kind: 'text',
    file_url: null,
    file_name: null,
    file_type: null,
    file_size: null,
    audio_duration: null,
    reply_to_id: null,
    delivered_at: new Date().toISOString(),
    read_at: null,
    pinned: false,
    pinned_at: null,
    deleted_for_all: false,
    deleted_by: null,
    deleted_at: null,
    created_at: new Date(Date.now() - (30 - i) * 60_000).toISOString(),
  }))

  await page.route(
    url => url.pathname === '/api/chat',
    async (route) => {
      const req = route.request()
      if (req.method() === 'POST') {
        await route.fulfill({ json: { success: true, conversation: { id: 'e2e-scroll' } } })
        return
      }
      if (req.url().includes('conversationId=')) {
        await route.fulfill({ json: { success: true, messages: FIXTURE } })
        return
      }
      await route.continue()
    },
  )

  await openChat(page, 1440, 900)
  await page.locator(`button[data-peer-id="${peer!.id}"]`).click()
  await expect(page.locator('[data-message-id]')).toHaveCount(30)
  await page.waitForTimeout(600) // otomatik kaydırma otursun

  // Mesaj alanı SONA kaydırılmış (otomatik kaydırma çalışıyor)...
  const sc = scroller(page)
  const gap = await sc.evaluate(el => el.scrollHeight - el.scrollTop - el.clientHeight)
  expect(gap, 'mesaj alanı sona kaydırılmadı').toBeLessThanOrEqual(4)
  // ...ama SAYFA oynamamış.
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  const m = await page.evaluate(() => ({
    docH: document.documentElement.scrollHeight,
    winH: window.innerHeight,
  }))
  expect(m.docH).toBe(m.winH)
})

/* ────────────────────────────────────────────────────────────────────────────
   MADDE 3 — tek "yan panel" düğmesi (eski "👥 kişi listesini aç" ve "←" gitti)
   ──────────────────────────────────────────────────────────────────────────── */
test('yan panel düğmesi listeyi genişletir/daraltır (kaplama yok)', async ({ page }) => {
  await openChat(page, 1440, 900)
  const toggle = page.locator('[data-testid="chat-panel-toggle"]')
  await expect(toggle).toBeVisible()
  await expect(listPanel(page)).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')

  const listW = async () => Math.round((await listPanel(page).boundingBox())!.width)
  const openW = await listW()
  const threadOpenW = (await threadPanel(page).boundingBox())!.width

  // Kapat → liste 72px kompakt; sohbet alanı GENİŞLER ama liste kaybolmaz.
  await toggle.click()
  await expect(listPanel(page).locator('input[type="search"]')).toBeHidden()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(listPanel(page)).toBeVisible()
  // 200ms genişlik geçişi: anlık ölçüm animasyonun ortasını görüyordu → poll.
  await expect.poll(listW).toBe(72)
  const threadCompactW = (await threadPanel(page).boundingBox())!.width
  expect(threadCompactW, 'kompaktken sohbet daha geniş olmalı').toBeGreaterThan(threadOpenW + 100)

  // Geri aç → aynı genişlik ve sohbet alanı eski hâline döner.
  await toggle.click()
  await expect(listPanel(page).locator('input[type="search"]')).toBeVisible()
  await expect.poll(listW).toBe(openW)
  expect(Math.abs((await threadPanel(page).boundingBox())!.width - threadOpenW)).toBeLessThanOrEqual(2)
})

/* ────────────────────────────────────────────────────────────────────────────
   MADDE 7 — seçili kişi satırı belli olur ("arka planı bir tık daha koyu")
   ──────────────────────────────────────────────────────────────────────────── */
test('seçili kişi satırı vurgulanır; seçimden önce vurgu yok', async ({ page, context }) => {
  await openChat(page, 1440, 900)
  const data = await chatData(context.request)
  const peer = panelPeers(data)[0]
  expect(peer, 'karşı taraf bulunamadı').toBeTruthy()
  const row = page.locator(`button[data-peer-id="${peer!.id}"]`)

  /*
    Otomatik açılma YOK: kural "yalnız kayıtlı TEK kişi varsa otomatik aç"
    (`peers.length !== 1` → çık). Bu veri kümesinde 2 kayıt var (ben + karşı
    taraf), yani satır seçimsiz başlar.
  */
  expect(data.users.length).toBeGreaterThan(1)
  expect(await row.getAttribute('class')).not.toContain('bg-primary/15')

  await row.click()
  await expect(threadPanel(page)).toBeVisible()
  const cls = (await row.getAttribute('class'))!
  expect(cls, 'seçili satır vurgusu').toContain('bg-primary/15')

  // Renk GERÇEKTEN uygulanıyor (şeffaf değil) ve kart zemininden farklı.
  const bg = await row.evaluate(el => getComputedStyle(el).backgroundColor)
  const cardBg = await card(page).evaluate(el => getComputedStyle(el).backgroundColor)
  expect(bg).not.toBe('rgba(0, 0, 0, 0)')
  expect(bg).not.toBe(cardBg)
})

/* ────────────────────────────────────────────────────────────────────────────
   MADDE 6 — boş alana sağ tık menüsü + sohbet başlığına sağ tık
   ──────────────────────────────────────────────────────────────────────────── */
test('boş alana sağ tık: "Kişi ara / Sohbeti yenile / En sona git"', async ({ page, context }) => {
  await openChat(page, 1440, 900)
  const data = await chatData(context.request)
  const peer = panelPeers(data)[0]
  expect(peer, 'karşı taraf bulunamadı').toBeTruthy()

  // (1) KİŞİ LİSTESİNİN satırların ALTINDA kalan boş alanı.
  const list = (await listPanel(page).boundingBox())!
  await page.mouse.click(Math.round(list.x + 40), Math.round(list.y + list.height - 24), { button: 'right' })
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await expect(menu.getByText('Kişi ara', { exact: true })).toBeVisible()
  await expect(menu.getByText('Sohbeti yenile', { exact: true })).toBeVisible()
  // Sohbet açık değilken "En sona git" anlamsız → gösterilmez.
  await expect(menu.getByText('En sona git', { exact: true })).toHaveCount(0)
  // Kişi menüsü DEĞİL (satıra sağ tık ile karışmıyor).
  await expect(menu.getByText('Sohbeti sil', { exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()

  // (2) MESAJ ALANININ üst dolgu şeridi (balonların üstünde kalan boşluk).
  await page.locator(`button[data-peer-id="${peer!.id}"]`).click()
  await expect(threadPanel(page)).toBeVisible()
  const sc = (await scroller(page).boundingBox())!
  await page.mouse.click(Math.round(sc.x + 40), Math.round(sc.y + 6), { button: 'right' })
  await expect(menu).toBeVisible()
  await expect(menu.getByText('Kişi ara', { exact: true })).toBeVisible()
  await expect(menu.getByText('En sona git', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
})

test('sohbet başlığına (isme) sağ tık kişi menüsünü açar', async ({ page, context }) => {
  await openChat(page, 1440, 900)
  const data = await chatData(context.request)
  const peer = panelPeers(data)[0]
  expect(peer, 'karşı taraf bulunamadı').toBeTruthy()
  await page.locator(`button[data-peer-id="${peer!.id}"]`).click()
  await expect(threadPanel(page)).toBeVisible()

  // Başlık şeridi: `data-peer-id` taşıyan üst blok (ismin olduğu kısım).
  const header = threadPanel(page).locator('div[data-peer-id]').first()
  await expect(header).toBeVisible()
  await header.click({ button: 'right', position: { x: 140, y: 18 } })
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  // KİŞİ menüsü (boş alan menüsü değil).
  for (const label of ['Profilini incele', 'Takma ad koy', 'Sohbeti sil']) {
    await expect(menu.getByText(label, { exact: true })).toBeVisible()
  }
  await expect(menu.getByText('Kişi ara', { exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
})
