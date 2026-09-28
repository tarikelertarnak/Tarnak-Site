'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/components/locale-provider'
import { EyeIcon } from '@/components/ui/icons'
import { recordProjectView } from '@/lib/project-stats'

/**
 * /github/OWNER/REPO ayna sayfası.
 *
 * Bu sayfa içerik barındırmaz: GitHub benzeri bir ayna olduğunu gösterir ve
 * gerçek repo sayfasına yönlendirir. Ziyaret ilk kez sayılır (dedup).
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
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const count = recordProjectView(title)
    setViews(count)

    // Kullanıcı beklemesin: gerçek GitHub sayfasını aç.
    const go = window.setTimeout(() => {
      setLeaving(true)
      window.location.replace(githubUrl)
    }, 700)

    return () => window.clearTimeout(go)
  }, [title, githubUrl])

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <span
        className="inline-flex items-center gap-1 rounded-full border border-foreground-200/15 bg-background px-2 py-1 text-sm text-foreground/80"
        title={t('projects.viewsTitle')}
      >
        <EyeIcon size={14} />
        {' '}
        {views}
      </span>
      <a
        href={githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          setLeaving(true)
          recordProjectView(title)
        }}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-white no-underline transition-colors hover:bg-primary/90"
      >
        {t('projects.openGithub')}
      </a>
      {leaving && (
        <span className="text-xs text-foreground-500">{t('projects.opening')}</span>
      )}
    </div>
  )
}
