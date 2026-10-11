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
        <Section className="flex-col justify-center min-h-[100svh]">
          {/*
            ORTALAMA (2026-10-06, kullanıcı: "çok altta kalmış, ortala").

            Ölçüm (localhost, 943px viewport) — deneme/yanılma:
              önce  kart merkezi y=622   (ekran merkezi 471 → 151px aşağı)
              sonra kart merkezi y=632   (flex-1 ekleyince DAHA KÖTÜ)

            Neden `flex-1` yetmiyor: `flex-1` kartı "başlıktan SONRA kalan
            alanın" ortasına koyar. Başlık bloğu + üst dolgu 208px yer
            kapladığı için kalan alanın merkezi, ekran merkezinden ~104px
            AŞAĞIDA kalıyor — kartı ne kadar "esnetirsek esnetelim" ekran
            ortasına getiremiyoruz. Kartın ekran ortasına gelmesi için
            başlığın akışta YER TUTMAMASI gerekiyor.

            Çözüm: başlık `absolute` (üstte durur, yer kaplamaz), kart
            `flex-1` ile bölümün TAMAMINI doldurur → kart tam ortada.
            Kart 464px, ekran 943px → kart 239..703; başlık 96..192 →
            ÇAKIŞMA YOK.
          */}
          <div className="absolute inset-x-0 top-24 z-10 sm:top-28 lg:top-32">
            <SectionTitle
              title=""
              subTitle={content.chat.subtitle}
              description=""
              icon={<ChatIcon size={34} className="inline-block" />}
              big
            />
          </div>
          <div className="flex w-full flex-1 items-center justify-center px-4">
            <ChatV2 />
          </div>
        </Section>
      </main>
    </div>
  )
}
