import type { Metadata } from 'next'
import { Chat } from '@/components/chat/chat'
import { Section } from '@/components/ui/section'
import { siteUrl } from '@/lib/site-url'

export const dynamic = 'force-static'

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
    /*
      SAYFA YÜKSEKLİĞİ (2026-10-13 kullanıcı isteği #3: "sohbet sayfasında kayma
      var, düzelt; kaydırma grubun içinde olsun ama o sayfada olmasın").
      `min-h-screen` KALDIRILDI. ÖLÇÜLDÜ: üstteki Akış TopBar'ı için `h-14`
      (56px) yer tutucu AKIŞTA duruyor; sarmalayıcı `min-h-screen` (100vh)
      olduğu için belge her yükseklikte tam 56px taşıyordu (1440x900 → docH
      956, 390x844 → 900) → sayfa kaydırılabiliyor, mesaj gönderildiğinde
      sayfa da kayıyordu. Yüksekliği artık yalnız `main` → `Section` verir
      (`calc(100dvh - 3.5rem)`); belge tam ekrana oturur, kaydırma yalnız
      mesaj alanında olur (bkz. `chat.tsx` → `scrollToBottom`).
    */
    <div className="w-full relative">
      <main id="main" className="">
        {/*
            100svh DEĞİL `calc(100svh - 3.5rem)`: üstte Akıştaki TopBar (h-14 =
            56px) var. Ölçüldü: `min-h-[100svh]` sayfayı her yükseklikte tam
            56px taşırıyordu (900px ekranda belge 956px).

            2026-10-13 (kullanıcı isteği): "Sohbet" BAŞLIK BLOĞU KALDIRILDI —
            boşa yer kaplıyordu.

            2026-10-13 (kullanıcı isteği #2): "dar ekranda kart tam genişlik ve
            tam yükseklik kaplasın; kenar boşluğu en fazla 8-12px olsun".
            `md` ALTINDA (bkz. `chat.tsx` yükseklik notu, kırılma noktası 768px):
              · `Section`'ın yatay dolgusu SIFIRLANIR ve genişlik TELAFİ EDİLİR
                (`-mx-4 w-[calc(100%+2rem)]`, ≥640px'de `-mx-6`/`+3rem`) → kart
                kenardan 8px içeride. ÖLÇÜLDÜ: `Section` `items-center` olduğu
                için yalnız `-mx-4` YETMEZ — öğe kendi genişliğinde ortalandığı
                için negatif boşluk yutulur (kart x=16'da kalıyordu); genişliği
                dolgu kadar artırmak şart.
              · dikey: üstte TopBar + 8px, altta 8px (`pt-2 pb-2`),
              · yükseklik `dvh`: mobil klavye açılınca alan küçülür, yazma alanı
                ekrandan taşmaz.
            `md` VE ÜSTÜNDE eski (geniş) yerleşim AYNEN korunur.
          */}
        <Section className="flex-col min-h-[calc(100dvh-3.5rem)] pt-0 md:min-h-[calc(100svh-3.5rem)] md:pt-20">
          <div
            data-testid="chat-slot"
            className="-mx-4 flex w-[calc(100%+2rem)] flex-1 items-stretch justify-center px-2 pt-2 pb-2 sm:-mx-6 sm:w-[calc(100%+3rem)] md:mx-0 md:w-full md:items-center md:px-4 md:pt-2 md:pb-8"
          >
            <Chat />
          </div>
        </Section>
      </main>
    </div>
  )
}
