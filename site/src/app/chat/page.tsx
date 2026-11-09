import type { Metadata } from 'next'
import { siteUrl } from '@/lib/site-url'
import { ChatPageClient } from './chat-page-client'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Chat — TARIK ELER - TARNAK',
  description:
    'Tarık Eler (Tarnak) ile sohbet et — yapay zeka destekli chat. Next.js, TypeScript ve yazılım geliştirme hakkında sorularını sor. tarik eler chat, tarnak chat.',
  alternates: { canonical: '/chat' },
  openGraph: {
    type: 'website',
    url: siteUrl('/chat'),
    title: 'Chat — TARIK ELER - TARNAK',
    description:
      'Tarık Eler (Tarnak) ile sohbet et — yapay zeka destekli chat. tarik eler chat.',
    locale: 'tr_TR',
    images: [
      {
        url: `${siteUrl()}/tarnak-logo-512.png`,
        width: 512,
        height: 512,
        alt: 'TARNAK logo',
      },
    ],
  },
  robots: { index: true, follow: true },
}

/**
 * Sohbet sayfası ana düzeni (Server Component).
 *
 * Kurallar (kullanıcı isteği):
 *  · Dış marj/boşluk YOK — sayfa ekranın tamamını kaplar.
 *  · Navigasyon çubuğunun ALTINDA başlar, üzerine gelmez.
 *  · Sayfa kendisi KAYDIRILMAZ (overflow-hidden), yalnız İÇERİŞ kaydırılabilir.
 *  · Üstte sabit admin düzenleme çubuğu (kaydırma etkilemez).
 *  · Arama sağa sabit, "Sayfa Düzenle" (Kaydet/Sıfırla/Sil) en sağda, yalnız adminde.
 *  · Bir mesaja tıklanınca değeri metin alanına otomatik düşer (düzenleme için).
 */
export default function ChatPage() {
  return <ChatPageClient />
}
