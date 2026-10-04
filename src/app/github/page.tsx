import { Navigation } from '@/components/navigation'
import { Section, SectionTitle } from '@/components/ui/section'
import { getStaticLocale, getStaticLocalizedContent } from '@/lib/i18n-server'

// 2026-10-03: ISR KALDIRILDI. revalidate=300 incremental cache (KV) her render'da bir OKUMA+YAZMA yapiyordu; Workers Free 10 ms CPU limitinde bu I/O worker'i asiliyordu (/donate 20 sn+ sonsuz timeout, bazen 200). Sayfa artik tam statik: KV yok, render yok. Admin icerik degisikligi deploy ile yayinlanir.
export const dynamic = 'force-static'

export async function generateMetadata() {
  const locale = await getStaticLocale()
  const isEn = locale === 'en'
  const title = 'GitHub Projeleri — TARIK ELER - TARNAK'
  const description = isEn
    ? 'Open source repositories by TARIK ELER (Tarnak) — web apps, desktop apps, browser extensions and AI tools.'
    : 'TARIK ELER (Tarnak) tarafından geliştirilen açık kaynak GitHub depoları — web uygulamaları, masaüstü uygulamaları, tarayıcı eklentileri ve yapay zeka araçları.'
  return {
    title,
    description,
    alternates: { canonical: '/github' },
    openGraph: { title, description, url: '/github', type: 'website' },
  }
}

export default async function GithubPage() {
  const content = await getStaticLocalizedContent()
  const locale = await getStaticLocale()
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
                : 'GitHub entegrasyonu yakında aktif olacak. Şimdilik projeler sayfasından repo\'lara göz atabilirsin.'
            }
            big
          />
        </Section>
      </main>
    </div>
  )
}
