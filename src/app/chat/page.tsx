import type { Metadata } from 'next'
import { Chat } from '@/components/chat/chat'
import { Navigation } from '@/components/navigation'
import { Section } from '@/components/ui/section'
import { siteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

// 2026-09-24 (kullanici istegi): "tarik eler chat" gibi aramalar /chat'e
// ulasmali. SAYFA ARTIK LOGIN GEREKTIRMIYOR — crawler'lar sayfayi ve metadata'yi
// gorur (index + snippet), kimligi olan ziyaretci chat'i kullanir. Guvenlik
// API katmaninda korunuyor: mesaj/upload/users route'lari getSessionUser ile
// 401 doner (kimliksiz istek yazamaz). Sayfa goruntuleme kendisi veri sizdirmaz.
export const metadata: Metadata = {
  title: 'Tarık Eler Chat | TARIK ELER - TARNAK',
  description:
    'Tarık Eler (Tarnak) ile sohbet et — yapay zeka destekli chat. Next.js, TypeScript ve yazılım geliştirme hakkında sorularını sor. tarik eler chat, tarnak chat.',
  alternates: { canonical: '/chat' },
  openGraph: {
    type: 'website',
    url: siteUrl('/chat'),
    title: 'Tarık Eler Chat | TARIK ELER - TARNAK',
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

export default function ChatPage() {
  return (
    <div className="min-h-screen w-full relative">
      <Navigation />
      <main id="main" className="">
        {/*
            `100svh` DEĞİL `calc(100svh - 3.5rem)`: üstte sabit TopBar (h-14 =
            56px) var. Ölçüldü: `min-h-[100svh]` sayfayı her yükseklikte tam
            56px taşırıyordu (900px ekranda belge 956px).

            2026-10-13 (kullanıcı isteği): "Sohbet" BAŞLIK BLOĞU KALDIRILDI —
            boşa yer kaplıyordu. Sohbet kutusu artık boşalan yüksekliği
            kullanır (`h-[calc(100svh-11rem)]` = 100svh eksi TopBar 56px +
            bölüm üst payı 80px + slot payları 40px).
          */}
          <Section className="flex-col min-h-[calc(100svh-3.5rem)] pt-20">
          <div
            data-testid="chat-slot"
            className="flex w-full flex-1 items-center justify-center px-4 pt-2 pb-8"
          >
            <Chat />
          </div>
        </Section>
      </main>
    </div>
  )
}
