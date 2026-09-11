import { ChatWindow } from '@/components/chat/chat-window'
import { Navigation } from '@/components/navigation'
import { Section, SectionTitle } from '@/components/ui/section'
import { getLocalizedContent } from '@/lib/i18n-server'
import { requireUser, sessionUserName } from '@/lib/supabase/session'

export const dynamic = 'force-dynamic'

export default async function ChatPage() {
  // Chat requires login; browsing projects does not.
  const user = await requireUser('/chat')
  const userName = sessionUserName(user)
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
          <ChatWindow content={content} userName={userName ?? ''} />
        </Section>
      </main>
    </div>
  )
}
