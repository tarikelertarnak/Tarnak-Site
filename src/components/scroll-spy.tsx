'use client'

import { useEffect, useState } from 'react'

/**
 * Scrollspy — Faz 5 · 3 (menüde aktif bölüm göstergesi)
 *
 * Sayfa kaydırıldıkça o an GÖRÜNEN bölümü bulup `data-scrollspy` özniteliği
 * ile işaretler. CSS o özniteliği okuyup vurguyu çizer.
 *
 * NEDEN `IntersectionObserver` YERİNE SCROLL HESABI:
 *  · IO "bölüm görüş alanına girdi" anını verir ama KULLANICI hangi
 *    bölümde olduğunu tam söylemez — 300px'lik bir bölümün üst kısmı
 *    görünürken alt kısmı da görünürdür, hangisi aktif belirsizleşir.
 *  · Scroll konumu + bölüm sınırları karşılaştırması kesin cevap verir.
 *  · `requestAnimationFrame` ile kısılır, scroll'ı bloklamaz (passive).
 *
 * ERİŞİLEBİLİRLİK: Bu sadece GÖRSEL bir ipucudur. Klavye/kullanıcı
 * navigasyonu `aria-current="page"` ile zaten çalışıyor; scrollspy ekran
 * okuyucuya ek gürültü yaratmaz (role/status kullanılmıyor).
 */
export function ScrollSpy({
  selector = 'main section[id]',
}: {
  selector?: string
}) {
  const [aktifId, setAktifId] = useState<string | null>(null)

  useEffect(() => {
    let frame = 0
    let bolumler: Array<{ id: string, el: HTMLElement }> = []

    const olustur = () => {
      bolumler = [...document.querySelectorAll<HTMLElement>(selector)]
        .filter(el => el.id)
        .map(el => ({ id: el.id, el }))

      // Eski işaretleri temizle
      for (const b of bolumler) b.el.removeAttribute('data-active')
    }

    const hesapla = () => {
      frame = 0
      if (bolumler.length === 0)
return

      /*
        "Aktif" = görüş alanının ORTASINA en yakın bölümün başlığı.
        Üst kenar (0) yerine orta kullanıyoruz çünkü üstteki bölüm,
        ekranın üst yarısı boşaltıldığında da "hâlâ okunuyor" sayılıyor.
      */
      const isaret = window.scrollY + window.innerHeight * 0.35
      let aktif: string | null = null

      for (const b of bolumler) {
        if (b.el.offsetTop <= isaret)
aktif = b.id
        else break
      }

      // Sayfa sonuna gelindiyse en son bölümü işaretle
      if (
        window.innerHeight + window.scrollY
        >= document.body.offsetHeight - 8
      ) {
        aktif = bolumler[bolumler.length - 1].id
      }

      if (aktif === aktifId)
return
      setAktifId(aktif)

      // DOM işaretlemesi: CSS bunu okuyor (yeniden render maliyeti yok)
      for (const b of bolumler) {
        if (b.id === aktif)
b.el.setAttribute('data-active', 'true')
        else b.el.removeAttribute('data-active')
      }
    }

    const onScroll = () => {
      if (frame)
return
      frame = requestAnimationFrame(hesapla)
    }

    olustur()
    hesapla()

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame)
cancelAnimationFrame(frame)
      for (const b of bolumler) b.el.removeAttribute('data-active')
    }
  }, [selector, aktifId])

  return null
}
