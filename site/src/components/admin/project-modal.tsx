'use client'

import type { DownloadRow } from '@/components/admin/download-fields'
import type { LinkKind } from '@/components/admin/link-editor'
import type { MediaItem } from '@/components/admin/media-editor'
import type { ProjectItem } from '@/lib/content'
import { useState } from 'react'
import { DEVICE_OS_KEYS, DownloadFields } from '@/components/admin/download-fields'
import { LicensePicker } from '@/components/admin/license-picker'
import { LinkEditor } from '@/components/admin/link-editor'
import { MediaEditor } from '@/components/admin/media-editor'
import { TagInput } from '@/components/admin/tag-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'

/**
 * PROJE MODALI (2026-11-11, kullanıcı isteği: "Yeni Proje Ekle ile aynı olsun,
 * ama otomatik içi dolu olan").
 *
 * Tek modal; hem "Yeni Proje Ekle" hem GitHub reposundaki "Düzenle" bunu açar.
 * İçerik `initial` taslağından gelir → düzenlemede otomatik doludur.
 */
export interface ProjectDraft {
  title: string
  description: string
  projectLink: string
  projectLinkKind: LinkKind
  srcLink: string
  srcLinkKind: LinkKind
  image: string
  mediaItems: MediaItem[]
  license: string
  tags: string[]
  downloadPlatform: string
  downloadVariant: string
  downloadRows: DownloadRow[]
  visible: boolean
}

export function emptyProjectDraft(): ProjectDraft {
  return {
    title: '',
    description: '',
    projectLink: '',
    projectLinkKind: 'link',
    srcLink: '',
    srcLinkKind: 'link',
    image: '',
    mediaItems: [],
    license: '',
    tags: [],
    downloadPlatform: 'hepsi',
    downloadVariant: 'hepsi',
    downloadRows: [],
    visible: true,
  }
}

/** Kayıtlı bir proje → modal taslağı (düzenlemede otomatik dolu). */
export function projectToDraft(item: Partial<ProjectItem>): ProjectDraft {
  const base = emptyProjectDraft()
  return {
    ...base,
    title: item.title ?? '',
    description: item.description ?? '',
    projectLink: item.projectLink ?? '',
    projectLinkKind: item.projectLinkKind ?? 'link',
    srcLink: item.srcLink ?? '',
    srcLinkKind: item.srcLinkKind ?? 'link',
    image: item.image ?? '',
    mediaItems: item.mediaItems ?? [],
    license: item.license ?? '',
    tags: item.tags ?? [],
    downloadPlatform: 'hepsi',
    downloadVariant: 'hepsi',
    downloadRows: item.downloadRows ?? [],
    visible: item.visible !== false,
  }
}

/** Modal taslağı → kaydedilecek proje alanları (medya/lisans/indirme eşlemesi). */
export function draftToProject(draft: ProjectDraft): Partial<ProjectItem> {
  const mediaUrls = draft.mediaItems.map(m => m.url.trim()).filter(Boolean)
  const rows = draft.downloadRows
    .map(r => ({ device: r.device.trim(), version: r.version.trim(), url: r.url.trim() }))
    .filter(r => r.url)
  const perOs: Partial<{
    windows: string
    macos: string
    linux: string
    ios: string
    android: string
  }> = {}
  for (const r of rows) {
    const osKey = DEVICE_OS_KEYS[r.device.toLowerCase()]
    if (osKey)
      perOs[osKey] = r.url
  }
  const firstUrl = mediaUrls[0] ?? ''

  return {
    title: draft.title.trim(),
    notice: '',
    description: draft.description.trim(),
    projectLink: draft.projectLink.trim(),
    srcLink: draft.srcLink.trim() || undefined,
    projectLinkKind: draft.projectLinkKind,
    srcLinkKind: draft.srcLinkKind,
    image: firstUrl || draft.image.trim(),
    ...(mediaUrls.length > 0 ? { media: mediaUrls } : {}),
    ...(draft.mediaItems.length > 0 ? { mediaItems: draft.mediaItems } : {}),
    ...(draft.license ? { license: draft.license } : {}),
    tags: draft.tags,
    ...(rows.length > 0 ? { downloadRows: rows } : {}),
    ...(Object.keys(perOs).length > 0
      ? { downloadMode: 'per-os' as const, downloads: perOs }
      : (firstUrl || rows[0]?.url ? { downloadMode: 'global' as const, downloadUrl: firstUrl || rows[0]?.url } : {})),
    visible: draft.visible,
    isVisible: draft.visible,
    hidden: !draft.visible,
  }
}

export function ProjectModal({
  open,
  onClose,
  initial,
  onSave,
  title = 'Proje',
  suggestions,
  saveLabel = 'Kaydet',
}: {
  open: boolean
  onClose: () => void
  initial: ProjectDraft
  onSave: (draft: ProjectDraft) => void
  title?: string
  /** Mevcut proje linkleri (öneri listesi). */
  suggestions?: string[]
  saveLabel?: string
}) {
  const [draft, setDraft] = useState<ProjectDraft>(initial)
  const [warn, setWarn] = useState('')

  const patch = (p: Partial<ProjectDraft>) => setDraft(d => ({ ...d, ...p }))

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div>
          <label className="mb-1 block text-xs text-foreground-500">
            Başlık
            <span className="text-danger"> *</span>
          </label>
          <Input
            variant="faded"
            value={draft.title}
            onValueChange={v => patch({ title: v })}
            placeholder="Proje adı"
            aria-label="Başlık"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-foreground-500">Açıklama</label>
          <Textarea
            variant="faded"
            minRows={2}
            value={draft.description}
            onChange={e => patch({ description: e.target.value })}
            placeholder="Kısa açıklama…"
            aria-label="Açıklama"
          />
        </div>

        {/* Proje ve Kaynak Kod Linki ALT ALTA (2026-11-11, kullanıcı isteği) */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs text-foreground-500">Proje</label>
            <LinkEditor
              kind={draft.projectLinkKind}
              url={draft.projectLink}
              suggestions={suggestions}
              onChange={p => patch({
                ...(p.kind ? { projectLinkKind: p.kind } : {}),
                ...(p.url !== undefined ? { projectLink: p.url } : {}),
              })}
              ariaLabel="Proje bağlantısı"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-foreground-500">Kaynak Kod Linki</label>
            <LinkEditor
              kind={draft.srcLinkKind}
              url={draft.srcLink}
              onChange={p => patch({
                ...(p.kind ? { srcLinkKind: p.kind } : {}),
                ...(p.url !== undefined ? { srcLink: p.url } : {}),
              })}
              ariaLabel="Kaynak kod bağlantısı"
              placeholder="https://github.com/…"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-foreground-500">Görsel / Medya</label>
          <MediaEditor
            items={draft.mediaItems}
            onChange={mediaItems => patch({ mediaItems })}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-foreground-500">Lisans</label>
          <LicensePicker
            value={draft.license}
            onChange={license => patch({ license })}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-foreground-500">Etiketler</label>
          <TagInput
            tags={draft.tags}
            onChange={tags => patch({ tags })}
            placeholder="typescript, nextjs, opensource"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-foreground-500">İndirme</label>
          <DownloadFields
            platform={draft.downloadPlatform}
            variant={draft.downloadVariant}
            rows={draft.downloadRows}
            onChange={p => patch({
              ...(p.platform ? { downloadPlatform: p.platform } : {}),
              ...(p.variant ? { downloadVariant: p.variant } : {}),
              ...(p.rows ? { downloadRows: p.rows } : {}),
            })}
            onWarn={setWarn}
          />
          {warn && (
            <p className="mt-1 text-[11px] text-danger">{warn}</p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground-700">
          <input
            type="checkbox"
            checked={draft.visible}
            onChange={e => patch({ visible: e.target.checked })}
            className="h-4 w-4 shrink-0 rounded border-foreground-500 text-primary focus:ring-primary"
          />
          Sitede görünür
        </label>

        <div className="flex justify-end gap-2 border-t border-surface-border pt-4">
          <Button variant="bordered" onPress={onClose}>
            Vazgeç
          </Button>
          <Button
            color="primary"
            onPress={() => onSave(draft)}
            isDisabled={!draft.title.trim()}
          >
            {saveLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
