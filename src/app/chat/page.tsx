import type { Metadata } from 'next'
import { ChatWindow } from '@/components/chat/chat-window'
import { Navigation } from '@/components/navigation'
import { Section, SectionTitle } from '@/components/ui/section'
import { getLocalizedContent } from '@/lib/i18n-server'
import { getSessionUser, sessionUserName } from '@/lib/supabase/session'
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
  alternates: { canonical: siteUrl('/chat') },
  openGraph: {
    type: 'website',
    url: siteUrl('/chat'),
    title: 'Tarık Eler Chat | TARIK ELER - TARNAK',
    description:
      'Tarık Eler (Tarnak) ile sohbet et — yapay zeka destekli chat. tarik eler chat.',
    locale: 'tr_TR',
    images: [{ url: `${siteUrl()}/tarnak-logo-512.png`, width: 512, height: 512, alt: 'TARNAK logo' }],
  },
  robots: { index: true, follow: true },
}

export default async function ChatPage() {
  // Chat no longer requires login on the PAGE level (SEO visibility for
  // "tarik eler chat" searches); auth lives in the API layer. Logged-in users
  // get their name; anonymous visitors just see the window (writes still 401).
  const user = await getSessionUser()
  const userName = user ? (sessionUserName(user) ?? '') : ''
  const content = await getLocalizedContent()

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <main id="main" className="">
        <Section className="flex-col pt-24 sm:pt-28 lg:pt-32 min-h-[100svh]">
          <SectionTitle
            title={content.chat.title}
            subTitle={content.chat.subtitle}
            description={content.chat.description}
          />
          <ChatWindow content={content} userName={userName} />
        </Section>
      </main>
    </div>
  )
}
