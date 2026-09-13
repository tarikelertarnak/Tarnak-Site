'use client'

import type { SiteContent } from '@/lib/content'
import { FadeUpSection } from '@/components/fade-up-section'
import { useT } from '@/components/locale-provider'
import { ProjectsGrid } from '@/components/projects/projects-grid'
import { Button } from '@/components/ui/button'
import { FolderIcon, GithubIcon } from '@/components/ui/icons'
import { Section } from '@/components/ui/section'

export function ProjectsSection({
  content,
  githubUsername,
}: {
  content: SiteContent
  githubUsername: string
}) {
  const { t } = useT()

  return (
    <Section className="flex-col pt-8 sm:pt-12 lg:pt-16" id="projects" framed>
      <FadeUpSection className="flex w-full flex-col items-center">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="inline-flex items-center gap-4 border-b-4 border-primary pb-3 text-3xl font-black uppercase tracking-tight text-primary sm:text-4xl lg:text-5xl">
            <FolderIcon size={36} className="inline-block" />
            {content.projects.subtitle}
          </h2>
          <p className="max-w-lg text-sm text-foreground-500">
            {content.projects.description}
          </p>
        </div>

        <div className="mt-6 flex flex-row flex-wrap items-center justify-center gap-2 sm:gap-3">
          <Button
            href="/projects"
            color="primary"
            className="h-11 items-center gap-2 rounded-lg bg-[#e5e7eb] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#d1d5db]"
            endContent={<span aria-hidden="true">→</span>}
          >
            {t('projects.viewAll')}
          </Button>
          <Button
            href="https://github.com/TARIKELER-TARNAK?tab=repositories"
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            className="h-11 items-center gap-2 rounded-lg bg-[#e5e7eb] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#d1d5db]"
            startContent={<GithubIcon size={14} />}
          >
            {t('projects.githubBtn')}
          </Button>
        </div>
      </FadeUpSection>

      <ProjectsGrid
        projects={content.projects.items}
        githubUsername={githubUsername}
      />
    </Section>
  )
}
