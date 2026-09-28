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
  /** Release tag (v1.2.3) when the option comes from a GitHub release. */
  version?: string
  /** true = source ZIP (grouped under "Other", pinned to the top). */
  isZip?: boolean
}

/** /github/<owner>/<repo> veya github.com/<owner>/<repo> kalıbından repo kimliği çıkarır. GitHub değilse null. */
function parseGitHubRepo(link: string | undefined): { owner: string, repo: string } | null {
  if (!link)
    return null
  const m = link.match(/(?:\/github\/|github\.com\/)([^/?#]+)\/([^/?#]+)/i)
  return m ? { owner: m[1], repo: m[2] } : null
}

/** Release asset adından hedef platform — bilinmeyenler (zip/yml/blockmap vb.) OS'siz kalır. */
function assetOS(name: string): OSKey | undefined {
  const n = name.toLowerCase()
  if (n.endsWith('.exe'))
    return 'windows'
  if (n.endsWith('.dmg'))
    return 'macos'
  if (n.endsWith('.appimage') || n.endsWith('.deb') || n.endsWith('.rpm'))
    return 'linux'
  if (n.endsWith('.apk'))
    return 'android'
  if (n.includes('ios'))
    return 'ios'
  return undefined
}

interface ReleaseDto {
  tagName: string
  assets: Array<{ name: string, downloadUrl: string }>
}

/** Her release'i TAG önekiyle ayrıştırır: "v1.0.0 — Player-1.0.0-mac-arm64.dmg". */
function releaseOptions(releases: ReleaseDto[]): DownloadOption[] {
  const opts: DownloadOption[] = []
  for (const release of releases) {
    for (const asset of release.assets) {
      const isSourceZip = asset.name === 'Source code (zip)'
      const isSourceTar = asset.name === 'Source code (tar.gz)'
      const label = isSourceZip ? 'Source (zip)' : isSourceTar ? 'Source (tar.gz)' : asset.name
      opts.push({
        label: `${release.tagName} — ${label}`,
        url: asset.downloadUrl,
        os: isSourceZip || isSourceTar ? undefined : assetOS(asset.name),
        version: release.tagName,
        isZip: isSourceZip,
      })
    }
  }
  return opts
}

interface DownloadComboboxProps {
  options: DownloadOption[]
  currentUrl: string | null
  onSelect: (url: string) => void
  /** Trigger button (or alignment reference) — the portal position is computed from it. */
  anchorRef: React.RefObject<HTMLElement | null>
  /** Only GitHub repos get the "Latest" group (non-GitHub projects have no releases). */
  showLatest: boolean
}

/**
 * Version / OS selector — search + grouped list with MULTI-SELECT (batch download).
 *  Default: all groups visible. The user's platform is pinned to the top of each group.
 *  Portal: the menu is moved to document.body, so it is not affected by other cards' stacking.
 */
function DownloadCombobox({
  options,
  currentUrl,
  onSelect,
  anchorRef,
  showLatest,
}: DownloadComboboxProps) {
  const { t } = useT()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
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

  // ── Filters ──────────────────────────────────────────────────────────────
  // Type (OS) and version filters. Both default to "all"; each has its own search.
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [versionFilter, setVersionFilter] = useState<string>('all')
  const [typeQuery, setTypeQuery] = useState('')
  const [versionQuery, setVersionQuery] = useState('')

  /** OS present in the options (a type filter is pointless without them). */
  const availableTypes = useMemo(
    () => sortedOS.filter(k => options.some(o => o.os === k)),
    [options, sortedOS],
  )
  /** Versions present in the options, newest first (input order = release order). */
  const availableVersions = useMemo(() => {
    const seen: string[] = []
    for (const o of options) {
      if (o.version && !seen.includes(o.version))
        seen.push(o.version)
    }
    return seen
  }, [options])

  const showTypeFilter = availableTypes.length > 0
  const showVersionFilter = availableVersions.length > 0

  const typeOptions = useMemo(
    () =>
      availableTypes
        .map(k => ({ value: k, label: OS_LABELS[k] }))
        .filter(o => !typeQuery.trim() || o.label.toLowerCase().includes(typeQuery.trim().toLowerCase())),
    [availableTypes, typeQuery],
  )
  const versionOptions = useMemo(
    () =>
      availableVersions
        .map(v => ({ value: v, label: v }))
        .filter(o => !versionQuery.trim() || o.label.toLowerCase().includes(versionQuery.trim().toLowerCase())),
    [availableVersions, versionQuery],
  )

  // In per-OS mode, group assets by OS; empty in single-URL mode.
  // Items without an OS (e.g. ZIP) go into the "Other" group — ZIP pinned first.
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
    // ZIP entries float to the top of "Other".
    other.sort((a, b) => Number(!!b.isZip) - Number(!!a.isZip))
    // "Latest" = the first asset of each OS (in per-OS mode there is already only one).
    const latest: DownloadOption[] = []
    for (const k of sortedOS) {
      const first = byOS.get(k)?.[0]
      if (first)
        latest.push(first)
    }
    return { byOS, latest, hasOS, other }
  }, [options, sortedOS])

  /** Text search + type (OS) + version filters all narrow the list. */
  const matches = (o: DownloadOption) => {
    if (query.trim() && !o.label.toLowerCase().includes(query.trim().toLowerCase()))
      return false
    if (typeFilter !== 'all' && o.os !== typeFilter)
      return false
    if (versionFilter !== 'all' && o.version !== versionFilter)
      return false
    return true
  }

  const renderItem = (opt: DownloadOption) => {
    const isCurrent = opt.url === currentUrl
    const isSelected = selected.has(opt.url)
    const toggle = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setSelected((prev) => {
        const next = new Set(prev)
        if (isSelected)
          next.delete(opt.url)
        else
          next.add(opt.url)
        return next
      })
    }
    return (
      <div
        key={opt.url}
        role="option"
        aria-selected={isSelected}
        className={cn(
          'mx-1.5 my-0.5 flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors',
          isSelected
            ? 'bg-primary/15 text-white'
            : 'text-white/75 hover:bg-white/[0.06] hover:text-white',
        )}
      >
        {/* Select checkbox — multi-select (batch download) */}
        <button
          type="button"
          onClick={toggle}
          onMouseDown={e => e.stopPropagation()}
          aria-label={isSelected ? 'Kaldır' : 'Seç'}
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
            isSelected
              ? 'border-primary bg-primary text-white'
              : 'border-white/25 bg-transparent hover:border-white/50',
          )}
        >
          {isSelected && <CheckIcon size={11} />}
        </button>
        {/* Label */}
        <span className="min-w-0 flex-1 truncate">{opt.label}</span>
        {/* Open & download */}
        <a
          href={opt.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onSelect(opt.url)}
          className={cn(
            'shrink-0 transition-colors',
            isCurrent ? 'text-white' : 'text-white/50 hover:text-white',
          )}
        >
          <DownloadIcon size={14} />
        </a>
      </div>
    )
  }

  const GroupLabel = ({ children }: { children: ReactNode }) => (
    <div className="sticky top-0 z-[1] border-b border-foreground/10 bg-background/95 px-3 pb-1.5 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/60 backdrop-blur">
      {children}
    </div>
  )

  // Single-URL mode: no OS, a flat list instead of grouping.
  const flat = options.filter(matches)
  const showGroups = grouped.hasOS

  const latestItems = showLatest ? grouped.latest.filter(matches) : []
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
      className="fixed z-[1000] w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-foreground/15 bg-background/95 shadow-2xl shadow-black/20 backdrop-blur-xl"
    >
      <div className="border-b border-foreground/10 p-2">
        <div className="relative">
          <SearchIcon
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/60"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('projects.searchVersion')}
            className="h-8 w-full rounded-lg border border-foreground/15 bg-foreground/[0.05] pl-7 pr-2 text-xs text-foreground outline-none placeholder:text-foreground/40 focus:border-foreground/25 focus:ring-0 focus-visible:ring-0"
          />
        </div>
        {/* Two filters: type (OS) and version. Both searchable, both default to "All". */}
        {(showTypeFilter || showVersionFilter) && (
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {showTypeFilter && (
              <FilterSelect
                label={t('projects.filterType')}
                value={typeFilter}
                onChange={setTypeFilter}
                query={typeQuery}
                onQuery={setTypeQuery}
                options={typeOptions}
                allLabel={t('combobox.all')}
                placeholder={t('projects.searchType')}
              />
            )}
            {showVersionFilter && (
              <FilterSelect
                label={t('projects.filterVersion')}
                value={versionFilter}
                onChange={setVersionFilter}
                query={versionQuery}
                onQuery={setVersionQuery}
                options={versionOptions}
                allLabel={t('combobox.all')}
                placeholder={t('projects.searchVersion')}
              />
            )}
          </div>
        )}
      </div>
<div className="max-h-64 overscroll-contain overflow-y-auto py-1.5 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin]">
        {totalCount === 0
          ? (
              <p className="px-3 py-3 text-center text-xs text-foreground-500">
                {t('projects.noResultsShort')}
              </p>
            )
          : (
              <>
                {/* Batch download bar — visible when at least one is selected */}
                {selected.size > 0 && (
                  <div className="mx-1.5 mb-1.5 flex items-center gap-2 rounded-lg border border-foreground/15 bg-foreground/[0.06] px-2.5 py-2">
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                      {selected.size} seçildi
                    </span>
                    <button
                      type="button"
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => {
                        // Open all selected in new tabs (batch download)
                        for (const url of selected) {
                          window.open(url, '_blank', 'noopener,noreferrer')
                        }
                        setSelected(new Set())
                        onSelect([...selected][0] ?? '')
                      }}
                      className="shrink-0 rounded-md bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-foreground transition-opacity hover:opacity-90"
                    >
                      ↓ Toplu İndir
                    </button>
                    <button
                      type="button"
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => setSelected(new Set())}
                      aria-label="Temizle"
                      className="shrink-0 rounded-md border border-foreground/20 px-1.5 py-1 text-[11px] text-foreground/80 transition-colors hover:text-foreground"
                    >
                      <CloseIcon size={12} />
                    </button>
                  </div>
                )}
                {showGroups
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
              </>
            )}
      </div>
    </motion.div>,
    typeof document !== 'undefined' ? document.body : (null as unknown as HTMLElement),
  )
}

/**
 * Small labelled dropdown with its own search box — used for the type/version
 * filters inside the download menu. "All" is always the first option.
 */
function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  placeholder,
  query,
  onQuery,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string, label: string }>
  allLabel: string
  placeholder: string
  query: string
  onQuery: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open)
      return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const current = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={label}
        title={label}
        className="flex h-7 w-full items-center justify-between gap-1 rounded-lg border border-foreground/15 bg-foreground/[0.05] px-2 text-[11px] font-medium text-foreground/90 transition-colors hover:border-foreground/25"
      >
        <span className="min-w-0 truncate">
          {value === 'all' ? allLabel : (current?.label ?? allLabel)}
        </span>
        <ChevronDownIcon size={12} className="shrink-0 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-20 max-h-56 w-full min-w-[9rem] overflow-hidden rounded-lg border border-foreground/15 bg-popover shadow-2xl shadow-black/25 backdrop-blur-xl">
          <div className="border-b border-foreground/10 p-1.5">
            <input
              type="text"
              value={query}
              onChange={e => onQuery(e.target.value)}
              placeholder={placeholder}
              className="h-7 w-full rounded-md border border-foreground/15 bg-foreground/[0.05] px-2 text-[11px] text-foreground outline-none placeholder:text-foreground/40 focus:border-foreground/25"
            />
          </div>
          <div className="max-h-40 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => {
                onChange('all')
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors',
                value === 'all' ? 'bg-primary/15 text-foreground' : 'text-foreground/80 hover:bg-foreground/[0.06]',
              )}
            >
              {allLabel}
              {value === 'all' && <CheckIcon size={12} />}
            </button>
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-[11px] transition-colors',
                  value === o.value ? 'bg-primary/15 text-foreground' : 'text-foreground/80 hover:bg-foreground/[0.06]',
                )}
              >
                <span className="min-w-0 truncate">{o.label}</span>
                {value === o.value && <CheckIcon size={12} />}
              </button>
            ))}
            {options.length === 0 && (
              <p className="px-2.5 py-2 text-center text-[11px] text-foreground/60">—</p>
            )}
          </div>
        </div>
      )}
    </div>
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
      <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-foreground/[0.05] ring-1 ring-foreground-200/10">
        {isGithub
          ? (
              <GithubIcon size={44} className="text-primary" />
            )
          : (
              <img
                src="/tarnak-white.svg"
                alt="TARNAK"
                className="hidden h-16 w-16 object-contain p-1 dark:block"
                loading="lazy"
              />
            )}
        {!isGithub && (
          <img
            src="/tarnak.svg"
            alt="TARNAK"
            className="block h-16 w-16 object-contain p-1 dark:hidden"
            loading="lazy"
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
        loading="lazy"
      />
    )

  return (
    <div>
      <div
        className="relative aspect-video w-full overflow-hidden rounded-lg bg-foreground/[0.05] ring-1 ring-foreground-200/10 transition-colors group-hover:ring-primary/30"
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

const [comboboxOpen, setComboboxOpen] = useState(false)
  const comboboxRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // GitHub projesi: srcLink/projectLink'ten repo kimliği çıkarılır.
  const githubRepo = useMemo(
    () => parseGitHubRepo(project.srcLink ?? project.projectLink),
    [project.srcLink, project.projectLink],
  )

  // "Aç" hedefi: GitHub projesi ise doğrudan GitHub linki, normal proje ise
  // proje sayfası (yerel /... rotası ya da kendi projectLink'i).
  const openTarget = isGithub
    ? (project.srcLink ?? project.projectLink)
    : project.projectLink
  // GitHub release asset'leri (kart başına 1 kez fetch). Hata/boşsa mevcut statik indirme davranışı korunur.
  const [releaseAssetOptions, setReleaseAssetOptions] = useState<DownloadOption[] | null>(null)

  useEffect(() => {
    if (!githubRepo)
      return
    let cancelled = false
    fetch(
      `/api/github/releases?owner=${encodeURIComponent(githubRepo.owner)}&repo=${encodeURIComponent(githubRepo.repo)}`,
      { signal: AbortSignal.timeout(15_000) },
    )
      .then(res => (res.ok
        ? res.json() as Promise<{ success?: boolean, releases?: ReleaseDto[] }>
        : null))
      .then((data) => {
        if (cancelled || !data?.success || !data.releases)
          return
        const withAssets = data.releases.filter(r => r.assets.length > 0)
        if (withAssets.length > 0)
          setReleaseAssetOptions(releaseOptions(withAssets))
      })
      .catch(() => { /* sessizce mevcut davranışa düş */ })
    return () => { cancelled = true }
  }, [githubRepo])

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
    // GitHub release asset'leri varsa öne gelir; yoksa mevcut statik davranış korunur.
    if (releaseAssetOptions && releaseAssetOptions.length > 0)
      opts.push(...releaseAssetOptions)
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
        isZip: true,
      })
    }
    return opts
    // ponytail: downloadOptions rebuilds when `t` identity changes (i18n context);
    // it is memoized on the projection data that actually matters:
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.downloadMode, project.downloadUrl, project.downloads, project.srcLink, releaseAssetOptions])

  // Default selection = user's platform (per-OS only); derived, no setState loop.
  const defaultOption = useMemo(
    () => downloadOptions.find(o => o.os === detectOS()) ?? null,
    [downloadOptions],
  )
  const [current, setCurrent] = useState<DownloadOption | null>(null)
  const selectedCurrent = current ?? defaultOption

  const currentDownloadUrl = selectedCurrent?.url ?? downloadOptions[0]?.url ?? null

  const currentDownloadLabel
    = selectedCurrent?.label ?? downloadOptions[0]?.label ?? t('projects.download')

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

          {/* Buttons: Open (GitHub link for repos, project page otherwise) → Download. */}
          <div className="flex w-full flex-wrap items-stretch gap-1.5">
            <a
              href={openTarget}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              onClick={() => {
                recordView()
              }}
              className="inline-flex h-9 min-w-[7.5rem] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-2 text-sm font-medium text-white no-underline transition-colors hover:bg-primary/90 hover:text-white"
            >
              {/* Tek isim: "Projeyi Aç". GitHub projesi olsa bile aynı etiket —
                  buton zaten GitHub linkine gidiyor, ayrı "GitHub'da aç" yazısı
                  gereksizdi. */}
              {t('projects.open')}
              <ArrowUpRightIcon size={14} className="shrink-0 text-white" />
            </a>

            {downloadOptions.length > 0 && (
              <div className="relative shrink-0 self-center" ref={comboboxRef}>
                <div className="flex h-9 items-stretch overflow-hidden rounded-lg bg-primary transition-colors hover:bg-primary/90">
                  <a
                    href={currentDownloadUrl ?? '#'}
                    onClick={() => trackDownload()}
                    title={currentDownloadLabel}
                    className="inline-flex h-9 w-9 items-center justify-center text-white no-underline transition-colors hover:text-white"
                  >
                    <DownloadIcon size={15} />
                  </a>
                  <button
                    type="button"
                    ref={triggerRef}
                    onClick={() => setComboboxOpen(o => !o)}
                    aria-label={t('projects.selectVersion')}
                    title={t('projects.selectVersion')}
                    className="inline-flex h-9 w-7 items-center justify-center border-l border-white/20 text-white transition-colors hover:bg-black/5"
                  >
                    <ChevronDownIcon size={13} />
                  </button>
                </div>
                {comboboxOpen && (
                  <DownloadCombobox
                    options={downloadOptions}
                    currentUrl={currentDownloadUrl}
                    anchorRef={triggerRef}
                    showLatest={isGithub}
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
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
