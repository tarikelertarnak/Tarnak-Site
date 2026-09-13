'use client'

import type { ReactNode } from 'react'
import type { ProjectItem } from '@/lib/content'
import { motion } from 'motion/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/components/locale-provider'
import { Card, CardBody } from '@/components/ui/card'
import { cn } from '@/components/ui/cn'
import {
  ArrowUpRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  DownloadIcon,
  EyeIcon,
  ForkIcon,
  GithubIcon,
  MaximizeIcon,
  SearchIcon,
  StarOutlineIcon,
} from '@/components/ui/icons'
import { StarRating } from '@/components/ui/star-rating'
import { readProjectStats, recordDownload, recordProjectView } from '@/lib/project-stats'

function useProjectStats(title: string) {
  const [views, setViews] = useState(0)
  const [downloads, setDownloads] = useState(0)

  useEffect(() => {
    const s = readProjectStats(title)
    setViews(s.views)
    setDownloads(s.downloads)
  }, [title])

  // View count: Open Page / Open in GitHub / /github/OWNER/REPO visit —
  // the same user counts only ONCE per project (dedup flag).
  const recordView = () => {
    setViews(recordProjectView(title))
  }

  const trackDownload = () => {
    setDownloads(recordDownload(title))
  }

  return { views, downloads, recordView, trackDownload }
}

function detectOS(): 'windows' | 'macos' | 'linux' | 'android' | 'ios' {
  if (typeof navigator === 'undefined')
    return 'windows'
  const ua = navigator.userAgent
  if (/Windows/i.test(ua))
    return 'windows'
  if (/Android/i.test(ua))
    return 'android'
  if (/iPhone|iPad|iPod/i.test(ua))
    return 'ios'
  if (/Mac/i.test(ua))
    return 'macos'
  if (/Linux/i.test(ua))
    return 'linux'
  return 'windows'
}

const OS_LABELS = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  android: 'Android',
  ios: 'iOS',
} as const

type OSKey = keyof typeof OS_LABELS

/** Standard order for platform groups (the user's platform is moved to the front). */
const OS_ORDER: OSKey[] = ['windows', 'linux', 'macos', 'ios', 'android']

interface DownloadOption {
  label: string
  url: string
  os?: OSKey
}

interface DownloadComboboxProps {
  options: DownloadOption[]
  currentUrl: string | null
  onSelect: (url: string) => void
  /** Trigger button (or alignment reference) — the portal position is computed from it. */
  anchorRef: React.RefObject<HTMLElement | null>
}

/**
 * Version / OS selector — search + grouped list.
 *  Default: all groups visible. The user's platform is pinned to the top of each group.
 *  Portal: the menu is moved to document.body, so it is not affected by other cards' stacking.
 */
function DownloadCombobox({
  options,
  currentUrl,
  onSelect,
  anchorRef,
}: DownloadComboboxProps) {
  const { t } = useT()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{ top: number, left?: number, right?: number } | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // The menu opens based on the viewport: right if room on the button's right, left if on the left,
  // and if neither side fits, it snaps to the edge the screen can fit (no overflow).
  useLayoutEffect(() => {
    const MENU_W = 288
    const GAP = 8
    const calc = () => {
      const el = anchorRef.current
      if (!el)
        return
      const r = el.getBoundingClientRect()
      const viewW = window.innerWidth
      const viewH = window.innerHeight
      const spaceRight = viewW - r.right
      const spaceLeft = r.left
      const top = Math.min(r.bottom + GAP, Math.max(8, viewH - 320))
      if (spaceRight >= MENU_W + GAP) {
        // Enough room on the right → open right
        setPos({ top, left: r.right + GAP })
      }
      else if (spaceLeft >= MENU_W + GAP) {
        // Enough room on the left → open left
        setPos({ top, right: viewW - r.left + GAP })
      }
      else {
        // Neither fits → snap to the screen edge (no overflow thanks to max-w)
        setPos({ top, left: Math.max(8, Math.min(r.right + GAP, viewW - MENU_W - 8)) })
      }
    }
    calc()
    window.addEventListener('resize', calc)
    window.addEventListener('scroll', calc, true)
    return () => {
      window.removeEventListener('resize', calc)
      window.removeEventListener('scroll', calc, true)
    }
  }, [anchorRef])

  // The user's platform first, then the standard order.
  const sortedOS = useMemo<OSKey[]>(() => {
    const u = detectOS()
    return [u, ...OS_ORDER.filter(k => k !== u)]
  }, [])

  // In per-OS mode, group assets by OS; empty in single-URL mode.
  // Items without an OS (e.g. ZIP) go into the "Other" group.
  const grouped = useMemo(() => {
    const byOS = new Map<OSKey, DownloadOption[]>()
    const other: DownloadOption[] = []
    let hasOS = false
    for (const opt of options) {
      if (!opt.os) {
        other.push(opt)
        continue
      }
      hasOS = true
      const list = byOS.get(opt.os) ?? []
      list.push(opt)
      byOS.set(opt.os, list)
    }
    // "Latest" = the first asset of each OS (in per-OS mode there is already only one).
    const latest: DownloadOption[] = []
    for (const k of sortedOS) {
      const first = byOS.get(k)?.[0]
      if (first)
        latest.push(first)
    }
    return { byOS, latest, hasOS, other }
  }, [options, sortedOS])

  const matches = (o: DownloadOption) =>
    !query.trim() || o.label.toLowerCase().includes(query.trim().toLowerCase())

  const renderItem = (opt: DownloadOption) => {
    const isCurrent = opt.url === currentUrl
    return (
      <a
        key={opt.url}
        href={opt.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onSelect(opt.url)}
        className={cn(
          'mx-1.5 my-0.5 flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors',
          isCurrent
            ? 'bg-primary/15 font-medium text-primary'
            : 'text-white/75 hover:bg-white/[0.06] hover:text-white',
        )}
      >
        <span className="truncate">{opt.label}</span>
        {isCurrent && <CheckIcon size={14} className="shrink-0 text-primary" />}
      </a>
    )
  }

  const GroupLabel = ({ children }: { children: ReactNode }) => (
    <div className="sticky top-0 z-[1] border-b border-white/5 bg-[#0d0d12]/95 px-3 pb-1.5 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40 backdrop-blur">
      {children}
    </div>
  )

  // Single-URL mode: no OS, a flat list instead of grouping.
  const flat = options.filter(matches)
  const showGroups = grouped.hasOS

  const latestItems = grouped.latest.filter(matches)
  const totalCount = showGroups
    ? latestItems.length
    + sortedOS.reduce((n, k) => n + (grouped.byOS.get(k)?.filter(matches).length ?? 0), 0)
    + grouped.other.filter(matches).length
    : flat.length

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      style={pos ?? undefined}
      className="fixed z-[1000] w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-white/10 bg-[#0d0d12]/95 shadow-2xl shadow-black/40 backdrop-blur-xl"
    >
      <div className="border-b border-white/5 p-2">
        <div className="relative">
          <SearchIcon
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('projects.searchVersion')}
            className="h-8 w-full rounded-lg border border-white/10 bg-white/5 pl-7 pr-2 text-xs text-white outline-none placeholder:text-white/35 focus:border-white/25 focus:ring-0 focus-visible:ring-0"
          />
        </div>
      </div>
      <div className="max-h-64 overscroll-contain overflow-y-auto py-1.5 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin]">
        {totalCount === 0
          ? (
              <p className="px-3 py-3 text-center text-xs text-foreground-500">
                {t('projects.noResultsShort')}
              </p>
            )
          : showGroups
            ? (
                <>
                  {latestItems.length > 0 && (
                    <div>
                      <GroupLabel>{t('projects.latest')}</GroupLabel>
                      {latestItems.map(renderItem)}
                    </div>
                  )}
                  {sortedOS.map((k) => {
                    const list = grouped.byOS.get(k)?.filter(matches) ?? []
                    if (list.length === 0)
                      return null

                    return (
                      <div key={k}>
                        <GroupLabel>{OS_LABELS[k]}</GroupLabel>
                        {list.map(renderItem)}
                      </div>
                    )
                  })}
                  {grouped.other.length > 0 && (
                    <div>
                      <GroupLabel>{t('projects.other')}</GroupLabel>
                      {grouped.other.filter(matches).map(renderItem)}
                    </div>
                  )}
                </>
              )
            : (
                flat.map(renderItem)
              )}
      </div>
    </motion.div>,
    typeof document !== 'undefined' ? document.body : (null as unknown as HTMLElement),
  )
}

const MEDIA_VIDEO_RE = /\.(mp4|webm|ogg|ogv)(\?|#|$)/i

/**
 * Rectangular media box — multiple media (image/gif/video) + arrow overlays +
 *  bottom toolbar (Previous / Next / Zoom). Zoom → lightbox.
 */
function ProjectMedia({
  project,
  isGithub,
}: {
  project: ProjectItem
  isGithub: boolean
}) {
  const { t } = useT()
  const items = useMemo(() => {
    const media = (project.media ?? []).filter(u => u.trim())
    return media.length > 0 ? media : project.image ? [project.image] : []
  }, [project])
  const count = items.length
  const [index, setIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    if (index >= count)
      setIndex(Math.max(0, count - 1))
  }, [index, count])

  useEffect(() => {
    if (!zoomed)
      return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')
        setZoomed(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomed])

  if (count === 0) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-white/5 ring-1 ring-foreground-200/10">
        {isGithub
          ? (
              <GithubIcon size={44} className="text-primary" />
            )
          : (
              <img
                src="/tarnak-white.svg"
                alt="TARNAK"
                className="hidden h-16 w-16 object-contain p-1 dark:block"
              />
            )}
        {!isGithub && (
          <img
            src="/tarnak.svg"
            alt="TARNAK"
            className="block h-16 w-16 object-contain p-1 dark:hidden"
          />
        )}
      </div>
    )
  }

  const current = items[Math.min(index, Math.max(0, count - 1))]
  const isVideo = MEDIA_VIDEO_RE.test(current)
  const hasNav = count > 1
  const prev = () => setIndex(i => (i - 1 + count) % count)
  const next = () => setIndex(i => (i + 1) % count)

const mediaNode = (src: string, video: boolean, controls: boolean) =>
    video ? (
      <video
        key={src}
        src={src}
        controls={controls}
        playsInline
        preload="auto"
        onClick={(e) => {
          // Native controls are small inside the card — clicking the media also plays/pauses.
          const v = e.currentTarget
          if (v.paused)
            void v.play()?.catch(() => {})
          else v.pause()
        }}
        className="h-full w-full object-contain"
      />
    ) : (
      <img
        key={src}
        src={src}
        alt={project.title}
        title={t('projects.zoom')}
        onClick={() => setZoomed(true)}
        className="h-full w-full cursor-zoom-in object-contain"
      />
    )

  return (
    <div>
      <div
        className="relative aspect-video w-full overflow-hidden rounded-lg bg-white/5 ring-1 ring-foreground-200/10 transition-colors group-hover:ring-primary/30"
        onClick={() => {
          // Clicking a photo/GIF opens the lightbox; videos keep playing/pausing on click.
          if (!isVideo)
            setZoomed(true)
        }}
      >
        {mediaNode(current, isVideo, true)}
      </div>

      {/* Bottom toolbar — OUTSIDE the media box: does not clash with the video's native controls */}
      <div className="mt-2 flex items-center gap-1">
        {hasNav && (
          <button
            type="button"
            onClick={prev}
            aria-label={t('projects.prev')}
            className="flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-medium text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            <ChevronRightIcon size={13} className="rotate-180" />
            {t('projects.prev')}
          </button>
        )}
        <span className="px-1.5 text-xs text-foreground/60">
          {index + 1}
          /
          {count}
        </span>
        {hasNav && (
          <button
            type="button"
            onClick={next}
            aria-label={t('projects.next')}
            className="flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-medium text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
          >
            {t('projects.next')}
            <ChevronRightIcon size={13} />
          </button>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setZoomed(true)}
          aria-label={t('projects.zoom')}
          className="flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-medium text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <MaximizeIcon size={13} />
          {t('projects.zoom')}
        </button>
      </div>

      {/* Lightbox (zoom) */}
      {zoomed
        && createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            onClick={() => setZoomed(false)}
          >
            <button
              type="button"
              onClick={() => setZoomed(false)}
              aria-label={t('projects.zoomClose')}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <CloseIcon size={20} />
            </button>
            {hasNav && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    prev()
                  }}
                  aria-label={t('projects.prev')}
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
                >
                  <ChevronRightIcon size={22} className="rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    next()
                  }}
                  aria-label={t('projects.next')}
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
                >
                  <ChevronRightIcon size={22} />
                </button>
              </>
            )}
            <div
              className="max-h-[90vh] max-w-[90vw]"
              onClick={e => e.stopPropagation()}
            >
              {isVideo
                ? (
                    <video
                      src={current}
                      controls
                      autoPlay
                      playsInline
                      className="max-h-[90vh] max-w-[90vw] object-contain"
                    />
                  )
                : (
                    <img
                      src={current}
                      alt={project.title}
                      className="max-h-[90vh] max-w-[90vw] object-contain"
                    />
                  )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}

export function ProjectCard({ project }: { project: ProjectItem }) {
  const isGithub = project.projectLink.startsWith('/github/') || !!project.srcLink
  const isExternal = !project.projectLink.startsWith('/')
  const { views, downloads, recordView, trackDownload } = useProjectStats(
    project.title,
  )
  const { t } = useT()
  const tags = project.tags ?? []

  const [current, setCurrent] = useState<DownloadOption | null>(null)
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const comboboxRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!comboboxOpen)
      return
    const onClick = (e: MouseEvent) => {
      if (
        comboboxRef.current
        && !comboboxRef.current.contains(e.target as Node)
      ) {
        setComboboxOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [comboboxOpen])

  // Collect the downloadable URLs
  const downloadOptions = useMemo<DownloadOption[]>(() => {
    const opts: DownloadOption[] = []
    if (project.downloadMode === 'per-os' && project.downloads) {
      for (const [key, url] of Object.entries(project.downloads)) {
        if (!url)
          continue
        const osKey = key as OSKey
        if (osKey in OS_LABELS) {
          opts.push({ label: OS_LABELS[osKey], url, os: osKey })
        }
      }
    }
    else if (project.downloadUrl) {
      opts.push({ label: t('projects.download'), url: project.downloadUrl })
    }
    // GitHub project: the source-code ZIP is always offered (default when there is no platform file).
    if (project.srcLink) {
      opts.push({
        label: 'ZIP',
        url: `${project.srcLink}/archive/refs/heads/main.zip`,
      })
    }
    return opts
  }, [project, t])

  // Reset the selection when the project/mode changes; default to the user's platform in per-OS mode.
  useEffect(() => {
    const opt = downloadOptions.find(o => o.os === detectOS()) ?? null
    setCurrent(opt)
  }, [downloadOptions])

  const currentDownloadUrl = current?.url ?? downloadOptions[0]?.url ?? null

  const currentDownloadLabel
    = current?.label ?? downloadOptions[0]?.label ?? t('projects.download')

  return (
    <Card className="group h-full overflow-visible rounded-2xl border-foreground-200/10 bg-background transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
      <CardBody className="flex flex-col gap-3 rounded-2xl p-3 sm:p-4">
        {/* Media box — rectangular, multi-media player */}
        <ProjectMedia project={project} isGithub={isGithub} />

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-row items-start justify-between gap-2">
            {/* Project name → project page */}
            <a
              href={project.projectLink}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              onClick={() => recordView()}
              title={isExternal ? t('projects.view') : t('projects.open')}
              className="min-w-0 break-words text-base font-semibold text-foreground no-underline transition-colors duration-300 group-hover:text-primary hover:text-primary sm:text-lg"
            >
              {project.title}
            </a>
            {project.notice && (
              <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                {project.notice.replace(/[[\]]/g, '')}
              </span>
            )}
          </div>
          {/* Description → project showcase page */}
          <a
            href={project.srcLink || project.projectLink}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            onClick={() => recordView()}
            title={t('projects.showcase')}
            className="line-clamp-3 min-h-[3.5em] text-sm text-foreground-500 no-underline transition-colors duration-300 hover:text-foreground/80"
          >
            {project.description}
          </a>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 4).map(tag => (
                <span
                  key={tag}
                  className="rounded-full bg-foreground-200/10 px-2 py-0.5 text-[10px] font-medium text-foreground-600"
                >
                  #
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="mt-auto flex flex-row flex-wrap items-center gap-1.5 text-[11px] text-foreground/75">
            {isGithub
              ? (
                  <a
                    href={`${project.srcLink ?? ''}/stargazers`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="GitHub stars"
                    className="inline-flex items-center gap-1 rounded-full border border-foreground-200/15 bg-background px-1.5 py-0.5 text-foreground/80 transition-colors hover:border-yellow-400/50 hover:text-yellow-400"
                  >
                    <StarOutlineIcon size={12} />
                    {project.stars ?? 0}
                  </a>
                )
              : (
                  <StarRating itemId={project.title} itemType="project" size={14} />
                )}

            {isGithub && (
              <a
                href={`${project.srcLink ?? ''}/forks`}
                target="_blank"
                rel="noopener noreferrer"
                title={t('projects.forkCount')}
                className="inline-flex items-center gap-1 rounded-full border border-foreground-200/15 bg-background px-1.5 py-0.5 text-foreground/80 transition-colors hover:border-primary/50 hover:text-primary"
              >
                <ForkIcon size={12} />
                {project.forks ?? 0}
              </a>
            )}

            <span
              className="inline-flex items-center gap-1 rounded-full border border-foreground-200/15 bg-background px-1.5 py-0.5 text-foreground/80"
              title={t('projects.downloadsTitle')}
            >
              <DownloadIcon size={12} />
              {downloads}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full border border-foreground-200/15 bg-background px-1.5 py-0.5 text-foreground/80"
              title={t('projects.viewsTitle')}
            >
              <EyeIcon size={12} />
              {views}
            </span>
          </div>

          {/* Buttons: Open Page → Download → GitHub (only for GitHub projects). */}
          <div className="flex w-full flex-wrap items-stretch gap-1.5">
            <a
              href={project.projectLink}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              onClick={() => {
                recordView()
              }}
              className="inline-flex h-9 min-w-[7.5rem] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#e5e7eb] px-2 text-sm font-medium text-black no-underline transition-colors hover:bg-[#d1d5db] hover:text-black"
            >
              {isExternal ? t('projects.view') : t('projects.open')}
              <ArrowUpRightIcon size={14} className="shrink-0 text-black" />
            </a>

            {downloadOptions.length > 0 && (
              <div className="relative shrink-0 self-center" ref={comboboxRef}>
                <div className="flex h-9 items-stretch overflow-hidden rounded-lg bg-[#e5e7eb] transition-colors hover:bg-[#d1d5db]">
                  <a
                    href={currentDownloadUrl ?? '#'}
                    onClick={() => trackDownload()}
                    title={currentDownloadLabel}
                    className="inline-flex h-9 w-9 items-center justify-center text-black no-underline transition-colors hover:text-black"
                  >
                    <DownloadIcon size={15} />
                  </a>
                  <button
                    type="button"
                    ref={triggerRef}
                    onClick={() => setComboboxOpen(o => !o)}
                    aria-label={t('projects.selectVersion')}
                    title={t('projects.selectVersion')}
                    className="inline-flex h-9 w-7 items-center justify-center border-l border-black/10 text-black transition-colors hover:bg-black/5"
                  >
                    <ChevronDownIcon size={13} />
                  </button>
                </div>
                {comboboxOpen && (
                  <DownloadCombobox
                    options={downloadOptions}
                    currentUrl={currentDownloadUrl}
                    anchorRef={triggerRef}
                    onSelect={(url) => {
                      setComboboxOpen(false)
                      const opt
                        = downloadOptions.find(o => o.url === url) ?? null
                      if (opt)
                        setCurrent(opt)
                      trackDownload()
                    }}
                  />
                )}
              </div>
            )}

            {isGithub && (
              <a
                href={project.srcLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                title={t('projects.openGithub')}
                onClick={() => recordView()}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-lg bg-[#e5e7eb] text-black no-underline transition-colors hover:bg-[#d1d5db] hover:text-black"
              >
                <GithubIcon size={15} />
              </a>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
