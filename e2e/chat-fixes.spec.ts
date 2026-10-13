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
  await context.addCookies([adminSessionCookie()])
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

/** Kişi listesi + sohbet özetleri — tarayıcı bağlamının çerezleriyle. */
async function chatData(ctx: APIRequestContext): Promise<ChatData> {
  const [usersRes, convsRes] = await Promise.all([
    ctx.get('/api/chat/users'),
    ctx.get('/api/chat'),
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
test('kişi listesi önizlemesi göndereni gösterir; mesajsız satırda boş durum', async ({ page, context }) => {
  await openChat(page, 1440, 900)
  const data = await chatData(context.request)

  const me = data.chatId
  const conv = data.conversations.find(
    c => c.last_preview && (c.direct_key ?? '').split('|').some(part => part && part !== me),
  )
  expect(conv, 'önizlemeli sohbet yok — bu test veriye bağlı').toBeTruthy()

  const peerId = (conv!.direct_key ?? '').split('|').find(part => part && part !== me)!
  const peer = data.users.find(u => u.id === peerId)
  expect(peer, 'sohbetin karşı tarafı kişi listesinde yok').toBeTruthy()

  /*
    NEGATİF KONTROL: iddia yalnızca gönderen ≠ karşı taraf iken anlamlıdır.
    Bu veri kümesinde ölçüldü: sohbet `tarikelertr` ile, mesajı
    `tarikelertarnak` yazmış → eski kod "@tarikelertr · Merhaba 👋" diyordu.
  */
  expect(conv!.last_sender_name, 'veri iddiayı boşa çıkarıyor: gönderen = karşı taraf')
    .not
.toBe(peer!.username)

  const row = page.locator(`button[data-peer-id="${peerId}"]`)
  await expect(row).toContainText(`@${conv!.last_sender_name} · ${conv!.last_preview}`)
  // Eski hata: satır KARŞI TARAFIN adını yazıyordu.
  await expect(row).not.toContainText(`@${peer!.username} ·`)

  // Mesajsız kişi → "@ad" yerine boş durum metni.
  const withoutConv = data.users.filter(
    u => u.id !== me && !data.conversations.some(c => (c.direct_key ?? '').split('|').includes(u.id)),
  )
  if (withoutConv.length > 0) {
    await expect(page.locator(`button[data-peer-id="${withoutConv[0].id}"]`))
      .toContainText('Henüz mesaj yok. İlk mesajı sen yaz!')
  }
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
   MADDE 3 + 2 — mobil: kart tam ekran (8px kenar), tek panel, liste kaplaması
   ──────────────────────────────────────────────────────────────────────────── */
test('mobil 390px: kart tam ekran + 8px kenar; liste ↔ sohbet geçişi', async ({ page, context }) => {
  await openChat(page, 390, 780)
  const data = await chatData(context.request)
  const peer = data.users[0]

  const before = (await card(page).boundingBox())!
  // Tam genişlik/yükseklik, kenar boşluğu 8px (istenen üst sınır 8–12px).
  expect(Math.round(before.x)).toBe(8)
  expect(Math.round(390 - (before.x + before.width))).toBe(8)
  expect(Math.round(before.y)).toBe(64) // TopBar payı 56 + 8
  expect(Math.round(780 - (before.y + before.height))).toBe(8)

  // Tek panel: sohbet kapalıyken LİSTE görünür, sohbet alanı gizli (dar ekranda
  // ilk yüz kişi listesidir; kaynak: `!threadOpen && 'flex'`).
  await expect(listPanel(page)).toBeVisible()
  await expect(threadPanel(page)).toBeHidden()

  // Kişiye tıkla → sohbet açılır, liste gizlenir; GEOMETRİ DEĞİŞMEZ.
  await page.locator(`button[data-peer-id="${peer.id}"]`).click()
  await expect(threadPanel(page)).toBeVisible()
  await expect(listPanel(page)).toBeHidden()
  await expect(threadPanel(page).locator('div').first()).toContainText(peerLabel(peer))
  const after = (await card(page).boundingBox())!
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(Math.round(after[key]), key).toBe(Math.round(before[key]))
  }

  // Yazma alanı altta ve KARTIN İÇİNDE (klavye açılınca kart `dvh` ile küçülür).
  // Ölçüldü: yükseklik sınıfı olmadan 24 mesajda kaydırma kabı içerik boyuna
  // (1106px) çıkıp yazma alanını kartın dışına itiyordu (`overflow-hidden` ile
  // kırpılıyordu) → kartın sabit `dvh` yüksekliği bu yüzden şart.
  const composer = (await page.locator('[data-testid="chat-slot"] .chat-composer-field').first().boundingBox())!
  expect(composer.y + composer.height).toBeLessThanOrEqual(after.y + after.height)
  expect(composer.y + composer.height).toBeLessThanOrEqual(780)

  // 👥 → liste KAPLAMA olarak açılır ve kart alanını kaplar.
  await page.getByRole('button', { name: 'Kişi listesini aç' }).click()
  await expect(listPanel(page)).toBeVisible()
  const overlay = (await listPanel(page).boundingBox())!
  // `absolute inset-0` kartın DOLGU kutusuna göre konumlanır → 1px çerçeve dışta
  // kalır (ölçüldü: x kartın 1px içinde).
  expect(Math.round(overlay.x)).toBe(Math.round(after.x) + 1)
  expect(Math.round(overlay.width)).toBe(Math.round(after.width) - 2)
  expect(Math.round(overlay.height)).toBe(Math.round(after.height) - 2)

  // Kişiye tıkla → sohbete dön (seçim korunur).
  await page.locator(`button[data-peer-id="${peer.id}"]`).click()
  await expect(listPanel(page)).toBeHidden()
  await expect(threadPanel(page).locator('div').first()).toContainText(peerLabel(peer))

  // ← → listeyi açar; geri dönünce AYNI sohbet durur (eski hâlde siliniyordu).
  await page.getByRole('button', { name: 'Sohbet listesine dön' }).click()
  await expect(listPanel(page)).toBeVisible()
  await page.locator(`button[data-peer-id="${peer.id}"]`).click()
  await expect(threadPanel(page).locator('div').first()).toContainText(peerLabel(peer))
})

/* ────────────────────────────────────────────────────────────────────────────
   MADDE 2 — pencere yeniden boyutlandırılınca seçim korunur
   ──────────────────────────────────────────────────────────────────────────── */
test('boyut değişimi: seçili sohbet ve mesaj alanı korunur', async ({ page, context }) => {
  await openChat(page, 390, 780)
  const data = await chatData(context.request)
  const peer = data.users[0]

  await page.locator(`button[data-peer-id="${peer.id}"]`).click()
  await expect(threadPanel(page).locator('div').first()).toContainText(peerLabel(peer))
  await expect(scroller(page)).toBeVisible()

  // 390 → 900 (md üstü: iki panel) → 390. Sohbet kapanmaz, kaydırma Düğümü aynı kalır.
  await page.setViewportSize({ width: 900, height: 800 })
  await expect(listPanel(page)).toBeVisible()
  await expect(threadPanel(page).locator('div').first()).toContainText(peerLabel(peer))

  await page.setViewportSize({ width: 390, height: 780 })
  await expect(listPanel(page)).toBeHidden()
  await expect(threadPanel(page).locator('div').first()).toContainText(peerLabel(peer))
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
  // Uzun basma satırı SEÇMEZ: liste hâlâ açık (sohbet açılmadı).
  await expect(listPanel(page)).toBeVisible()
  await expect(threadPanel(page)).toBeHidden()
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
  const peer = data.users.find(u => u.id !== me)
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
  await sc.evaluate(el => el.scrollTo({ top: 200 }))
  await page.waitForTimeout(400) // düzgün kaydırma animasyonu bitsin
  const s0 = await sc.evaluate(el => el.scrollTop)
  expect(s0).toBeGreaterThan(0)
  await page.setViewportSize({ width: 390, height: 780 })
  const s1 = await sc.evaluate(el => el.scrollTop)
  await page.setViewportSize({ width: 1440, height: 900 })
  const s2 = await sc.evaluate(el => el.scrollTop)
  expect(Math.abs(s1 - s0)).toBeLessThanOrEqual(2)
  expect(Math.abs(s2 - s0)).toBeLessThanOrEqual(2)
})
