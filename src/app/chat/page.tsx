import type { Metadata } from 'next'
import { ChatV2 } from '@/components/chat/chat-v2'
import { Navigation } from '@/components/navigation'
import { ChatIcon } from '@/components/ui/icons'
import { Section, SectionTitle } from '@/components/ui/section'
import { getLocalizedContent } from '@/lib/i18n-server'
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

export default async function ChatPage() {
  /*
    Chat v2 — oturum ve sohbet İSTEMCİDE çözümlenir.
    Gerekçe: root layout 'force-static' olduğu için sunucuda cookies() boş
    dönüyor ve burada getSessionUser() her zaman null kalıyordu. Layout'a
    dokunmuyoruz (1102 nedeniyle bilinçli); bunun yerine /api/admin/session
    route handler'ı (layout dışında, çerezi doğru okuyor) kullanılıyor.
    Sayfa yalnızca SEO/yerleşim için sunucuda render edilir.
  */
  const content = await getLocalizedContent()

  return (
    <div className="min-h-screen w-full relative">
      <Navigation />
      <main id="main" className="">
        {/*
            `100svh` DEĞİL `calc(100svh - 3.5rem)`: üstte sabit TopBar (h-14 =
            56px) var. Ölçüldü: `min-h-[100svh]` sayfayı her yükseklikte tam
            56px taşırıyordu (900px ekranda belge 956px).
          */}
          <Section className="flex-col min-h-[calc(100svh-3.5rem)] pt-24 sm:pt-28 lg:pt-32">
          {/*
            DÜZELTME 2026-10-11 (kullanıcı: "chat başlığı grubun içine giriyor").

            Başlık `absolute` idi; sohbet kartı ise `flex-1` ile ortalanıyordu.
            Kısa ekranlarda ikisi ÇAKIŞIYORDU — başlık kartın içine giriyordu.
            2026-10-06'daki "kart çok altta kalsın" düzeltmesinin bedeli buydu.

            Çözüm: başlık akışa alındı (kutu + başlık artık kardeş, asla üst
            üste binmez) ve kartın yüksekliği başlığın altında kalan alana
            göre sınırlandı.
          */}
          <div className="flex w-full shrink-0 justify-center">
            <SectionTitle
              title=""
              subTitle={content.chat.subtitle}
              description=""
              icon={<ChatIcon size={34} className="inline-block" />}
              big
            />
          </div>
          <div
            data-testid="chat-slot"
            className="flex w-full flex-1 items-center justify-center px-4 pt-4 pb-8 sm:pt-6"
          >
            <ChatV2 />
          </div>
        </Section>
      </main>
    </div>
  )
}
