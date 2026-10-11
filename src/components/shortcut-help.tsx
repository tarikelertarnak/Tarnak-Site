'use client'

import type { ShortcutSpec } from '@/components/shortcuts'
import { useEffect, useState } from 'react'

/**
 * Kısayol yardım penceresi — `?` tuşu (Faz 5 · 3)
 *
 * Kısayol listesini `GLOBAL_SHORTCUTS`'ten ALIR; ayrı bir liste tutulmaz.
 * Yeni kısayol eklendiğinde burası otomatik güncellenir.
 *
 * `?` yazmak zor: Türkçe klavyede `Shift+/` → `?`. Çoğu tarayıcı bunu
 * `event.key === '?'` olarak verir. Ek olarak `event.key === '/'` +
 * `event.shiftKey` durumunu da kabul ediyoruz (klavyeye göre değişebiliyor).
 *
 * Erişilebilirlik: `role="dialog"` + `aria-modal`, ESC kapatır, odak
 * penceredeki kapatma düğmesine taşınır, kapanınca odak geri döner.
 */
export function ShortcutHelp({ shortcuts }: { shortcuts: ShortcutSpec[] }) {
  const [acik, setAcik] = useState(false)
  const [oncekiOdak, setOncekiOdak] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const hedef = e.target as HTMLElement | null
      // Yazarken açılmasın (yoksa "ne yazıyorum?" olur)
      const yaziyor =
        hedef?.tagName === 'INPUT' ||
        hedef?.tagName === 'TEXTAREA' ||
        hedef?.isContentEditable
      if (yaziyor) return

      const soruIsareti = e.key === '?' || (e.key === '/' && e.shiftKey)
      if (!soruIsareti) return

      e.preventDefault()
      setAcik((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Açılırken odak düğmeye, kapanırken eski yere
  useEffect(() => {
    if (acik) {
      setOncekiOdak(document.activeElement as HTMLElement | null)
      requestAnimationFrame(() =>
        document.getElementById('kisayol-kapat')?.focus(),
      )
    } else if (oncekiOdak) {
      oncekiOdak.focus()
    }
  }, [acik, oncekiOdak])

  useEffect(() => {
    if (!acik) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAcik(false)
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [acik])

  if (!acik) return null

  const gorunurler = shortcuts.filter((s) => s.label)

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      onClick={() => setAcik(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kisayol-baslik"
        className="w-full max-w-md rounded-xl border border-foreground/10 bg-background p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="kisayol-baslik" className="text-base font-bold">
            Klavye kısayolları
          </h2>
          <button
            id="kisayol-kapat"
            type="button"
            onClick={() => setAcik(false)}
            aria-label="Kapat"
            className="rounded-full px-2 py-1 text-lg leading-none text-foreground/50 transition-colors hover:text-foreground"
          >
            <span aria-hidden>×</span>
          </button>
        </div>

        <ul className="space-y-2">
          {gorunurler.map((s) => (
            <li
              key={`${s.ctrl ? 'c' : ''}${s.key}`}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-sm text-foreground/75">{s.label}</span>
              <kbd className="shrink-0 rounded border border-foreground/15 bg-foreground/5 px-1.5 py-0.5 text-[11px] font-medium">
                {isMac() ? '⌘' : 'Ctrl'}
                {' + '}
                {tusa(s.key)}
              </kbd>
            </li>
          ))}
        </ul>

        <p className="mt-4 border-t border-foreground/10 pt-3 text-xs text-foreground/45">
          Bu pencereyi açmak için{' '}
          <kbd className="rounded border border-foreground/15 px-1 py-0.5">
            ?
          </kbd>{' '}
          tuşuna bas.
        </p>
      </div>
    </div>
  )
}

function isMac(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad/.test(navigator.platform || '')
  )
}

/** `ArrowUp` → `↑`, `/` → `/` gibi okunur kısayol gösterimi. */
function tusa(key: string): string {
  const harita: Record<string, string> = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    '/': '/',
    '?': '?',
  }
  return harita[key] ?? key.toUpperCase()
}
