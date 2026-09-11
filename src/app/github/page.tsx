import { Navigation } from '@/components/navigation'
import { Section, SectionTitle } from '@/components/ui/section'
import { getLocalizedContent, getLocale } from '@/lib/i18n-server'

export async function generateMetadata() {
  const locale = await getLocale()
  return {
    title: locale === 'en' ? 'GitHub — TARIKELER' : 'GitHub — TARIKELER',
  }
}

export default async function GithubPage() {
  const content = await getLocalizedContent()
  const locale = await getLocale()
  const isEn = locale === 'en'

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <main id="main" className="">
        <Section className="flex-col items-center justify-center pt-32 min-h-[80svh]">
          <SectionTitle
            title=""
            subTitle="GitHub"
            description={
              isEn
                ? 'GitHub integration will be active soon. For now you can browse repos from the projects page.'
                : "GitHub entegrasyonu yakında aktif olacak. Şimdilik projeler sayfasından repo'lara göz atabilirsin."
            }
            big
          />
        </Section>
      </main>
    </div>
  )
}
