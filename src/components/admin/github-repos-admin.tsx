'use client'

import type { ProjectItem, SiteContent } from '@/lib/content'
import type { GitHubRepo } from '@/lib/github'
import { Icon } from '@iconify/react'
import { PanelCard } from '@/components/admin/panel-card'
import { VisibilitySwitch } from '@/components/admin/visibility-switch'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'

interface Props {
  githubRepos: GitHubRepo[]
  content: SiteContent
  setContent: React.Dispatch<React.SetStateAction<SiteContent>>
}

export function GitHubReposAdmin({ githubRepos, content, setContent }: Props) {
  const items = content.projects.items

  const setProject = (index: number, patch: Partial<ProjectItem>) => {
    setContent(prev => ({
      ...prev,
      projects: {
        ...prev.projects,
        items: prev.projects.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
      },
    }))
  }

  const isVisible = (item: ProjectItem) => {
    if (item.visible === false || item.isVisible === false || item.hidden === true)
return false
    return true
  }

  const visibleCount = items.filter(isVisible).length

  return (
    <PanelCard title={`GitHub Repoları (${githubRepos.length})${items.length ? ` · ${visibleCount} görünür / ${items.length} toplam` : ''}`}>
      <p className="mb-3 text-xs text-foreground-500">
        GitHub hesabındaki public repo'lar. Sitede görünürlüğünü switch ile ayarla; "Düzenle" ile formu doldur.
      </p>
      {githubRepos.length === 0 ? (
        <p className="text-xs text-foreground-500">
          Repo listesi yükleniyor veya alınamıyor (GitHub kullanıcı adı ayarla: Site › GitHub Kullanıcı Adı).
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {githubRepos.map((repo) => {
            const idx = items.findIndex(p => p.title === repo.name)
            const inSite = idx >= 0
            const item = inSite ? items[idx] : null
            const hidden = item ? !isVisible(item) : false

            return (
              <div
                key={repo.name}
                className={cn(
                  'flex flex-row items-center gap-3 rounded-lg border border-foreground-200/10 p-2.5',
                  hidden && 'opacity-60',
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                    <span className="truncate">{repo.name}</span>
                    {hidden && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                        Gizli
                      </span>
                    )}
                  </p>
                  {repo.description && (
                    <p className="truncate text-xs text-foreground-500">{repo.description}</p>
                  )}
                  <p className="mt-0.5 text-[10px] text-foreground-600">
                    ★
{' '}
{repo.stars}
{' '}
·
{' '}
{repo.forks}
{' '}
fork ·
{' '}
{repo.language ?? '—'}
                  </p>
                </div>
                {inSite && item && (
                  <div className="flex shrink-0 items-center gap-2">
                    <VisibilitySwitch
                      checked={isVisible(item)}
                      onChange={checked => setProject(idx, { visible: checked, isVisible: checked, hidden: !checked })}
                      ariaLabel={`${repo.name} görünürlüğü`}
                    />
                    <Button
                      size="sm"
                      variant="bordered"
                      startContent={<Icon icon="mdi:pencil" width={16} height={16} />}
                      onPress={() => {
                        // "Düzenle" = Sayfa Düzenle sekmesindeki proje formuna
                        // atla (2026-10-20). Kartta id var; sekme şeridi ve
                        // panelin kendisi ayrı bileşen olduğu için önce
                        // sekme değişimi tetiklenir, sonra o karta kaydırılır.
                        window.dispatchEvent(new CustomEvent('admin:edit-project', { detail: { index: idx } }))
                      }}
                    >
                      Düzenle
                    </Button>
                  </div>
                )}
                {!inSite && (
                  <Button
                    size="sm"
                    color="primary"
                    variant="bordered"
                    onPress={() => {
                      // add to site
                      const [owner, repoName] = repo.fullName.split('/')
                      setContent((prev) => {
                        if (prev.projects.items.some(p => p.title === repo.name))
return prev
                        const newItem: ProjectItem = {
                          title: repo.name,
                          notice: '',
                          description: repo.description ?? '',
                          projectLink: `/github/${owner}/${repoName}`,
                          srcLink: repo.url,
                          image: '',
                          stars: repo.stars,
                          forks: repo.forks,
                          updatedAt: repo.updatedAt,
                          tags: repo.topics ?? [],
                          visible: true,
                        }
                        return {
                          ...prev,
                          projects: { ...prev.projects, items: [newItem, ...prev.projects.items] },
                        }
                      })
                    }}
                  >
                    Düzenle
                  </Button>
                )}
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-foreground-500 hover:text-primary"
                >
                  GitHub ↗
                </a>
              </div>
            )
          })}
        </div>
      )}
    </PanelCard>
  )
}
