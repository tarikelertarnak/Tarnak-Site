'use client'

import { useEffect } from 'react'

/**
 * Kod bloklarına "Kopyala" düğmesi + dil etiketi ekler (Faz 4 · 3)
 *
 * NEDEN DOM MANİPÜLASYONU:
 *  · Blog gövdesi `renderMarkdown()` ile **sunucuda** HTML'e çevrilip
 *    `dangerouslySetInnerHTML` ile basılıyor. İçine React bileşeni
 *    koymanın yolu yok — HTML string'i.
 *  · Bu yüzden hazır `pre > code` blokları hydrate SONRASI gezilip
 *    düğme ekleniyor. Sunucu HTML'i değişmez, JS kapalıyken kod yine
 *    düzgün görünür (sadece düğme olmaz).
 *
 * YENİ BAĞIMLILIK YOK: `navigator.clipboard` tarayıcının kendi API'si.
 *
 * ERİŞİLEBİLİRLİK:
 *  · Düğme gerçek `<button>`, `aria-label` Türkçe.
 *  · Kopyalandığında `aria-live="polite"` ile duyurulur.
 *  · Klavye ile odaklanabilir (sıralı tab düzeni bozulmaz).
 */
export function CodeCopyEnhancer() {
  useEffect(() => {
    const bloklar = document.querySelectorAll('pre')

    for (const pre of bloklar) {
      // Aynı blok iki kez işlenmesin (StrictMode etkisi).
      if (pre.dataset.copyReady === '1') continue
      pre.dataset.copyReady = '1'

      const code = pre.querySelector('code')
      if (!code) continue

      // ── Dil etiketi: `language-ts`, `language-tsx` → "TS" ────────────
      const langClass = [...code.classList].find((c) =>
        c.startsWith('language-'),
      )
      if (langClass) {
        const dil = langClass.replace('language-', '')
        const rozet = document.createElement('span')
        rozet.className = 'code-lang'
        rozet.setAttribute('aria-hidden', 'true')
        rozet.textContent = dil.toUpperCase()
        pre.appendChild(rozet)
      }

      // ── Kopyala düğmesi ──────────────────────────────────────────────
      const dugme = document.createElement('button')
      dugme.type = 'button'
      dugme.className = 'code-copy'
      dugme.setAttribute('aria-label', 'Kodu kopyala')
      dugme.textContent = 'Kopyala'

      dugme.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code.textContent ?? '')
          dugme.textContent = 'Kopyalandı'
          dugme.classList.add('code-copy--done')
          // Ekran okuyucu duyurusu
          dugme.setAttribute('aria-live', 'polite')
        } catch {
          dugme.textContent = 'Kopyalanamadı'
        }
        setTimeout(() => {
          dugme.textContent = 'Kopyala'
          dugme.classList.remove('code-copy--done')
        }, 2000)
      })

      pre.appendChild(dugme)
    }
  }, [])

  return null
}
