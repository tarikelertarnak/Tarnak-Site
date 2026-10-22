import type { Metadata } from 'next'
import { FadeUpSection } from '@/components/fade-up-section'
import { ProjectsGrid } from '@/components/projects/projects-grid'
import { RememberListPath } from '@/components/remember-list-path'
import { FolderIcon, GithubIcon } from '@/components/ui/icons'
import { Section, SectionTitle } from '@/components/ui/section'
import { getStaticLocalizedContent } from '@/lib/i18n-server'

// 2026-10-03: ISR KALDIRILDI. revalidate=300 incremental cache (KV) her render'da bir OKUMA+YAZMA yapiyordu; Workers Free 10 ms CPU limitinde bu I/O worker'i asiliyordu (/donate 20 sn+ sonsuz timeout, bazen 200). Sayfa artik tam statik: KV yok, render yok. Admin icerik degisikligi deploy ile yayinlanir.
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'PROJECTS — TARIK ELER - TARNAK',
  description:
    'Open-source projects developed by TARIK ELER (Tarnak): desktop applications, web tools, browser extensions and AI projects. Downloadable builds for Windows, macOS and Linux.',
  alternates: { canonical: '/projects' },
  openGraph: {
    title: 'PROJECTS — TARIK ELER - TARNAK',
    description:
      'Open-source projects: desktop applications, web tools, browser extensions and AI projects.',
    url: '/projects',
    type: 'website',
  },
}

export default async function ProjectsPage() {
  const content = await getStaticLocalizedContent()

  return (
    <div className="min-h-screen w-full relative">
      <RememberListPath path="/projects" />
      <main id="main" className="w-full">
        {/*
          BAŞLIK GRUBUN İÇİNDE (2026-10-21, kullanıcı: "PROJECTS yazısı da
          grubun içinde değil, BLOG'a bak ondan öğren").
          `/blog` düzeni referans alındı: `SectionTitle` `framed` Section'ın
          İÇİNDE, içerikle aynı grupta. Boşlukları `--section-gap` verir,
          elle `pt-*`/`pb-*` yazılmaz.
        */}
        <Section className="flex-col pt-28 sm:pt-32 pb-16 sm:pb-20 lg:pb-24" framed>
          <SectionTitle
            title=""
            subTitle={content.projects.subtitle}
            description={content.projects.description}
            icon={<FolderIcon size={36} className="inline-block" />}
            headingLevel="h1"
            big
            tightGap
          />
          <div aria-hidden className="h-[var(--section-gap)]" />

          {/* GitHub Projects button */}
          <FadeUpSection className="w-full">
            <div className="mx-auto flex w-full max-w-6xl flex-row flex-wrap items-center justify-center gap-3">
              <a
                href="https://github.com/tarikelertarnak?tab=repositories"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg no-underline transition-colors hover:bg-primary/90"
              >
                {/* GitHub logosu: `text-white` ACIK temada beyaz kalıyordu ve mavi
                zemin üstünde zor okunuyordu. `text-primary-fg` tema ile birlikte
                çözülüyor: açık temada siyah, koyu temada beyaz — buton yazısıyla
                birebir aynı renk. */}
                <GithubIcon size={14} className="shrink-0 text-primary-fg" />
                {content.github.title}
              </a>
            </div>
          </FadeUpSection>
          {/* BOLUM BOSLUGU (2026-10-06): GitHub butonu ile arama kutusu
              arasinda mb-8 (32px) vardi; --section-gap ile esitlendi. */}
          <div aria-hidden className="h-[var(--section-gap)]" />

          <FadeUpSection className="w-full" stagger={0.08}>
            <ProjectsGrid
              projects={content.projects.items}
              githubUsername={content.settings.githubUsername}
              /* 2026-10-07 (kullanıcı): "Projeler sayfasında daha fazlasını
                   göster olmasın, direkt hepsi gözüksün; o olay ana sayfada
                   olsun." → Bu sayfada sayfalama KAPALI, tüm kartlar baştan. */
              paginate={false}
            />
          </FadeUpSection>
        </Section>
      </main>
    </div>
  )
}
