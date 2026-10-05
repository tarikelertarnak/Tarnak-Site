import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GLOBAL_SHORTCUTS, Shortcuts } from '@/components/shortcuts'

/**
 * Kısayol regresyon testleri (2026-10-05).
 *
 * Asıl risk "yanlış tetiklenme": kullanıcı bir metin alanına Ctrl+B basarsa
 * panel açılıp odak kaybolur ve yazdığı metin KAYBOLUR. Bu testin varlık
 * sebebi o güvenlik sınırı.
 */
afterEach(() => {
  cleanup()
  // RTL yalnizca kendi agacini temizler; onceki testlerden kalan
  // contenteditable/dialog dugumleri sonraki testleri bozuyordu.
  document.body.innerHTML = ''
})

function mount() {
  return render(<Shortcuts shortcuts={GLOBAL_SHORTCUTS} />)
}

describe('Shortcuts', () => {
  it('Ctrl+B yan paneli açar (sidebar:request-toggle)', () => {
    const spy = vi.fn()
    window.addEventListener('sidebar:request-toggle', spy)
    mount()
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(spy).toHaveBeenCalledTimes(1)
    window.removeEventListener('sidebar:request-toggle', spy)
  })

  it('Cmd+B de çalışır (Mac)', () => {
    const spy = vi.fn()
    window.addEventListener('sidebar:request-toggle', spy)
    mount()
    fireEvent.keyDown(window, { key: 'b', metaKey: true })
    expect(spy).toHaveBeenCalledTimes(1)
    window.removeEventListener('sidebar:request-toggle', spy)
  })

  it('yazarken (input) hiçbir kısayol çalışmaz', () => {
    const spy = vi.fn()
    window.addEventListener('sidebar:request-toggle', spy)
    const { container } = render(
      <>
        <input type="text" />
        <Shortcuts shortcuts={GLOBAL_SHORTCUTS} />
      </>,
    )
    const input = container.querySelector('input')!
    fireEvent.keyDown(input, { key: 'b', ctrlKey: true })
    fireEvent.keyDown(input, { key: 'k', ctrlKey: true })
    expect(spy).not.toHaveBeenCalled()
    window.removeEventListener('sidebar:request-toggle', spy)
  })

  it('textarea ve contentEditable içinde de çalışmaz', () => {
    const spy = vi.fn()
    window.addEventListener('sidebar:request-toggle', spy)
    const { container } = render(
      <>
        <textarea />
        <div contentEditable data-testid="ce" />
        <Shortcuts shortcuts={GLOBAL_SHORTCUTS} />
      </>,
    )
    fireEvent.keyDown(container.querySelector('textarea')!, { key: 'b', ctrlKey: true })
    fireEvent.keyDown(container.querySelector('[data-testid="ce"]')!, { key: 'b', ctrlKey: true })
    expect(spy).not.toHaveBeenCalled()
    window.removeEventListener('sidebar:request-toggle', spy)
  })

  it('modal/drawer açıkken yeni kısayol tetiklenmez', () => {
    const spy = vi.fn()
    window.addEventListener('sidebar:request-toggle', spy)
    const { container } = render(
      <>
        <div role="dialog">açık panel</div>
        <Shortcuts shortcuts={GLOBAL_SHORTCUTS} />
      </>,
    )
    expect(container.querySelector('[role="dialog"]')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(spy).not.toHaveBeenCalled()
    window.removeEventListener('sidebar:request-toggle', spy)
  })

  it('gizli dialog varsa kısayol çalışır', () => {
    const spy = vi.fn()
    window.addEventListener('sidebar:request-toggle', spy)
    render(
      <>
        <div role="dialog" hidden />
        <Shortcuts shortcuts={GLOBAL_SHORTCUTS} />
      </>,
    )
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(spy).toHaveBeenCalledTimes(1)
    window.removeEventListener('sidebar:request-toggle', spy)
  })

  it('modifier tuşu basılı değilse kısayol çalışmaz', () => {
    const spy = vi.fn()
    window.addEventListener('sidebar:request-toggle', spy)
    mount()
    fireEvent.keyDown(window, { key: 'b' })
    expect(spy).not.toHaveBeenCalled()
    window.removeEventListener('sidebar:request-toggle', spy)
  })

  it('Shift basılıyken Ctrl kombinasyonu çalışmaz', () => {
    const spy = vi.fn()
    window.addEventListener('sidebar:request-toggle', spy)
    mount()
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true, shiftKey: true })
    expect(spy).not.toHaveBeenCalled()
    window.removeEventListener('sidebar:request-toggle', spy)
  })

  it('tuşu basılı tutmak (repeat) bir kez tetikler', () => {
    const spy = vi.fn()
    window.addEventListener('sidebar:request-toggle', spy)
    mount()
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true, repeat: true })
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true, repeat: true })
    expect(spy).not.toHaveBeenCalled()
    window.removeEventListener('sidebar:request-toggle', spy)
  })

  it('Ctrl+K arama, Ctrl+/ ayarlar eventlerini yollar', () => {
    const search = vi.fn()
    const settings = vi.fn()
    window.addEventListener('search:request-open', search)
    window.addEventListener('settings:open', settings)
    mount()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    fireEvent.keyDown(window, { key: '/', ctrlKey: true })
    expect(search).toHaveBeenCalledTimes(1)
    expect(settings).toHaveBeenCalledTimes(1)
    window.removeEventListener('search:request-open', search)
    window.removeEventListener('settings:open', settings)
  })

  it('unmount sonrası dinleyici kalmaz', () => {
    const spy = vi.fn()
    window.addEventListener('sidebar:request-toggle', spy)
    const { unmount } = mount()
    unmount()
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })
    expect(spy).not.toHaveBeenCalled()
    window.removeEventListener('sidebar:request-toggle', spy)
  })
})