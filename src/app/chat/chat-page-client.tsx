'use client'

import { useCallback, useEffect } from 'react'
import { Chat } from '@/components/chat/chat'

/**
 * Sohbet sayfası client mantığı (Client Component).
 *
 * State yönetimi ve etkileşimler buradadır.
 *
 * 2026-11-02: ChatAdminToolbar (config/Kopyala/Sohbet arama/Kaydet/Sıfırla/Sil)
 * kullanıcı isteğiyle KALDIRILDI. Sadece sade Chat kalıyor.
 */
export function ChatPageClient() {
  const onMessageClick = useCallback((_info: { id: string, className: string }) => {
    // Tıklanan mesajın bilgisi ChatAdminToolbar'da gösterilir (toolbar kaldırıldı)
  }, [])

  // Sayfanın kendisi KAYDIRILAMAZ (2026-11-08 kullanıcı isteği):
  // yalnız sohbet listesi/mesaj alanı kaydırılır. Sayfanın kendisi taşarsa
  // çubuğa hiçbir şey vermez — mount iken kilitle, unmount iken geri al.
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])

  return (
    <div className="w-full h-[calc(100dvh-var(--header-height))] overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 bg-background">
        <Chat
          onMessageClick={onMessageClick}
        />
      </div>
    </div>
  )
}
