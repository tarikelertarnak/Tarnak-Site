import { Navigation } from '@/components/navigation'
import { ProjectsGrid } from '@/components/projects/projects-grid'
import { RememberListPath } from '@/components/remember-list-path'
import { FolderIcon, GithubIcon } from '@/components/ui/icons'
import { Section, SectionTitle } from '@/components/ui/section'
import { getLocalizedContent } from '@/lib/i18n-server'

export const metadata = {
  title: 'Projeler — TARIK ELER - TARNAK',
}

export default async function ProjectsPage() {
  const content = await getLocalizedContent()

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
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#e5e7eb] px-4 py-2 text-sm font-medium text-black no-underline transition-colors hover:bg-[#d1d5db] hover:text-black"
            >
              <GithubIcon size={14} className="text-black" />
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
