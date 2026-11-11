'use client'

import type { ProjectItem, SiteContent } from '@/lib/content'
import type { GitHubRepo } from '@/lib/github'
import { Icon } from '@iconify/react'
import { useState } from 'react'
import { PanelCard } from '@/components/admin/panel-card'
import {
  draftToProject,
  emptyProjectDraft,
  projectToDraft,
  ProjectModal,
} from '@/components/admin/project-modal'
import type { ProjectDraft } from '@/components/admin/project-modal'
import { VisibilitySwitch } from '@/components/admin/visibility-switch'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'

interface Props {
  githubRepos: GitHubRepo[]
  content: SiteContent
  setContent: React.Dispatch<React.SetStateAction<SiteContent>>
}

/**
 * GitHub Repoları kartı (2026-11-11 yeniden tasarım).
 *
 * · "Düzenle" → ORTAK proje modalı ("Yeni Proje Ekle" ile AYNI), içeriği
 *   otomatik dolu: başlık/açıklama/linkler + ETİKETLER (repo topics) +
 *   LİSANS (repo.license).
 * · Düzen site dilinde: satır kartı, küçük "Düzenle" butonu, harici bağlantı.
 */
export function GitHubReposAdmin({ githubRepos, content, setContent }: Props) {
  const items = content.projects.items
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<ProjectDraft>(emptyProjectDraft())
  const [editingIdx, setEditingIdx] = useState<number | null>(null)

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

  /** Repoyu düzenle / yeni proje olarak ekle — modal içeriği OTOMATİK dolar. */
  const openForRepo = (repo: GitHubRepo) => {
    const idx = items.findIndex(p => p.title === repo.name)
    if (idx >= 0) {
      setEditingIdx(idx)
      setDraft({
        ...projectToDraft(items[idx]),
        // Etiketler: kayıttakiler varsa onlar, yoksa GitHub topics.
        tags: items[idx].tags?.length ? items[idx].tags! : (repo.topics ?? []),
        license: items[idx].license ?? repo.license ?? '',
      })
    }
    else {
      setEditingIdx(null)
      setDraft({
        ...emptyProjectDraft(),
        title: repo.name,
        description: repo.description ?? '',
        projectLink: repo.url,
        srcLink: repo.url,
        license: repo.license ?? '',
        tags: repo.topics ?? [],
      })
    }
    setModalOpen(true)
  }

  const save = (d: ProjectDraft) => {
    const patch = draftToProject(d)
    if (editingIdx === null) {
      if (items.some(p => p.title === patch.title)) {
        setModalOpen(false)
        return
      }
      setContent(prev => ({
        ...prev,
        projects: {
          ...prev.projects,
          items: [{ ...patch } as ProjectItem, ...prev.projects.items],
        },
      }))
    }
    else {
      setProject(editingIdx, patch)
    }
    setModalOpen(false)
  }

  return (
    <PanelCard title={`GitHub Repoları (${githubRepos.length})${items.length ? ` · ${visibleCount} görünür / ${items.length} toplam` : ''}`}>
      <p className="mb-3 text-xs text-foreground-500">
        GitHub hesabındaki public repo'lar. &quot;Düzenle&quot; formu doldurur; sitede
        görünürlüğü switch ile ayarla.
      </p>

      {githubRepos.length === 0 ? (
        <p className="text-xs text-foreground-500">
          Repo listesi yükleniyor veya alınamıyor (GitHub kullanıcı adı ayarla: Site › GitHub Kullanıcı Adı).
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {githubRepos.map((repo) => {
            const idx = items.findIndex(p => p.title === repo.name)
            const inSite = idx >= 0
            const item = inSite ? items[idx] : null
            const hidden = item ? !isVisible(item) : false

            return (
              <li
                key={repo.name}
                className={cn(
                  'flex flex-row items-center gap-3 rounded-lg border border-foreground-200/10 p-3',
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
                    ★{' '}
                    {repo.stars}
                    {' · '}
                    {repo.forks} fork · {repo.language ?? '—'}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {inSite && item && (
                    <VisibilitySwitch
                      checked={isVisible(item)}
                      onChange={checked =>
                        setProject(idx, {
                          visible: checked,
                          isVisible: checked,
                          hidden: !checked,
                        })}
                      ariaLabel={`${repo.name} görünürlüğü`}
                    />
                  )}
                  <Button
                    size="sm"
                    variant="bordered"
                    className="h-8 rounded-md text-xs"
                    startContent={<Icon icon="mdi:pencil" width={14} height={14} />}
                    onPress={() => openForRepo(repo)}
                  >
                    Düzenle
                  </Button>
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-foreground-500 transition-colors hover:text-primary"
                  >
                    GitHub ↗
                  </a>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* ORTAK proje modalı — "Yeni Proje Ekle" ile aynı bileşen */}
      <ProjectModal
        key={modalOpen ? 'open' : 'closed'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initial={draft}
        onSave={save}
        title={editingIdx === null ? 'Yeni Proje Ekle' : 'Projeyi Düzenle'}
        saveLabel={editingIdx === null ? 'Ekle' : 'Kaydet'}
      />
    </PanelCard>
  )
}
