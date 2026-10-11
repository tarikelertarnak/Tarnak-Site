import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '@/components/locale-provider'
import { ChatV2 } from './chat-v2'

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
      <ChatV2 />
    </LocaleProvider>,
  )
  // oturum sorgusu bitene kadar bekle
  await waitFor(() => expect(screen.queryByText(/sohbet yükleniyor/i)).toBeNull())
  return result
}

beforeEach(() => {
  vi.clearAllMocks()
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
        return jsonResponse({ success: true, user: { id: 'admin:TARIKELERTARNAK', role: 'admin' } })
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

  it('oturum VARSA: girişli kullanıcı için sohbet sahibiyle otomatik açılır', async () => {
    const spy = mockFetch((url) => {
      if (url.includes('/api/admin/session')) {
        return jsonResponse({ success: true, user: { id: 'admin:TARIKELERTARNAK', role: 'admin' } })
      }
      if (url.includes('/api/chat/v2')) {
        return jsonResponse({ success: true, conversation: { id: 'conv-1' } })
      }
      return jsonResponse({ success: true, messages: [] })
    })

    await renderChat()

    await waitFor(() => expect(screen.getByPlaceholderText(/mesajını yaz/i)).not.toBeNull())
    const openCall = spy.mock.calls.find(c => String(c[0]).includes('/api/chat/v2') && c[1]?.method === 'POST')
    expect(openCall).toBeTruthy()
    expect(JSON.parse(String(openCall![1]!.body))).toMatchObject({ action: 'open' })
  })
})
