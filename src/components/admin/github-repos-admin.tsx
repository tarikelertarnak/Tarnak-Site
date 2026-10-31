'use client'

import type { ProjectItem, SiteContent } from '@/lib/content'
import type { GitHubRepo } from '@/lib/github'
import { Icon } from '@iconify/react'
import { PanelCard } from '@/components/admin/panel-card'
import { VisibilitySwitch } from '@/components/admin/visibility-switch'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/components/ui/cn'
import { useState } from 'react'

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

  /** Popup editing state: index of repo being edited (null = create new). */
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState<{
    title: string
    description: string
    projectLink: string
    srcLink: string
    image: string
    tags: string
    visible: boolean
  }>({
    title: '',
    description: '',
    projectLink: '',
    srcLink: '',
    image: '',
    tags: '',
    visible: true,
  })

  const openEdit = (idx: number | null) => {
    setEditingIdx(idx)
    setModalOpen(true)
    if (idx === null) {
      // create new from selected GitHub repo (first matching visible repo)
      setDraft({ title: '', description: '', projectLink: '', srcLink: '', image: '', tags: '', visible: true })
    } else {
      const item = items[idx]
      setDraft({
        title: item.title,
        description: item.description ?? '',
        projectLink: item.projectLink,
        srcLink: item.srcLink ?? '',
        image: item.image,
        tags: (item.tags ?? []).join(', '),
        visible: isVisible(item),
      })
    }
  }

  const saveDraft = () => {
    const tags = draft.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
    const patch: Partial<ProjectItem> = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      projectLink: draft.projectLink.trim(),
      srcLink: draft.srcLink.trim() || undefined,
      image: draft.image.trim(),
      tags,
      visible: draft.visible,
      isVisible: draft.visible,
      hidden: !draft.visible,
    }
    if (editingIdx === null) {
      // append new project (don't dup by title)
      if (items.some(p => p.title === patch.title)) return
      setContent(prev => ({
        ...prev,
        projects: {
          ...prev.projects,
          items: [{ ...patch } as ProjectItem, ...prev.projects.items],
        },
      }))
    } else {
      setProject(editingIdx, patch)
    }
    setEditingIdx(null)
    setModalOpen(false)
  }

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
                    ★{' '}
                    {repo.stars}{' '}
                    ·{' '}
                    {repo.forks} fork ·{' '}
                    {repo.language ?? '—'}
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
                    startContent={<Icon icon="mdi:pencil" width={16} height={16} />}
                    onPress={() => openEdit(inSite ? idx : null)}
                  >
                    Düzenle
                  </Button>
                </div>
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-foreground-500 transition-colors hover:text-primary"
                >
                  GitHub ↗
                </a>
              </div>
            )
          })}
        </div>
      )}

      {/* Popup editor modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingIdx === null ? 'Yeni Proje Ekle' : 'Projeyi Düzenle'}
        maxWidth="max-w-lg"
      >
        <div className="space-y-3">
          <Input
            variant="faded"
            label="Başlık"
            value={draft.title}
            onValueChange={v => setDraft({ ...draft, title: v })}
            placeholder="Proje adı"
          />
          <Textarea
            variant="faded"
            label="Açıklama"
            minRows={2}
            value={draft.description}
            onValueChange={v => setDraft({ ...draft, description: v })}
            placeholder="Kısa açıklama…"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              variant="faded"
              label="Proje Linki"
              value={draft.projectLink}
              onValueChange={v => setDraft({ ...draft, projectLink: v })}
              placeholder="/projects/… veya https://…"
            />
            <Input
              variant="faded"
              label="Kaynak Linki"
              value={draft.srcLink}
              onValueChange={v => setDraft({ ...draft, srcLink: v })}
              placeholder="GitHub repo URL"
            />
          </div>
          <Input
            variant="faded"
            label="Görsel URL"
            value={draft.image}
            onValueChange={v => setDraft({ ...draft, image: v })}
            placeholder="https://…/image.png"
          />
          <Input
            variant="faded"
            label="Etiketler (virgülle ayr)"
            value={draft.tags}
            onValueChange={v => setDraft({ ...draft, tags: v })}
            placeholder="typescript, nextjs, opensource"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.visible}
              onChange={e => setDraft({ ...draft, visible: e.target.checked })}
              className="h-4 w-4 shrink-0 rounded border-foreground-500 text-primary focus:ring-primary"
            />
            <span className="text-sm text-foreground">Sitede görünür</span>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
          <Button variant="bordered" size="sm" onPress={() => setEditingIdx(null)}>
            Vazgeç
          </Button>
          <Button
            color="primary"
            size="sm"
            onPress={saveDraft}
            isDisabled={!draft.title.trim()}
          >
            Kaydet
          </Button>
        </div>
      </Modal>
    </PanelCard>
  )
}
