import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MenuItem, MenuSurface, useLongPress } from './context-menu'

/**
 * Bağlam menüsü çekirdeği (2026-10-13).
 *
 * Kullanıcı istekleri burada TEK TEK ölçülür — konum, kenar taşması, kapatma
 * kuralları, klavye gezinme ve mobil uzun basma. `jsdom`da `getBoundingClientRect`
 * sıfır döndürdüğü için ölçü açıkça taklit edilir.
 */

const originalRect = Element.prototype.getBoundingClientRect

afterEach(() => {
  cleanup()
  Element.prototype.getBoundingClientRect = originalRect
})

/** Menü ölçüsü: 200×300 (taşma hesabı için gerekli). */
function stubMenuSize(width = 200, height = 300) {
  Element.prototype.getBoundingClientRect = function () {
    return {
      width,
      height,
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect
  }
}

function renderMenu(x = 100, y = 120, onClose = vi.fn()) {
  render(
    <MenuSurface x={x} y={y} onClose={onClose} label="test menüsü">
      <MenuItem icon="👤" label="Birinci" onSelect={() => {}} />
      <MenuItem icon="🗑" label="Sil" danger onSelect={() => {}} />
    </MenuSurface>,
  )
  return { onClose, menu: screen.getByRole('menu') }
}

describe('konum ve taşma', () => {
  it('menü imlecin konumunda açılır', () => {
    const { menu } = renderMenu(100, 120)
    expect(menu.style.left).toBe('100px')
    expect(menu.style.top).toBe('120px')
    expect(menu.style.visibility).toBe('visible')
  })

  it('sağdan/alttan taşarsa içeri kaydırılır (viewport clamp)', () => {
    stubMenuSize()
    // 1024×768 varsayılan jsdom görünümü: 200×300 menü 1000/700'de taşar.
    const { menu } = renderMenu(1000, 700)
    expect(menu.style.left).toBe('796px') // 1000 - 200 - 4
    expect(menu.style.top).toBe('396px') // 700 - 300 - 4
  })

  it('çok küçük konumda kenardan en az 8px boşluk bırakır', () => {
    const { menu } = renderMenu(0, 0)
    expect(menu.style.left).toBe('8px')
    expect(menu.style.top).toBe('8px')
  })

  it('erişilebilirlik: role="menu" + aria-label + role="menuitem" satırlar', () => {
    renderMenu()
    expect(screen.getByRole('menu').getAttribute('aria-label')).toBe('test menüsü')
    expect(screen.getAllByRole('menuitem').length).toBe(2)
  })

  it('tehlikeli madde (sil) kırmızı ve ayrı vurgulu', () => {
    renderMenu()
    expect(screen.getByText('Sil').closest('button')?.className).toContain('text-red-500')
    expect(screen.getByText('Birinci').closest('button')?.className).not.toContain('text-red-500')
  })
})

describe('kapatma kuralları', () => {
  it('esc kapatır', () => {
    const { onClose } = renderMenu()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('dışarı tıklama kapatır, menü içine tıklama kapatmaz', () => {
    const { onClose } = renderMenu()
    fireEvent.pointerDown(screen.getByText('Birinci'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.pointerDown(document.body)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('kaydırma kapatır (menü kaydırılan içerikten kopmasın)', () => {
    const { onClose } = renderMenu()
    fireEvent.scroll(window)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('pencere boyutu değişimi kapatır (konum bayatlamasın)', () => {
    const { onClose } = renderMenu()
    fireEvent.resize(window)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('klavye', () => {
  it('açılışta ilk madde odaklanır; ok tuşları döngüyle gezer; Tab kapatır', () => {
    const { onClose } = renderMenu()
    const [first, second] = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(first, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(second)
    fireEvent.keyDown(second, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(first) // döngü
    fireEvent.keyDown(first, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(second)

    fireEvent.keyDown(second, { key: 'Tab' })
    expect(onClose).toHaveBeenCalled()
  })
})

describe('odak yönetimi', () => {
  function Harness() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>menüyü aç</button>
        {open && (
          <MenuSurface x={100} y={120} onClose={() => setOpen(false)} label="test menüsü">
            <MenuItem label="Birinci" onSelect={() => setOpen(false)} />
          </MenuSurface>
        )}
      </>
    )
  }

  it('kapanınca odak menüyü açan öğeye geri döner', () => {
    render(<Harness />)
    const opener = screen.getByText('menüyü aç')
    // jsdom tıklamada odağı taşımaz → gerçek tarayıcı davranışını açıkça kur.
    opener.focus()
    fireEvent.click(opener)
    const item = screen.getByRole('menuitem')
    expect(document.activeElement).toBe(item)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })
})

/**
 * Mobil uzun basma. `pointerType`/`clientX`/`clientY` `PointerEvent`/`MouseEvent`
 * yapıcısında init olarak kabul edilmediği (ve jsdom'da `PointerEvent` olmayabileceği)
 * için olaydan SONRA açıkça tanımlanır — aksi hâlde `clientX` `undefined` kalır ve
 * "kaydırma iptali" sessizce çalışmaz.
 */
function firePointer(
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  el: Element,
  init: Partial<{ pointerType: string, clientX: number, clientY: number }> = {},
) {
  const Ctor = (globalThis as unknown as { PointerEvent?: typeof MouseEvent }).PointerEvent ?? MouseEvent
  const evt = new Ctor(type, { bubbles: true })
  for (const [key, value] of Object.entries(init)) {
    Object.defineProperty(evt, key, { value })
  }
  el.dispatchEvent(evt)
}

describe('uzun basma (mobil)', () => {
  function LongPressHarness({ onLongPress }: { onLongPress: (x: number, y: number, target: Element | null) => void }) {
    // 20 ms: gerçek zamanlayıcıyla ölçmek için testte kısaltılır.
    const handlers = useLongPress(onLongPress, 20)
    return (
      <div {...handlers}>
        <button type="button" data-peer-id="u-1">satır</button>
      </div>
    )
  }

  it('dokunmada süre dolunca hedef öğeyle birlikte tetiklenir', async () => {
    const onLongPress = vi.fn()
    render(<LongPressHarness onLongPress={onLongPress} />)
    const row = screen.getByText('satır')

    firePointer('pointerdown', row, { pointerType: 'touch', clientX: 33, clientY: 44 })
    expect(onLongPress).not.toHaveBeenCalled()

    await waitFor(() => expect(onLongPress).toHaveBeenCalledTimes(1))
    const [x, y, target] = onLongPress.mock.calls[0]
    expect(x).toBe(33)
    expect(y).toBe(44)
    // Kapsayıcıya takıldığı için hangi satır olduğu `data-*` ile bulunur.
    expect((target as HTMLElement).dataset.peerId).toBe('u-1')
  })

  it('parmak kayarsa (listeyi kaydırma) iptal edilir', async () => {
    const onLongPress = vi.fn()
    render(<LongPressHarness onLongPress={onLongPress} />)
    const row = screen.getByText('satır')

    firePointer('pointerdown', row, { pointerType: 'touch', clientX: 10, clientY: 10 })
    firePointer('pointermove', row, { pointerType: 'touch', clientX: 40, clientY: 10 })
    await new Promise(r => setTimeout(r, 60))
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('parmak süre dolmadan kalkarsa menü açılmaz', async () => {
    const onLongPress = vi.fn()
    render(<LongPressHarness onLongPress={onLongPress} />)
    const row = screen.getByText('satır')

    firePointer('pointerdown', row, { pointerType: 'touch', clientX: 10, clientY: 10 })
    firePointer('pointerup', row, { pointerType: 'touch', clientX: 10, clientY: 10 })
    await new Promise(r => setTimeout(r, 60))
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('fARE uzun basmayı tetiklemez (masaüstü sağ tıkla açar)', async () => {
    const onLongPress = vi.fn()
    render(<LongPressHarness onLongPress={onLongPress} />)
    const row = screen.getByText('satır')

    firePointer('pointerdown', row, { pointerType: 'mouse', clientX: 10, clientY: 10 })
    await new Promise(r => setTimeout(r, 60))
    expect(onLongPress).not.toHaveBeenCalled()
  })
})

describe('menuPoint', () => {
  it('imleç varsa imleci, yoksa (klavye) hedef öğenin köşesini döner', async () => {
    const { menuPoint } = await import('./context-menu')
    const el = document.createElement('div')
    el.getBoundingClientRect = () => ({ left: 50, top: 60 } as DOMRect)

    expect(menuPoint({ clientX: 12, clientY: 34, currentTarget: el })).toEqual({ x: 12, y: 34 })
    // Klavyeyle (`Menü` tuşu / Shift+F10) clientX/Y sıfırdır → ekranın (0,0)
    // köşesinde açılmasın, öğenin yanında açılsın.
    expect(menuPoint({ clientX: 0, clientY: 0, currentTarget: el })).toEqual({ x: 58, y: 68 })
  })
})
