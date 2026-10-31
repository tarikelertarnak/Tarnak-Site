import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '@/components/locale-provider'
import { Chat } from './chat'

// LocaleProvider `useRouter` kullanıyor (repo deseni: locale-provider.test.tsx).
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

// Lobehub Button `<ConfigProvider>` ister ve `@lobehub/ui` barrel'ı vitest'te
// JSON import attribute hatası veriyor → repo deseni (overview-panel.test.tsx):
// butonu sadeleştirilmiş <button>'a indiriyoruz. Testin amacı Lobehub'u
// doğrulamak değil, OTURUM EKRANI davranışını doğrulamak.
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onPress,
    isDisabled,
    startContent,
  }: {
    children?: React.ReactNode
    onPress?: () => void
    isDisabled?: boolean
    startContent?: React.ReactNode
  }) => (
    <button type="button" disabled={isDisabled} onClick={onPress}>
      {startContent}
      {children}
    </button>
  ),
}))

/**
 * Sohbet oturum ekranı (regresyon — 2026-10-11).
 *
 * BUG: "Sohbete girmek için giriş yap." GİRİŞ YAPMIŞ kullanıcıya da çıkıyordu.
 * Ölçülen kök neden: root layout `dynamic = 'force-static'` → Next alt
 * rotalarda `cookies()`'ı boş döndürüyor, sunucudaki getSessionUser() hep null
 * dönüyordu. Oturum istemciye (/api/admin/session) taşındı ve burada test
 * edildi.
 *
 * Tarayıcı testi (Playwright) bu makinede dev sunucusunda hidrasyon
 * çalışmadığı için kullanılamıyor (playwright.config.ts bunu belgeliyor);
 * jsdom render testi aynı davranışı yerel olarak kanıtlar.
 */

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

function mockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const spy = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init))
  vi.stubGlobal('fetch', spy)
  return spy
}

async function renderChat() {
  const result = render(
    // detectedLocale: jsdom varsayılanı 'en' idi; iddialarımız Türkçe metin
    // üzerine kurulu (kullanıcının gördüğü dil).
    <LocaleProvider detectedLocale="tr">
      <Chat />
    </LocaleProvider>,
  )
  // oturum sorgusu bitene kadar bekle
  await waitFor(() => expect(document.querySelector('[role="status"]')).toBeNull())
  return result
}

beforeEach(() => {
  vi.clearAllMocks()
  /*
    Dil cerezle sabitlenir (2026-10-30). `detectedLocale` artık otomatik
    algılamada kullanılmıyor — tarayıcı dili öncelikli (locale-provider.tsx).
    jsdom'un `navigator.language` değeri 'en-US' olduğu için iddiaların
    Türkçe metin beklentisi boşa düşüyordu. Gerçek kullanıcı da dili seçince
    cerez yazılır; test aynı yolu kullanır.
  */
  document.cookie = 'site-locale=tr; path=/'
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('sohbet v2 oturum ekranı', () => {
  it('oturum YOKSA: "Kayıt Ol" ve "Giriş Yap" butonlarını gösterir', async () => {
    mockFetch(url =>
      url.includes('/api/admin/session')
        ? jsonResponse({ success: true, user: null })
        : jsonResponse({ success: true }))

    await renderChat()

    expect(screen.getByRole('link', { name: 'Kayıt Ol' }).getAttribute('href'))
      .toBe('/sign?next=%2Fchat')
    expect(screen.getByRole('link', { name: 'Giriş Yap' }).getAttribute('href'))
      .toBe('/login?next=%2Fchat')
    expect(screen.getByText(/sohbete girmek için giriş yap/i)).not.toBeNull()
  })

  it('oturum VARSA: giriş/kayıt butonları GÖSTERİLMEZ (asıl regresyon)', async () => {
    // Sohbet şeması kurulmadığı için API 503 döner; kullanıcı yine de
    // "giriş yap" ekranına düşmemelidir.
    mockFetch((url) => {
      if (url.includes('/api/admin/session')) {
        return jsonResponse({ success: true, user: { id: 'user-1', role: 'user' } })
      }
      return jsonResponse({ success: false, code: 'CHAT_SCHEMA_MISSING', message: 'şema kurulmadı' }, 503)
    })

    await renderChat()

    expect(screen.queryByRole('link', { name: 'Giriş Yap' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Kayıt Ol' })).toBeNull()
    expect(screen.queryByText(/sohbete girmek için giriş yap/i)).toBeNull()
    // şema uyarısı gösterilir (veritabanı kurulumu yapılana kadar)
    expect(screen.getByText(/supabase\/chat\.sql/)).not.toBeNull()
  })

  it('normal kullanıcı: listesinde yalnız site sahibi vardır ve sohbet kendiliğinden açılır', async () => {
    const spy = mockFetch((url) => {
      if (url.includes('/api/admin/session')) {
        return jsonResponse({ success: true, user: { id: 'user-1', role: 'user' } })
      }
      if (url.includes('/api/chat/users')) {
        // Sunucu normal kullanıcıya YALNIZ site sahibini döner (2026-10-12).
        return jsonResponse({
          success: true,
          chatId: 'user-1',
          users: [{ id: 'owner-1', username: 'tarikelertarnak', fullName: 'TARIK ELER', avatarUrl: null }],
        })
      }
      if (url.includes('/api/chat')) {
        return jsonResponse({ success: true, conversation: { id: 'conv-1' }, messages: [] })
      }
      return jsonResponse({ success: true, messages: [] })
    })

    await renderChat()

    await waitFor(() => expect(screen.getByPlaceholderText(/bir mesaj yazın/i)).not.toBeNull())
    // "Önce seç, sonra aç" adımı YOK: tek kişilik listede sohbet otomatik açılır.
    expect(screen.getAllByText('TARIK ELER').length).toBeGreaterThan(0)
    const openCall = spy.mock.calls.find(
      c => String(c[0]).includes('/api/chat')
        && c[1]?.method === 'POST'
        && String(c[1]?.body).includes('"open"'),
    )
    expect(openCall).toBeTruthy()
    expect(JSON.parse(String(openCall![1]!.body))).toMatchObject({ action: 'open', peerId: 'owner-1' })
    // Eski "kime yazmak istiyorsun?" ekranı hiç yok.
    expect(screen.queryByText(/kime yazmak istiyorsun/i)).toBeNull()
  })

  /*
    Kullanıcı isteği (2026-10-12): "Kime yazmak istiyorsun? yazısını kaldır;
    ikisi yan yana tek bir hâlde olacak." Yani başlık yazısı YOK, kişi listesi
    (sol panel) ve sohbet (sağ panel) aynı ekranda.
  */
  it('admin: kişi listesi solda durur, sağ panel "soldan bir kişi seç" der', async () => {
    mockFetch((url) => {
      if (url.includes('/api/admin/session')) {
        return jsonResponse({ success: true, user: { id: 'admin:TARIKELERTARNAK', role: 'admin' } })
      }
      if (url.includes('/api/chat/users')) {
        return jsonResponse({
          success: true,
          chatId: 'admin:TARIKELERTARNAK',
          users: [
            { id: 'u-1', username: 'ayse', fullName: 'Ayşe Yılmaz', avatarUrl: null },
            { id: 'u-2', username: 'mehmet', fullName: null, avatarUrl: null },
          ],
        })
      }
      // SATIR GÖRÜNÜRLÜĞÜ sohbete bağlı (2026-10-13 kullanıcı isteği: kendi
      // satırım + hiç sohbeti olmayan kayıt listelenmez) → iki kişi için de
      // sohbet dönülür.
      return jsonResponse({
        success: true,
        conversations: [
          { id: 'c-1', direct_key: 'admin:TARIKELERTARNAK|u-1', updated_at: null, last_preview: null, last_sender_name: null },
          { id: 'c-2', direct_key: 'admin:TARIKELERTARNAK|u-2', updated_at: null, last_preview: null, last_sender_name: null },
        ],
      })
    })

    await renderChat()

    expect(screen.queryByText(/kime yazmak istiyorsun/i)).toBeNull()
    expect(screen.getByText('Ayşe Yılmaz')).not.toBeNull()
    expect(screen.getByText('mehmet')).not.toBeNull()
    // Birden çok kişi varken seçim kullanıcıda kalır → sağ panel ipucu gösterir.
    expect(screen.getByText(/soldan bir kişi seç/i)).not.toBeNull()
    // kullanıcının istediği: o saçma ekran ARTIK YOK
    expect(screen.queryByText(/henüz bir sohbet yok/i)).toBeNull()
  })

  it('admin: bir kişiye tıklayınca o sohbet açılır (peerId gönderilir)', async () => {
    const spy = mockFetch((url, init) => {
      if (url.includes('/api/admin/session')) {
        return jsonResponse({ success: true, user: { id: 'admin:TARIKELERTARNAK', role: 'admin' } })
      }
      if (url.includes('/api/chat/users')) {
        // İki kişi: otomatik açılma devreye girmez (tek kişilik liste kuralı),
        // iddia bu yüzden TIKLAMA yolunu kanıtlar.
        return jsonResponse({
          success: true,
          chatId: 'admin:TARIKELERTARNAK',
          users: [
            { id: 'u-1', username: 'ayse', fullName: 'Ayşe Yılmaz', avatarUrl: null },
            { id: 'u-2', username: 'mehmet', fullName: 'Mehmet Demir', avatarUrl: null },
          ],
        })
      }
      if (url.includes('/api/chat')) {
        // GET = liste (satır için sohbet şart), POST = sohbeti aç.
        if (!init?.method) {
          return jsonResponse({
            success: true,
            conversations: [
              { id: 'c-1', direct_key: 'admin:TARIKELERTARNAK|u-1', updated_at: null, last_preview: null, last_sender_name: null },
              { id: 'c-2', direct_key: 'admin:TARIKELERTARNAK|u-2', updated_at: null, last_preview: null, last_sender_name: null },
            ],
          })
        }
        return jsonResponse({ success: true, conversation: { id: 'conv-9' } })
      }
      return jsonResponse({ success: true, messages: [] })
    })

    await renderChat()

    fireEvent.click(screen.getByText('Ayşe Yılmaz'))

    await waitFor(() => expect(screen.getByPlaceholderText(/bir mesaj yazın/i)).not.toBeNull())
    const openWithPeer = spy.mock.calls.find(
      c => String(c[0]).includes('/api/chat')
        && c[1]?.method === 'POST'
        && String(c[1]?.body).includes('peerId'),
    )
    expect(openWithPeer).toBeTruthy()
    expect(JSON.parse(String(openWithPeer![1]!.body))).toMatchObject({ action: 'open', peerId: 'u-1' })
  })

  /*
    2026-10-13 (kullanıcı): yazma alanı WhatsApp tarzı TEK "hap" oldu. Sağ
    uçtaki düğme boşken MİKROFON, yazı varken yeşil GÖNDER olur; eski metinli
    "Gönder" düğmesi kaldırılır. Enter gönderir, Shift+Enter YENİ SATIR.

    Dikkat: "Gönder" adlı düğme artık ikon-only (aria-label taşır) ve
    mikrofon düğmesinin adı `chat.voiceSoon`.
  */
  it('yazma alanı: boşken mikrofon, yazınca gönder, silince tekrar mikrofon', async () => {
    mockFetch((url, init) => {
      if (url.includes('/api/admin/session')) {
        return jsonResponse({ success: true, user: { id: 'user-1', role: 'user' } })
      }
      if (url.includes('/api/chat/users')) {
        return jsonResponse({
          success: true,
          chatId: 'user-1',
          users: [{ id: 'owner-1', username: 'tarikelertarnak', fullName: 'TARIK ELER', avatarUrl: null }],
        })
      }
      if (url.includes('/api/chat')) {
        // Gönderim denemesi bilerek reddedilir (başarısız yanıt mesaj
        // gövdesi çizmez) — iddia İSTEĞİN atıldığı üzerinedir.
        if (String(init?.body).includes('"text"')) {
          return jsonResponse({ success: false, message: 'test' })
        }
        return jsonResponse({ success: true, conversation: { id: 'conv-1' }, messages: [] })
      }
      return jsonResponse({ success: true, messages: [] })
    })

    await renderChat()

    const input = await screen.findByPlaceholderText(/bir mesaj yazın/i)
    const mic = () => screen.queryByRole('button', { name: 'Sesli mesaj yakında' })
    const gonder = () => screen.queryByRole('button', { name: 'Gönder' })

    // Boşken: mikrofon var, gönder yok
    expect(mic()).not.toBeNull()
    expect(gonder()).toBeNull()

    // Yazınca: gönder çıkar, mikrofon kaybolur
    fireEvent.change(input, { target: { value: 'merhaba' } })
    expect(gonder()).not.toBeNull()
    expect(mic()).toBeNull()

    // YALNIZ boşluk "yazdı" sayılmaz → mikrofon geri gelir
    fireEvent.change(input, { target: { value: '   ' } })
    expect(mic()).not.toBeNull()

    // Temizleyince de mikrofon
    fireEvent.change(input, { target: { value: '' } })
    expect(mic()).not.toBeNull()
    expect(gonder()).toBeNull()
  })

  it('enter gönderir, shift+enter göndermez (yeni satır)', async () => {
    const spy = mockFetch((url, init) => {
      if (url.includes('/api/admin/session')) {
        return jsonResponse({ success: true, user: { id: 'user-1', role: 'user' } })
      }
      if (url.includes('/api/chat/users')) {
        return jsonResponse({
          success: true,
          chatId: 'user-1',
          users: [{ id: 'owner-1', username: 'tarikelertarnak', fullName: 'TARIK ELER', avatarUrl: null }],
        })
      }
      if (url.includes('/api/chat')) {
        if (String(init?.body).includes('"text"')) {
          return jsonResponse({ success: false, message: 'test' })
        }
        return jsonResponse({ success: true, conversation: { id: 'conv-1' }, messages: [] })
      }
      return jsonResponse({ success: true, messages: [] })
    })
    const sent = () => spy.mock.calls.some(
      c => String(c[0]).includes('/api/chat')
        && c[1]?.method === 'POST'
        && String(c[1]?.body).includes('"text":"merhaba"'),
    )

    await renderChat()
    const input = await screen.findByPlaceholderText(/bir mesaj yazın/i)
    fireEvent.change(input, { target: { value: 'merhaba' } })

    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(sent()).toBe(false)

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(sent()).toBe(true)
  })
})
