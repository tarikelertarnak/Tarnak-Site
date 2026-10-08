'use client'

import { useEffect, useState } from 'react'

/**
 * Duyuru bandı (Faz 5 · 3)
 *
 * Üstte ince, kapatılabilir bant. İçerik `content.announcement` alanından
 * gelir — metin YOKSA render edilmez (boş bant araya girmez).
 *
 * KAPATMA HATIRLANIR: `localStorage` anahtarı. Aynı cihazda ikinci kez
 * görünmez. Anahtar sürümümlü (`v1`) → metin değişirse yeniden görünür.
 *
 * GÖRÜNÜRLÜK: Sabit (fixed) değil — sayfa akışında yer alır, içeriği
 * itmez çünkü `sticky` değil normal akışta. Kullanıcı "yukarı çık" dediğinde
 * da görünür kalır, bu yüzden kapatma düğmesi her zaman erişilebilir.
 *
 * Erişilebilirlik: `role="status"` → ekran okuyucu metni duyurur.
 */
const KAPATMA_ANAHTARI = 'announcement-dismissed-v1'

export function AnnouncementBanner() {
  const [gizli, setGizli] = useState(true)
  const [mesaj, setMesaj] = useState<string | null>(null)

  useEffect(() => {
    // İçerik HTML'den geliyor: sunucu tarafında okunabilir ama bileşen
    // istemci olduğu için ilk render'da gizli başlar (hydration uyumu).
    const el = document.querySelector<HTMLElement>('[data-announcement-text]')
    const ham = el?.textContent?.trim() ?? ''
    if (!ham) return

    try {
      if (localStorage.getItem(KAPATMA_ANAHTARI) === ham) return
    }
    catch {
      /* localStorage kapalıysa (gizli sekme) — göster, hata verme */
    }

    setMesaj(ham)
    setGizli(false)
  }, [])

  const kapat = () => {
    setGizli(true)
    try {
      if (mesaj) localStorage.setItem(KAPATMA_ANAHTARI, mesaj)
    }
    catch { /* yoksay */ }
  }

  if (gizli || !mesaj) return null

  return (
    <div
      role="status"
      className="relative w-full border-b border-foreground/10 bg-primary/10 px-4 py-2 text-center text-sm text-foreground/80"
    >
      <p data-announcement-text className="mx-auto max-w-4xl pr-8">{mesaj}</p>
      <button
        type="button"
        onClick={kapat}
        aria-label="Duyuruyu kapat"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-lg leading-none text-foreground/50 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span aria-hidden>×</span>
      </button>
    </div>
  )
}