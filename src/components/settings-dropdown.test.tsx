import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { SettingsModal } from '@/components/settings-dropdown'

/**
 * Ayarlar paneli — "Kaydet'e basılana kadar hiçbir ayar uygulanmaz".
 *
 * Regresyonun kaynağı: eskiden tema `setTheme`, dil `setPref`, hareket/müzik
 * `localStorage.setItem` ile ANINDA yazılıyordu. Panelde 4 kontrol de
 * "kaydedilmiş" gibi davranıyordu; kullanıcı geri dönemiyordu.
 *
 * Buradaki tek iddia: **localStorage'a yazan yol `Kaydet`'ten geçer.**
 * `setTheme`/`setPref` mock'landığı için onların *ne zaman* çağrıldığı tek
 * başına görünmez; asıl kalıcı iz (localStorage) ölçülüyor.
 */

// --- Mock'lar ----------------------------------------------------------
// LobeButton/Modal/Drawer agacina girmeyelim: testin konusu ayar mantigi.
vi.mock('@/components/theme', () => ({
  useTheme: () => ({ theme: 'auto', setTheme: setThemeSpy }),
}))
vi.mock('@/components/locale-provider', () => ({
  useT: () => ({ t: (k: string) => k }),
  useLocale: () => ({ pref: 'auto', setPref: setPrefSpy, detected: 'tr' }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({
    open,
    onClose,
    children,
  }: {
    open: boolean
    onClose: () => void
    children: React.ReactNode
  }) => (
    <div data-testid="drawer" hidden={!open}>
      <button type="button" data-testid="drawer-close" onClick={onClose}>
        close
      </button>
      {children}
    </div>
  ),
}))
vi.mock('@/components/ui/modal', () => ({
  Modal: ({
    open,
    children,
  }: {
    open: boolean
    children: React.ReactNode
  }) => (open ? <div data-testid="modal">{children}</div> : null),
}))
vi.mock('@/components/ui/searchable-combobox', () => ({
  SearchableCombobox: ({ onSelect }: { onSelect: (v: string) => void }) => (
    <button type="button" data-testid="locale-pick" onClick={() => onSelect('de')}>
      locale
    </button>
  ),
}))

const setThemeSpy = vi.fn()
const setPrefSpy = vi.fn()

/**
 * Node 22+ `globalThis.localStorage`'ı KENDI getter'i ile tanimliyor ve
 * `--localstorage-file` verilmedigi icin `undefined` donuyor; bu jsdom'unki
 * degeri golgeliyor. Bilesen `localStorage.getItem` cagirinca patliyordu.
 * Test icin gercek bir Map tabanli store sabitliyoruz — hem bilesen hem
 * test ayni nesneyi goruyor, "diskte ne yazili" iddiasi olculabilir oluyor.
 */
beforeAll(() => {
  const store = new Map<string, string>()
  const ls = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: ls,
    configurable: true,
    writable: true,
  })
})

const MUSIC = 'site-music-enabled'
const MOTION = 'site-reduce-motion'

function renderPanel() {
  return render(
    <SettingsModal githubUsername="x" open onOpenChange={openSpy} />,
  )
}
const openSpy = vi.fn()

/** Modalın "hareketi azalt" toggle'ı — aria-pressed ile bulunur. */
function motionToggle() {
  return screen.getByRole('button', { name: /settings\.reduceMotion/ })
}

describe('ayarlar paneli: Kaydet kapisi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(cleanup)

  it('panel acilinca hicbir sey yazmaz', () => {
    renderPanel()
    expect(localStorage.getItem(MOTION)).toBeNull()
    expect(localStorage.getItem(MUSIC)).toBeNull()
    expect(setThemeSpy).not.toHaveBeenCalled()
    expect(setPrefSpy).not.toHaveBeenCalled()
  })

  it('kontrol degistirmek de yazmaz', () => {
    renderPanel()
    fireEvent.click(motionToggle())
    fireEvent.click(screen.getByTestId('locale-pick'))
    expect(localStorage.getItem(MOTION)).toBeNull()
    expect(setThemeSpy).not.toHaveBeenCalled()
    expect(setPrefSpy).not.toHaveBeenCalled()
  })

  it('Kaydet tusu taslagi uygular', () => {
    renderPanel()
    fireEvent.click(motionToggle())
    fireEvent.click(screen.getByTestId('locale-pick'))
    fireEvent.click(screen.getByRole('button', { name: /settings\.save/ }))

    expect(localStorage.getItem(MOTION)).toBe('true')
    expect(setPrefSpy).toHaveBeenCalledWith('de')
    expect(openSpy).toHaveBeenCalledWith(false)
  })

  it('Kaydet degisiklik yoksa pasif', () => {
    renderPanel()
    // `toBeDisabled` yerine dogrudan DOM: bu projede jest-dom kurulu degil.
    const btn = screen.getByRole('button', { name: /settings\.save/ })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('kaydedilmemis degisiklikle kapatma onay ister, Hayır paneli kapamaz', () => {
    renderPanel()
    fireEvent.click(motionToggle())
    fireEvent.click(screen.getByTestId('drawer-close'))

    expect(screen.getByTestId('modal')).toBeTruthy()
    expect(screen.getByText('settings.unsaved')).toBeTruthy()

    // "Hayır" = vazgeçme, panelde kal
    fireEvent.click(screen.getByRole('button', { name: 'common.no' }))
    expect(screen.queryByTestId('modal')).toBeNull()
    expect(localStorage.getItem(MOTION)).toBeNull()
    expect(openSpy).not.toHaveBeenCalledWith(false)
  })

  it('"Evet" degisiklikleri birakip kapatir, kaydetmez', () => {
    renderPanel()
    fireEvent.click(motionToggle())
    fireEvent.click(screen.getByTestId('drawer-close'))
    fireEvent.click(screen.getByRole('button', { name: 'common.yes' }))

    expect(openSpy).toHaveBeenCalledWith(false)
    expect(localStorage.getItem(MOTION)).toBeNull()
  })

  it('temiz panel doğrudan kapanir, onay sormaz', () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('drawer-close'))
    expect(screen.queryByTestId('modal')).toBeNull()
    expect(openSpy).toHaveBeenCalledWith(false)
  })
})