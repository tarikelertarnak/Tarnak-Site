/**
 * GÖRSEL DÜZENLEME OTURUM DURUMU (2026-10-30).
 *
 * Neden ayrı modül: kalem düğmesi `TopBar` içinde, panel ise kök layout'ta
 * AYRI bir ağaçta. React context kurmak için tüm kabuğu sarmalamak gerekirdi;
 * tek baytlık bir bayrak için bu gereksiz. Durum `document.documentElement`
 * üzerinde `data-tar-edit` olarak tutulur (CSS de kullanır) ve değişim
 * `tar:design-mode` olayıyla duyurulur.
 */

export const DESIGN_MODE_EVENT = 'tar:design-mode'

/** Düzenleme modu açık mı? (SSR'da false.) */
export function isDesignMode(): boolean {
  if (typeof document === 'undefined')
    return false
  return document.documentElement.dataset.tarEdit === '1'
}

/** Düzenleme modunu açar/kapatır ve dinleyicilere haber verir. */
export function setDesignMode(on: boolean): void {
  if (typeof document === 'undefined')
    return
  if (on)
    document.documentElement.dataset.tarEdit = '1'
  else
    delete document.documentElement.dataset.tarEdit
  window.dispatchEvent(new CustomEvent(DESIGN_MODE_EVENT, { detail: { on } }))
}

/**
 * Panelin kapladığı genişlik.
 *
 * `#layout-main` bu kadar sağdan boşaltılır — kullanıcı isteği: "yan panel
 * açılsın, düzenlenen ekranı küçültür, üzerine geçmez".
 */
export function applyEditorInset(width: number): void {
  if (typeof document === 'undefined')
    return
  const main = document.getElementById('layout-main')
  if (!main)
    return
  if (width > 0)
    main.style.marginRight = `${width}px`
  else
    main.style.removeProperty('margin-right')
}
