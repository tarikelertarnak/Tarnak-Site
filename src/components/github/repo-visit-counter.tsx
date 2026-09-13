'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/components/locale-provider'
import { EyeIcon, GithubIcon } from '@/components/ui/icons'
import { readProjectStats, recordProjectView } from '@/lib/project-stats'

/**
 * /github/OWNER/REPO visit → view counter.
 * Dedup: the same user counts only once if they already saw this project (via the card's
 * Open Page / Open in GitHub, or by visiting this page) — the counter is not incremented.
 */
export function RepoVisitCounter({
  title,
  githubUrl,
}: {
  title: string
  githubUrl: string
}) {
  const { t } = useT()
  const [views, setViews] = useState(0)

  useEffect(() => {
    setViews(recordProjectView(title))
  }, [title])

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <a
        href={githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#e5e7eb] px-3 text-sm font-medium text-black no-underline transition-colors hover:bg-[#d1d5db]"
      >
        <GithubIcon size={15} />
        {t('projects.openGithub')}
      </a>
      <span
        className="inline-flex items-center gap-1 rounded-full border border-foreground-200/15 bg-background px-2 py-1 text-sm text-foreground/80"
        title={t('projects.viewsTitle')}
      >
        <EyeIcon size={14} />
        {' '}
        {views > 0 ? views : readProjectStats(title).views}
      </span>
    </div>
  )
}
