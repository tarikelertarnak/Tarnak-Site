'use client'

import { useEffect, useRef } from 'react'

/**
 * Okuma ilerleme çubuğu (Faz 4 · 3)
 *
 * Sayfanın ne kadarının okunduğunu üstte ince bir çizgiyle gösterir.
 *
 * NASIL HESAPLANIYOR:
 *   İlerleme = (görünüm alanının altı - kaydırma konumu) / okunabilir alan
 *   okunabilir alan = içeriğin altı - üstü  →  yazı %0 = %100.
 *   Bu, blog yazısı gibi sabit yükseklikli sayfalarda doğru çalışır; çok
 *   uzun sayfalarda "okunan miktar" değil "sayfanın ne kadarı görüldü"
 *   demektir (okunabilir alan = viewport olduğu için hep %100'e gider —
 *   o yüzden makale kapsayıcısının altını referans alıyoruz).
 *
 * PERFORMANS:
 *   · `scroll` dinleyicisi PASSIVE (kaydırmayı bloklamaz)
 *   · `requestAnimationFrame` ile kısılır (her scroll olayında DOM
 *     güncellemek yerine kare başına bir kez)
 *   · Sadece `transform: scaleX()` yazılır → GPU katmanı, reflow yok
 */
export function ReadingProgress({ targetId }: { targetId?: string }) {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return

    let frame = 0

    const hesapla = () => {
      frame = 0
      const kapsayici = targetId
        ? document.getElementById(targetId)
        : document.documentElement
      if (!kapsayici) return

      const govde = kapsayici.getBoundingClientRect()
      const baslangic = -govde.top + window.scrollY
      const bitis = baslangic + govde.height
      const gorunur = window.scrollY + window.innerHeight
      const okunabilir = bitis - baslangic - window.innerHeight

      if (okunabilir <= 0) {
        bar.style.transform = 'scaleX(1)'
        return
      }

      const oran = Math.min(1, Math.max(0, (gorunur - baslangic) / okunabilir))
      bar.style.transform = `scaleX(${oran})`
    }

    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(hesapla)
    }

    hesapla()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [targetId])

  return (
    <div
      ref={barRef}
      className="reading-progress"
      role="progressbar"
      aria-label="Okuma ilerlemesi"
      aria-valuemin={0}
      aria-valuemax={100}
    />
  )
}
