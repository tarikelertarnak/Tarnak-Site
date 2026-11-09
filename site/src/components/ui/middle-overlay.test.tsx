import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Drawer } from '@/components/ui/drawer'

/**
 * ORTA ALAN AYARLARI (2026-10-16, kullanıcı isteği).
 *
 * Kök şikâyet: Ayarlar sağdan kayan dar bir çekmeceydi; orta ana alanı
 * kaplamıyordu ve açılınca sol panel kapanıyordu.
 *
 * Bu dosya `side='middle'` modunun sözleşmesini kilitler:
 *   1) Panel ORTA ALAN kapsayıcısının (#layout-main) içine portal edilir —
 *      yani sol/sağ paneller dışarıda kalır, üstte ve tıklanabilir olur.
 *   2) `role="dialog"` + `aria-modal="false"` + `aria-label` ("Ayarlar").
 *   3) Açıkken ORTA İÇERİK (#layout-main-content) `inert`; kapanınca kalkar.
 *      (Sol/sağ paneller inert OLMAZ — onlara dokunulmaz.)
 *   4) X, Esc ve DIŞINA tıklama kapatır; içine tıklama kapatmaz.
 *
 * NEGATİF KONTROL: `side='right'` çekmecesi orta alanı inert YAPMAZ ve
 * kapsayıcının içine portal EDİLMEZ (eski davranış korunur).
 */

/** Sahte kabuk: orta alan + sol panel (Ayarlar'ın dışı). */
function mountHost() {
  document.body.innerHTML = `
    <div id="layout-main">
      <div id="layout-main-content"><p>orta icerik</p></div>
    </div>
    <aside data-testid="left-panel">sol panel</aside>
  `
}

function renderMiddle(onClose = vi.fn(), open = true) {
  const view = render(
    <Drawer open={open} onClose={onClose} side="middle" title="Ayarlar" ariaLabel="Ayarlar">
      <button type="button">panel ici</button>
    </Drawer>,
  )
  return { onClose, view }
}

afterEach(cleanup)

describe('ayarlar orta alan paneli (side="middle")', () => {
  it('orta alan kapsayıcısının içine portal edilir', () => {
    mountHost()
    renderMiddle()
    const dlg = screen.getByRole('dialog')
    const container = document.getElementById('layout-main')!
    expect(container.contains(dlg)).toBe(true)
  })

  it('role=dialog, aria-modal=false ve aria-label tasir', () => {
    mountHost()
    renderMiddle()
    const dlg = screen.getByRole('dialog')
    expect(dlg.getAttribute('aria-modal')).toBe('false')
    expect(dlg.getAttribute('aria-label')).toBe('Ayarlar')
  })

  it('acikken orta icerigi inert yapar, kapaninca kaldirir', () => {
    mountHost()
    const { view } = renderMiddle()
    const content = document.getElementById('layout-main-content')!
    expect(content.hasAttribute('inert')).toBe(true)

    view.rerender(
      <Drawer open={false} onClose={vi.fn()} side="middle" title="Ayarlar">
        <button type="button">panel ici</button>
      </Drawer>,
    )
    expect(content.hasAttribute('inert')).toBe(false)
  })

  it('x butonu kapatir', () => {
    mountHost()
    const { onClose } = renderMiddle()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('esc kapatir', () => {
    mountHost()
    const { onClose } = renderMiddle()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('orta alanin DISINA tiklamak kapatir (sol panel)', () => {
    mountHost()
    const { onClose } = renderMiddle()
    fireEvent.pointerDown(screen.getByTestId('left-panel'))
    expect(onClose).toHaveBeenCalled()
  })

  it('orta alanin ICINE tiklamak kapatmaz', () => {
    mountHost()
    const { onClose } = renderMiddle()
    fireEvent.pointerDown(document.getElementById('layout-main-content')!)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('panel icindeki bir kontrole tiklamak da kapatmaz', () => {
    mountHost()
    const { onClose } = renderMiddle()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'panel ici' }))
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('nEGATIF KONTROL: sag cekmece (side="right")', () => {
  it('orta icerigi inert YAPMAZ', () => {
    mountHost()
    render(
      <Drawer open onClose={vi.fn()} side="right" title="Panel">
        <button type="button">icerik</button>
      </Drawer>,
    )
    const content = document.getElementById('layout-main-content')!
    expect(content.hasAttribute('inert')).toBe(false)
  })

  it('orta alan kapsayicisinin icine portal EDILMEZ', () => {
    mountHost()
    render(
      <Drawer open onClose={vi.fn()} side="right" title="Panel">
        <button type="button">icerik</button>
      </Drawer>,
    )
    const container = document.getElementById('layout-main')!
    expect(container.contains(screen.getByRole('dialog'))).toBe(false)
  })
})
