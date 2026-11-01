'use client'

import { useCallback } from 'react'
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

  return (
    <div className="w-full h-[calc(100dvh-3.5rem)] overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto bg-background">
        <Chat
          onMessageClick={onMessageClick}
        />
      </div>
    </div>
  )
}
