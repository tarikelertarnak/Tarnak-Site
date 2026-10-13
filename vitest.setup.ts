/**
 * jsdom eksiklerini kapatır (vitest `setupFiles`).
 *
 * `ResizeObserver`: admin sekme şeridi (`ScrollableTabs` → `useScrollState`)
 * şerit ölçüsünü buna bağlar; jsdom'da tanımlı değil, aksi halde bileşeni
 * render eden her test "ResizeObserver is not defined" ile patlar.
 */
import { configure } from '@testing-library/react'

/**
 * `waitFor`/`findBy*` varsayılan bütçesi 1 sn; paralel koşuda (61 dosya, aynı
 * anda 8+ jsdom ortamı) ağır bileşenlerin mount'u bunu aşabiliyordu —
 * `chat.admin.test.tsx` "Merhaba de!" testi bu yüzden ara sıra düşüyordu
 * (2026-10-13). 3 sn'ye çıkarıldı: bekleme süresi uzar, iddialar aynı kalır.
 */
configure({ asyncUtilTimeout: 3000 })

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

/**
 * `Element.prototype.scrollTo`: jsdom'da yok; `useScrollState.scrollToTab`
 * aktif sekmeyi ortalarken çağırıyor. Gerçek tarayıcıda etkisi olan bir
 * API olduğu için burada sadece "patlamasın" diye boş bırakılıyor.
 */
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {}
}

/**
 * `window.scrollTo`: jsdom bunu "Not implemented" diye log atarak tanımlar
 * (test kırmaz ama stderr'i kirletir). Sekme şeridi başlığı görünür alana
 * getirmek için çağırıyor — ölçülecek bir şey olmadığı için boş bırakılıyor.
 */
globalThis.scrollTo = () => {}
