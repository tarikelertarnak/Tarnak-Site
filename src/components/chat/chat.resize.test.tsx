import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '@/components/locale-provider'
import { Chat } from './chat'

// LocaleProvider `useRouter` kullanıyor (repo deseni: chat.session.test.tsx).
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

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
 * YAN PANELİN YENİDEN BOYUTLANDIRILMASI (2026-10-12 kullanıcı isteği).
 *
 * Kullanıcı: "yan panel gibi duracak, büyütüp küçültebileceğim."
 *
 * Bu test kaynak metni değil GERÇEK DOM davranışını ölçer: ayraca pointerdown
 * gönderilir, pencereye pointermove → CSS değişkeni `--chat-panel-w` değişmeli;
 * sınırlar (240–560) ve ok tuşları da gerçek olaylarla sınanır.
 *
 * Not: tarayıcı testi (Playwright) bu makinede dev sunucusu hidrasyon
 * yapmadığı için kullanılamıyor (playwright.config.ts bunu belgeliyor);
 * jsdom aynı davranışı yerel olarak kanıtlar.
 */
function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

/** İKİ kişi döner: tek kişilik listede otomatik açılma var, o zaman ölçüm şaşar. */
function mockFetch() {
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/admin/session')) {
      return jsonResponse({ success: true, user: { id: 'admin:OWNER', role: 'admin' } })
    }
    if (url.includes('/api/chat/users')) {
      return jsonResponse({
        success: true,
        chatId: 'admin:OWNER',
        users: [
          { id: 'u-1', username: 'ayse', fullName: 'Ayşe Yılmaz', avatarUrl: null },
          { id: 'u-2', username: 'mehmet', fullName: 'Mehmet Demir', avatarUrl: null },
        ],
      })
    }
    return jsonResponse({ success: true, conversations: [], messages: [] })
  }))
}

/**
 * React pointerdown'ı KÖK dinleyiciden yakalar (bubbles:true şart); sürükleme
 * sırasındaki pointermove'u ise bileşen doğrudan `window`a bağlar. İkisi de
 * gerçek native olay → testte taklit edilmiş bir yol yok.
 */
function nativePointer(type: string, clientX: number) {
  return new MouseEvent(type, { clientX, bubbles: true, cancelable: true })
}

async function renderChat() {
  const result = render(
    <LocaleProvider detectedLocale="tr">
      <Chat />
    </LocaleProvider>,
  )
  await waitFor(() => expect(document.querySelector('[role="status"]')).toBeNull())
  return result
}

/** Genişlik CSS değişkeninden okunur (panel bununla boyutlanıyor). */
function panelWidth(shell: HTMLElement): number {
  return Number.parseInt(shell.style.getPropertyValue('--chat-panel-w'), 10)
}

async function shellAndHandle() {
  const result = await renderChat()
  const sep = screen.getByRole('separator')
  const shell = sep.parentElement as HTMLElement
  return { ...result, sep, shell }
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('yan panel yeniden boyutlandırma', () => {
  it('ayraç erişilebilir tutamaçtır: separator + dikey + ok tuşuyla odaklanır', async () => {
    mockFetch()
    const { sep } = await shellAndHandle()

    expect(sep.getAttribute('aria-orientation')).toBe('vertical')
    expect(sep.getAttribute('tabindex')).toBe('0')
    expect(sep.getAttribute('aria-label'), 'ekran okuyucu için ad').not.toBe('')
  })

  it('sürükleme paneli gerçekten büyütür (288 → 408 px)', async () => {
    mockFetch()
    const { sep, shell } = await shellAndHandle()
    expect(panelWidth(shell), 'varsayılan genişlik').toBe(288)

    act(() => sep.dispatchEvent(nativePointer('pointerdown', 300)))
    act(() => window.dispatchEvent(nativePointer('pointermove', 420)))

    expect(panelWidth(shell), '+120 px sürüklendi').toBe(408)
    act(() => window.dispatchEvent(nativePointer('pointerup', 420)))
  })

  it('sürükleme paneli küçültür ve 240 px altına inmez (alt sınır)', async () => {
    mockFetch()
    const { sep, shell } = await shellAndHandle()

    act(() => sep.dispatchEvent(nativePointer('pointerdown', 300)))
    act(() => window.dispatchEvent(nativePointer('pointermove', 0))) // -300 px istek

    expect(panelWidth(shell)).toBe(240)
    act(() => window.dispatchEvent(nativePointer('pointerup', 0)))
  })

  it('üst sınır 560 px: daha fazla sürüklemek genişliği taşırmaz', async () => {
    mockFetch()
    const { sep, shell } = await shellAndHandle()

    act(() => sep.dispatchEvent(nativePointer('pointerdown', 300)))
    act(() => window.dispatchEvent(nativePointer('pointermove', 1200))) // +900 px istek

    expect(panelWidth(shell)).toBe(560)
    act(() => window.dispatchEvent(nativePointer('pointerup', 1200)))
  })

  it('pointerup sonrası hareket genişliği değiştirmez (sürükleme biter)', async () => {
    mockFetch()
    const { sep, shell } = await shellAndHandle()

    act(() => sep.dispatchEvent(nativePointer('pointerdown', 300)))
    act(() => window.dispatchEvent(nativePointer('pointerup', 300)))
    act(() => window.dispatchEvent(nativePointer('pointermove', 700)))

    expect(panelWidth(shell)).toBe(288)
  })

  it('ok tuşları ±16 px: ArrowRight büyütür, ArrowLeft geri getirir', async () => {
    mockFetch()
    const { sep, shell } = await shellAndHandle()

    fireEvent.keyDown(sep, { key: 'ArrowRight' })
    expect(panelWidth(shell)).toBe(304)

    fireEvent.keyDown(sep, { key: 'ArrowLeft' })
    expect(panelWidth(shell)).toBe(288)

    // ilgisiz tuş genişliği değiştirmez
    fireEvent.keyDown(sep, { key: 'a' })
    expect(panelWidth(shell)).toBe(288)
  })

  it('kişi listesi ve sohbet AYNI ekranda: "önce seç" ekranı yok', async () => {
    mockFetch()
    await renderChat()

    // sol panel (liste) + sağ panel (sohbet) aynı DOM'da kardeş durur
    const sep = screen.getByRole('separator')
    expect(sep.previousElementSibling?.tagName).toBe('ASIDE')
    expect(sep.nextElementSibling?.tagName).toBe('SECTION')

    // kullanıcının kaldırılmasını istediği yazı ve metin yükleme ekranı YOK
    expect(screen.queryByText(/kime yazmak istiyorsun/i)).toBeNull()
    expect(screen.queryByText(/sohbet yükleniyor/i)).toBeNull()
    expect(screen.getByText('Ayşe Yılmaz')).not.toBeNull()
  })
})
