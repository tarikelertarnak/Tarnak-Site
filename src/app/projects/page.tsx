import type { Metadata } from 'next'
import { Navigation } from '@/components/navigation'
import { ProjectsGrid } from '@/components/projects/projects-grid'
import { RememberListPath } from '@/components/remember-list-path'
import { FolderIcon, GithubIcon } from '@/components/ui/icons'
import { Section, SectionTitle } from '@/components/ui/section'
import { getStaticLocalizedContent } from '@/lib/i18n-server'

// 2026-10-03: ISR KALDIRILDI. revalidate=300 incremental cache (KV) her render'da bir OKUMA+YAZMA yapiyordu; Workers Free 10 ms CPU limitinde bu I/O worker'i asiliyordu (/donate 20 sn+ sonsuz timeout, bazen 200). Sayfa artik tam statik: KV yok, render yok. Admin icerik degisikligi deploy ile yayinlanir.
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Projeler — TARIK ELER - TARNAK',
  description:
    'TARIK ELER (Tarnak) tarafından geliştirilen açık kaynak projeler: masaüstü uygulamalar, web araçları, tarayıcı eklentileri ve yapay zeka projeleri. Windows, macOS ve Linux için indirilebilir sürümler.',
  alternates: { canonical: '/projects' },
  openGraph: {
    title: 'Projeler — TARIK ELER - TARNAK',
    description:
      'Açık kaynak projeler: masaüstü uygulamalar, web araçları, tarayıcı eklentileri ve yapay zeka projeleri.',
    url: '/projects',
    type: 'website',
  },
}

export default async function ProjectsPage() {
  const content = await getStaticLocalizedContent()

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <RememberListPath path="/projects" />
      <main id="main" className="w-full">
        <Section
          className="flex-col pt-24 sm:pt-28 lg:pt-32 min-h-[100svh]"
          framed
        >
          <SectionTitle
            title=""
            subTitle={content.projects.subtitle}
            description={content.projects.description}
            icon={<FolderIcon size={36} className="inline-block" />}
            big
          />

          {/* GitHub Projects button */}
          <div className="mx-auto mb-8 flex w-full max-w-6xl flex-row flex-wrap items-center justify-center gap-2">
            <a
              href="https://github.com/tarikelertarnak?tab=repositories"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white no-underline transition-colors hover:bg-primary/90 hover:text-white"
            >
              <GithubIcon size={14} className="text-white" />
              {content.github.title}
            </a>
          </div>

          <ProjectsGrid
            projects={content.projects.items}
            githubUsername={content.settings.githubUsername}
          />
        </Section>
      </main>
    </div>
  )
}
