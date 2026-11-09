'use client'

import type { ContributionCalendar } from '@/lib/github-contributions'
import type { GithubSnapshotStats } from '@/lib/github-snapshot'
import { useT } from '@/components/locale-provider'
import { GithubIcon } from '@/components/ui/icons'
import { ContributionGraph } from '@/components/now/contribution-graph'

/**
 * `/now` sayfasının GitHub bloğu (2026-10-31).
 *
 * Sunucu bileşeni veriyi build sırasındaki snapshot'tan okur, burada yalnız
 * çizim + aktif dile çeviri yapılır. İstemci tarafında AĞ ÇAĞRISI YOK —
 * `force-static` sayfada boş "yükleniyor" durumu oluşmasın diye.
 */
export function NowGithub({
  calendar,
  stats,
}: {
  calendar: ContributionCalendar | null
  stats: GithubSnapshotStats
}) {
  const { t } = useT()

  const items = [
    { key: 'repos', value: stats.repos, label: t('now.statsRepos') },
    { key: 'stars', value: stats.stars, label: t('now.statsStars') },
    { key: 'followers', value: stats.followers, label: t('now.statsFollowers') },
  ]

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {items.map(item => (
            <div
              key={item.key}
              className="flex min-w-20 flex-col rounded-xl border border-foreground/10 bg-background/60 px-3 py-2"
            >
              <span className="text-xl font-bold leading-tight">{item.value}</span>
              <span className="text-[11px] text-foreground-500">{item.label}</span>
            </div>
          ))}
        </div>

        <a
          href={`https://github.com/${stats.login}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 rounded-xl border border-foreground/10 px-3 py-2 text-xs text-foreground/80 transition-colors hover:border-primary hover:text-primary"
        >
          <GithubIcon size={16} />
          {t('now.profileLink')}
        </a>
      </div>

      {calendar
        ? <ContributionGraph calendar={calendar} />
        : null}
    </div>
  )
}
