'use client'

/**
 * ADMIN KALEMİ (2026-10-30).
 *
 * Kullanıcı isteği: "adminse nav'da arama yanında (solunda) kalem olsun; ona
 * basınca seçme yapar, üzerine geldiğimizde neyin üzerinde olduğumuzu kare
 * gibi gösterir, tıklayınca düzenleriz".
 *
 * Oturum `/admin` ile aynı yerden okunur (`/api/admin/session`) çünkü kök
 * layout `force-static` — sunucuda cookie GÖRÜNMEZ (AGENTS.md §12).
 * Yalnızca admin'e render edilir; tıklama düzenleme modunu açar/kapatır.
 */

import { useEffect, useState } from 'react'
import { isDesignMode, setDesignMode } from '@/lib/design-editor'

export function AdminEditToggle({ className = '' }: { className?: string }) {
  const [admin, setAdmin] = useState(false)
  const [on, setOn] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/session', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      /*
       * ⚠️ Yanıt şekli `{ success, user }` — `user` null olabilir
       * (`/api/admin/session/route.ts`). Önce `data.authenticated` /
       * `data.role` okunuyordu; ikisi de yanıtta YOK, bu yüzden kalem admin
       * oturumu açıkken bile hiç çizilmiyordu (2026-10-30 canlı ölçüm).
       */
      .then((data: { user?: { role?: string, roles?: string[] } | null } | null) => {
        if (cancelled || !data)
          return
        const user = data.user ?? null
        const isAdmin = !!user
          && (user.role === 'admin' || (user.roles ?? []).includes('admin'))
        setAdmin(isAdmin)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setOn(isDesignMode())
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ on: boolean }>).detail
      setOn(!!detail?.on)
    }
    window.addEventListener('tar:design-mode', onChange)
    return () => window.removeEventListener('tar:design-mode', onChange)
  }, [])

  if (!admin)
    return null

  return (
    <button
      type="button"
      aria-label={on ? 'Düzenlemeyi kapat' : 'Sayfayı düzenle'}
      aria-pressed={on}
      title={on ? 'Düzenlemeyi kapat' : 'Sayfayı düzenle (tıkla, öğe seç)'}
      onClick={() => setDesignMode(!on)}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
        on
          ? 'border-primary bg-primary text-primary-fg'
          : 'border-white/10 bg-white/5 text-foreground/60 hover:border-white/25 hover:text-foreground'
      } ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </button>
  )
}
