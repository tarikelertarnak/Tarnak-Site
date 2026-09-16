import { CopyButton } from '@/components/donate/copy-button'
import { WatchAdSection } from '@/components/donate/watch-ad-section'
import { Navigation } from '@/components/navigation'
import { Section } from '@/components/ui/section'

import { getLocale, getLocalizedContent } from '@/lib/i18n-server'

export async function generateMetadata() {
  const locale = await getLocale()
  const isEn = locale === 'en'
  return {
    title: isEn ? 'Support — TARIK ELER - TARNAK' : 'Destek Ol — TARIK ELER - TARNAK',
    description: isEn
      ? 'If you want to support my projects, you can contribute using the methods below. Every bit of support means a lot to me!'
      : 'Projelerimi desteklemek istersen, aşağıdaki yöntemlerle katkıda bulunabilirsin. Her destek benim için çok değerli!',
  }
}

const METHODS = [
  {
    name: 'GitHub Sponsors',
    noteTr: 'Aylık destek ile projelerin sürekli gelişimini sağla',
    noteEn: 'Support the continuous development of projects with a monthly donation',
    address: 'https://github.com/sponsors/tarikelertarnak',
    icon: (
      <svg viewBox="0 0 24 24" width={28} height={28} fill="currentColor">
        <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-1.93c-3.2.69-3.88-1.54-3.88-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18.92-.26 1.9-.39 2.88-.39.98 0 1.96.13 2.88.39 2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.07.78 2.16v3.2c0 .31.21.66.79.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
      </svg>
    ),
  },
  {
    name: 'Patreon',
    noteTr: 'Tüm projelere erken erişim ve özel içerikler',
    noteEn: 'Early access to all projects and exclusive content',
    address: 'https://www.patreon.com/',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={28} height={28} fill="currentColor">
        <path d="M20.99 7.7c0 .16.01.31 0 .47c-.01.18-.04.36-.07.54c-.05.25-.1.51-.17.76c-.05.18-.11.37-.18.54c-.16.38-.33.76-.56 1.1c-.14.21-.28.42-.43.63c-.06.08-.12.15-.18.22c-.11.12-.22.24-.34.35c-.18.16-.37.31-.56.45c-.18.12-.38.22-.56.34c-.2.13-.43.19-.65.29c-.19.09-.4.12-.59.19c-.25.09-.51.11-.77.17c-.27.06-.55.1-.82.16c-.22.04-.45.1-.67.15c-.13.03-.25.05-.38.09c-.15.05-.3.11-.45.16c-.1.04-.21.06-.3.11c-.14.07-.27.16-.41.23c-.23.12-.42.29-.59.48c-.15.16-.27.34-.4.52c-.21.29-.35.62-.48.96c-.13.33-.24.66-.36.99c-.11.31-.21.63-.33.94c-.1.27-.2.54-.31.81c-.15.39-.34.76-.56 1.11c-.17.27-.34.52-.57.74c-.18.17-.36.35-.58.47s-.45.22-.7.28q-.45.09-.9.06c-.11 0-.23-.04-.34-.06a1 1 0 0 1-.2-.04c-.06-.02-.11-.05-.16-.08c-.15-.07-.31-.13-.45-.22q-.255-.18-.48-.39c-.28-.25-.48-.55-.67-.87c-.13-.21-.24-.43-.34-.66c-.1-.22-.17-.45-.25-.67c-.06-.18-.12-.35-.17-.53c-.05-.16-.08-.32-.12-.48c-.04-.15-.07-.3-.11-.45c-.06-.27-.11-.54-.16-.8c-.02-.11-.05-.23-.07-.34l-.09-.51c-.02-.13-.05-.25-.06-.38l-.06-.42l-.06-.36c-.02-.11-.03-.23-.04-.34c-.02-.12-.03-.24-.05-.36c-.01-.12-.03-.24-.04-.35c-.02-.14-.03-.27-.05-.41c0-.05-.01-.1-.01-.15c-.02-.2-.03-.4-.05-.6c0-.12-.02-.25-.02-.37c-.01-.19-.02-.39-.02-.58c0-.32-.01-.64-.01-.96c0-.19 0-.38.01-.56c.01-.2.04-.39.06-.59c.02-.16.03-.31.05-.47c.01-.09.03-.17.05-.26c.05-.22.09-.43.14-.65c.04-.15.09-.3.13-.46c.08-.29.2-.55.31-.83c.05-.12.12-.24.18-.36c.09-.16.18-.33.29-.48c.13-.19.27-.37.41-.55c.14-.17.28-.33.44-.48c.12-.12.26-.22.38-.33c.13-.11.25-.22.38-.31q.315-.225.63-.42c.12-.08.26-.15.39-.22c.2-.11.4-.22.61-.32c.13-.06.26-.12.4-.18c.34-.14.68-.28 1.03-.41c.23-.08.47-.15.7-.23c.12-.04.24-.08.36-.11c.1-.03.2-.04.3-.07c.11-.02.22-.06.33-.08c.15-.03.3-.05.45-.07c.17-.03.34-.05.51-.08c.07 0 .14 0 .21-.01c.23-.01.47-.03.71-.04c.09 0 .19-.03.28 0c.22.04.44 0 .67.02c.21.01.43.04.64.06c.15.02.3.05.46.07c.13.02.27.03.4.05l.32.06c.23.05.46.1.69.16c.2.05.4.14.6.18c.23.06.45.17.68.24s.43.21.65.3c.26.11.48.27.71.43c.17.12.34.25.5.38c.23.2.46.42.68.64c.13.13.24.28.36.42c.19.23.33.5.46.76c.11.21.2.44.27.66c.06.19.08.39.12.58c.05.21.05.42.04.63Z" />
      </svg>
    ),
  },
  {
    name: 'Ko-fi',
    noteTr: 'Tek seferlik küçük destekler için ideal',
    noteEn: 'Ideal for small one-time supports',
    address: 'https://ko-fi.com/',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={28} height={28} fill="currentColor">
        <path d="M31.844 11.932c-1.032-5.448-6.48-6.125-6.48-6.125H.964C.156 5.807.057 6.87.057 6.87S-.052 16.637.03 22.637c.22 3.228 3.448 3.561 3.448 3.561s11.021-.031 15.953-.067c3.251-.568 3.579-3.423 3.541-4.98c5.808.323 9.896-3.776 8.871-9.219zm-14.751 4.683c-1.661 1.932-5.348 5.297-5.348 5.297s-.161.161-.417.031c-.099-.073-.14-.12-.14-.12c-.595-.588-4.491-4.063-5.381-5.271c-.943-1.287-1.385-3.599-.119-4.948c1.265-1.344 4.005-1.448 5.817.541c0 0 2.083-2.375 4.625-1.281c2.536 1.095 2.443 4.016.963 5.751m8.23.636c-1.24.156-2.244.036-2.244.036V9.714h2.359s2.631.735 2.631 3.516c0 2.552-1.313 3.557-2.745 4.021z" />
      </svg>
    ),
  },
  {
    name: 'Buy Me a Coffee',
    noteTr: 'Bir kahve ısmarla, motivasyon gönder',
    noteEn: 'Buy me a coffee, send some motivation',
    address: 'https://www.buymeacoffee.com/',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={28} height={28} fill="currentColor">
        <path d="m20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379c-.197-.069-.42-.098-.57-.241c-.152-.143-.196-.366-.231-.572c-.065-.378-.125-.756-.192-1.133c-.057-.325-.102-.69-.25-.987c-.195-.4-.597-.634-.996-.788a6 6 0 0 0-.626-.194c-1-.263-2.05-.36-3.077-.416a26 26 0 0 0-3.7.062c-.915.083-1.88.184-2.75.5c-.318.116-.646.256-.888.501c-.297.302-.393.77-.177 1.146c.154.267.415.456.692.58c.36.162.737.284 1.123.366c1.075.238 2.189.331 3.287.37q1.829.074 3.65-.118q.449-.05.896-.119c.352-.054.578-.513.474-.834c-.124-.383-.457-.531-.834-.473c-.466.074-.96.108-1.382.146q-1.767.12-3.536.006a22 22 0 0 1-1.157-.107c-.086-.01-.18-.025-.258-.036q-.364-.055-.724-.13c-.111-.027-.111-.185 0-.212h.005q.416-.09.838-.147h.002c.131-.009.263-.032.394-.048a25 25 0 0 1 3.426-.12q1.011.029 2.017.144l.228.031q.4.06.798.145c.392.085.895.113 1.07.542c.055.137.08.288.111.431l.319 1.484a.237.237 0 0 1-.199.284h-.003l-.112.015a37 37 0 0 1-4.743.295a37 37 0 0 1-4.699-.304c-.14-.017-.293-.042-.417-.06c-.326-.048-.649-.108-.973-.161c-.393-.065-.768-.032-1.123.161c-.29.16-.527.404-.675.701c-.154.316-.199.66-.267 1c-.069.34-.176.707-.135 1.056c.087.753.613 1.365 1.37 1.502a39.7 39.7 0 0 0 11.343.376a.483.483 0 0 1 .535.53l-.071.697l-1.018 9.907c-.041.41-.047.832-.125 1.237c-.122.637-.553 1.028-1.182 1.171q-.868.197-1.756.205c-.656.004-1.31-.025-1.966-.022c-.699.004-1.556-.06-2.095-.58c-.475-.458-.54-1.174-.605-1.793l-.731-7.013l-.322-3.094c-.037-.351-.286-.695-.678-.678c-.336.015-.718.3-.678.679l.228 2.185l.949 9.112c.147 1.344 1.174 2.068 2.446 2.272c.742.12 1.503.144 2.257.156c.966.016 1.942.053 2.892-.122c1.408-.258 2.465-1.198 2.616-2.657l1.024-9.995l.215-2.087a.48.48 0 0 1 .39-.426c.402-.078.787-.212 1.074-.518c.455-.488.546-1.124.385-1.766zm-1.478.772c-.145.137-.363.201-.578.233c-2.416.359-4.866.54-7.308.46c-1.748-.06-3.477-.254-5.207-.498c-.17-.024-.353-.055-.47-.18c-.22-.236-.111-.71-.054-.995c.052-.26.152-.609.463-.646c.484-.057 1.046.148 1.526.22q.865.132 1.737.212c2.48.226 5.002.19 7.472-.14q.675-.09 1.345-.21c.399-.072.84-.206 1.08.206c.166.281.188.657.162.974a.54.54 0 0 1-.169.364zm-6.159 3.9c-.862.37-1.84.788-3.109.788a6 6 0 0 1-1.569-.217l.877 9.004c.065.78.717 1.38 1.5 1.38c0 0 1.243.065 1.658.065c.447 0 1.786-.065 1.786-.065c.783 0 1.434-.6 1.499-1.38l.94-9.95a4 4 0 0 0-1.322-.238c-.826 0-1.491.284-2.26.613" />
      </svg>
    ),
  },
]

export default async function DonatePage() {
  const content = await getLocalizedContent()
  const locale = await getLocale()
  const isEn = locale === 'en'

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <main id="main" className="w-full">
        {/* Hero */}
        <Section className="flex-col pt-28 sm:pt-32 pb-12 sm:pb-16" id="donate">
          <div className="flex flex-col items-center justify-center pb-8 sm:pb-10 lg:pb-12 text-center">
            <h2 className="inline-flex items-center gap-3 border-b-4 border-primary pb-3 text-3xl font-black uppercase tracking-tight text-primary sm:text-4xl lg:text-5xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width={42}
                height={42}
                fill="currentColor"
                className="shrink-0"
              >
                <path d="m21.32 12.05l-2.23-.74c-.81-.27-1.69-.11-2.35.42l-3.4 2.72l-1.17-2.34A2 2 0 0 0 10.38 11H4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h9.62c1.17 0 2.28-.51 3.04-1.4l5.1-5.95c.22-.25.29-.6.2-.92s-.33-.58-.65-.68Zm-6.18 6.25c-.38.44-.93.7-1.52.7H4v-6h6.38l1 2H7v2h6c.23 0 .45-.08.63-.22l4.36-3.49c.13-.11.31-.14.47-.08l.81.27z" />
                <path d="M13.28 10.69a.99.99 0 0 0 1.44 0l3.4-3.57C18.69 6.55 19 5.8 19 5s-.31-1.55-.88-2.12S16.8 2 16 2c-.06 0-1 .02-2 .7c-1-.68-1.85-.74-2-.7c-.8 0-1.56.31-2.12.88C9.31 3.45 9 4.2 9 5s.31 1.56.86 2.1l3.41 3.59Zm-1.98-6.4c.19-.19.44-.29.68-.29c.03 0 .65.04 1.31.71c.39.39 1.02.39 1.41 0c.67-.67 1.29-.71 1.29-.71a.99.99 0 0 1 1 1c0 .27-.1.52-.31.72l-2.69 2.83l-2.71-2.84c-.19-.19-.29-.44-.29-.71s.1-.52.29-.71Z" />
              </svg>
              {isEn ? 'SUPPORT' : 'DESTEK OL'}
            </h2>
          </div>
        </Section>

        {/* Methods table */}
        <Section className="flex-col pb-16 sm:pb-24" framed>
          <div className="mx-auto w-full max-w-4xl">
            <div className="overflow-hidden rounded-2xl border border-foreground-200/10 bg-background">
              {/* Header */}
              <div className="grid grid-cols-1 gap-2 border-b border-foreground-200/10 px-4 py-3 sm:grid-cols-[1.4fr_2fr_auto] sm:px-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
                  {isEn ? 'Method' : 'Yöntem'}
                </span>
                <span className="hidden text-xs font-semibold uppercase tracking-wider text-foreground/50 sm:inline">
                  {isEn ? 'Link' : 'Bağlantı'}
                </span>
                <span className="hidden text-xs font-semibold uppercase tracking-wider text-foreground/50 sm:inline">
                  {isEn ? 'Copy' : 'Kopyala'}
                </span>
              </div>
              {/* Rows */}
              {METHODS.map(m => (
                <div
                  key={m.name}
                  className="grid grid-cols-1 items-center gap-3 border-b border-foreground-200/5 px-4 py-4 last:border-b-0 transition-colors hover:bg-foreground/[0.02] sm:grid-cols-[1.4fr_2fr_auto] sm:gap-4 sm:px-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-foreground-200/10 text-primary">
                      {m.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {m.name}
                      </p>
                      <p className="text-xs text-foreground/60">{isEn ? m.noteEn : m.noteTr}</p>
                    </div>
                  </div>
                  <a
                    href={m.address}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate rounded-lg border border-foreground-200/10 bg-background px-3 py-2 font-mono text-xs text-foreground/85 transition-colors hover:border-primary/40 hover:text-foreground"
                    title={m.address}
                  >
                    {m.address}
                  </a>
                  <CopyButton text={m.address} />
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Watch ad — support without money */}
        <Section className="flex-col pb-16 sm:pb-20" id="reklam-izle">
          <WatchAdSection isEn={isEn} />
        </Section>

        {/* Description */}
        <Section className="flex-col pb-24 sm:pb-32">
          <div className="mx-auto w-full max-w-2xl text-center">
            <p className="text-sm text-foreground/60 sm:text-base">
              {isEn
                ? 'Even if you don\'t support financially — thank you. Using my open source projects, starring them and sharing them helps me a lot too.'
                : 'Destek olmasan bile teşekkürler — açık kaynak projelerimi kullanman, yıldız vermen ve paylaşman da bana çok yardımcı oluyor.'}
            </p>
          </div>
        </Section>
      </main>
    </div>
  )
}
