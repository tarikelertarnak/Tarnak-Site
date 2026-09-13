'use client'

import type { SiteContent } from '@/lib/content'
import type {
  GitHubFileContent,
  GitHubRelease,
  GitHubRepoDetails,
  GitHubTreeEntry,
} from '@/lib/github'
import { Icon } from '@iconify/react'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { BackToListButton } from '@/components/back-to-list-button'
import { useLocale, useT } from '@/components/locale-provider'
import { Navigation } from '@/components/navigation'
import { cn } from '@/components/ui/cn'
import { Link } from '@/components/ui/link'
import {
  clientFetchFileContent,
  clientFetchRepoReleases,
} from '@/lib/github-client'

const GITHUB_BASE = 'https://github.com'

interface TabDef {
  key: string
  i18nKey: string
  icon: string
  href: string
}

const TABS: { key: string, i18nKey: string, icon: string, href: string }[] = [
  { key: 'code', i18nKey: 'github.tabCode', icon: 'mdi:code', href: '' },
  {
    key: 'issues',
    i18nKey: 'github.tabIssues',
    icon: 'mdi:alert-circle-outline',
    href: '/issues',
  },
  {
    key: 'pulls',
    i18nKey: 'github.tabPulls',
    icon: 'mdi:source-pull',
    href: '/pulls',
  },
  {
    key: 'actions',
    i18nKey: 'github.tabActions',
    icon: 'mdi:play-circle-outline',
    href: '/actions',
  },
  {
    key: 'projects',
    i18nKey: 'github.tabProjects',
    icon: 'mdi:view-kanban-outline',
    href: '/projects',
  },
  {
    key: 'wiki',
    i18nKey: 'github.tabWiki',
    icon: 'mdi:book-open-variant',
    href: '/wiki',
  },
  {
    key: 'security',
    i18nKey: 'github.tabSecurity',
    icon: 'mdi:shield-outline',
    href: '/security',
  },
  {
    key: 'insights',
    i18nKey: 'github.tabInsights',
    icon: 'mdi:chart-line',
    href: '/pulse',
  },
  {
    key: 'settings',
    i18nKey: 'github.tabSettings',
    icon: 'mdi:cog-outline',
    href: '/settings',
  },
]

function fileSize(bytes: number | undefined): string {
  if (bytes === undefined) {
    return ''
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function compactCount(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}k`
  }
  return String(n)
}

const k = 60 * 60 * 1000

function formatDate(dateStr: string, locale: string = 'tr-TR'): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) {
    return dateStr
  }
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function timeAgo(dateStr: string, isEn: boolean): string {
  const ts = new Date(dateStr).getTime()
  if (Number.isNaN(ts)) {
    return dateStr
  }
  const diffDays = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000))
  if (isEn) {
    if (diffDays < 1)
      return 'today'
    if (diffDays === 1)
      return 'yesterday'
    if (diffDays < 7)
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
    if (diffDays < 30)
      return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) === 1 ? '' : 's'} ago`
    if (diffDays < 365)
      return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) === 1 ? '' : 's'} ago`
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) === 1 ? '' : 's'} ago`
  }
  if (diffDays < 1) {
    return 'bugün'
  }
  if (diffDays === 1) {
    return 'dün'
  }
  if (diffDays < 7) {
    return `${diffDays} gün önce`
  }
  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} hafta önce`
  }
  if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)} ay önce`
  }
  return `${Math.floor(diffDays / 365)} yıl önce`
}

function getChildren(
  entries: GitHubTreeEntry[],
  dir: string,
): GitHubTreeEntry[] {
  const prefix = dir ? `${dir}/` : ''
  return entries
    .filter(
      entry =>
        entry.path.startsWith(prefix)
        && !entry.path.slice(prefix.length).includes('/'),
    )
    .sort((a, b) => {
      const aDir = a.type === 'tree' ? 0 : 1
      const bDir = b.type === 'tree' ? 0 : 1
      return aDir - bDir || a.name.localeCompare(b.name, 'tr')
    })
}

function AboutRow({
  icon,
  label,
  value,
  href,
}: {
  icon: string
  label: string
  value: string
  href?: string
}) {
  const cls
    = 'flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm transition-colors hover:bg-foreground/5'
  const inner = (
    <>
      <Icon
        icon={icon}
        width={16}
        height={16}
        className="shrink-0 text-foreground-500"
      />
      <span className="text-foreground-500">{label}</span>
      <span className="ml-auto truncate text-foreground">{value}</span>
    </>
  )
  if (href) {
    return (
      <li>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cls}
        >
          {inner}
        </a>
      </li>
    )
  }
  return (
    <li>
      <div className={cls}>{inner}</div>
    </li>
  )
}

export function GithubRepoView({
  details,
  readmeHtml,
  content,
  isAdmin = false,
}: {
  details: GitHubRepoDetails
  readmeHtml: string | null
  content: SiteContent
  isAdmin?: boolean
}) {
  const [currentPath, setCurrentPath] = useState('')
  const [selected, setSelected] = useState<GitHubFileContent | null>(null)
  const [selectedPath, setSelectedPath] = useState('')
  const [loadingFile, setLoadingFile] = useState(false)
  const [fileError, setFileError] = useState('')
  const [releases, setReleases] = useState<GitHubRelease[] | null>(null)
  const [codeOpen, setCodeOpen] = useState(false)
  const [codeTab, setCodeTab] = useState<'local' | 'codespaces'>('local')
  const [cloneMethod, setCloneMethod] = useState<'https' | 'ssh' | 'cli'>(
    'https',
  )
  const [copied, setCopied] = useState(false)
  const { t } = useT()
  const { locale } = useLocale()
  const isEn = locale === 'en'

  const baseUrl = `${GITHUB_BASE}/${details.owner}/${details.repo}`

  const zipUrl = useMemo(
    () =>
      `https://codeload.github.com/${details.owner}/${details.repo}/zip/refs/heads/${details.defaultBranch}`,
    [details.owner, details.repo, details.defaultBranch],
  )

  const cloneUrls = useMemo(
    () => ({
      https: `https://github.com/${details.owner}/${details.repo}.git`,
      ssh: `git@github.com:${details.owner}/${details.repo}.git`,
      cli: `gh repo clone ${details.owner}/${details.repo}`,
    }),
    [details.owner, details.repo],
  )

  const copyCloneUrl = async () => {
    const url = cloneUrls[cloneMethod]
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    catch {
      /* clipboard API unavailable — ignore */
    }
  }

  const currentEntries = useMemo(() => {
    if (!details.tree) {
      return []
    }
    return getChildren(details.tree, currentPath)
  }, [details.tree, currentPath])

  const homepageHost = useMemo(() => {
    if (!details.homepage) {
      return ''
    }
    try {
      return new URL(details.homepage).hostname
    }
    catch {
      return details.homepage
    }
  }, [details.homepage])

  const load = useCallback(async () => {
    if (!details.owner || !details.repo) {
      return
    }
    try {
      const data = await clientFetchRepoReleases(details.owner, details.repo)
      setReleases(data)
    }
    catch {
      setReleases([])
    }
  }, [details.owner, details.repo])

  useEffect(() => {
    load()
  }, [load])

  const openFile = async (path: string) => {
    if (loadingFile) {
      return
    }
    setSelectedPath(path)
    setLoadingFile(true)
    setFileError('')
    setSelected(null)
    try {
      const file = await clientFetchFileContent(
        details.owner,
        details.repo,
        path,
        details.defaultBranch,
      )
      setSelected(file)
    }
    catch (err) {
      setFileError(
        isEn
          ? 'Directory selected: pick a file.'
          : err instanceof TypeError && err.message === 'Dizin: dosya seçildi.'
            ? 'Dizin seçildi: bir dosya seç.'
            : 'Dosya açılamadı.',
      )
    }
    finally {
      setLoadingFile(false)
    }
  }

  const goToDir = (path: string) => {
    setCurrentPath(path)
    setSelected(null)
    setSelectedPath('')
    setFileError('')
  }

  const showReadme = () => {
    setSelected(null)
    setSelectedPath('')
    setFileError('')
  }

  const pathParts = currentPath ? currentPath.split('/') : []
  const fileDirParts = selectedPath ? selectedPath.split('/').slice(0, -1) : []
  const fileViewActive = loadingFile || fileError !== '' || selected !== null

  return (
    <div className="min-h-screen w-full relative">
      <Navigation content={content} />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-4 sm:px-6 pt-20 sm:pt-24 pb-16">
        <div className="mb-3 flex items-center gap-3">
          <BackToListButton fallback="/github" />
          <Link
            href="/github"
            className="text-sm text-foreground-500 transition-colors hover:text-primary"
          >
            GitHub Explorer
          </Link>
        </div>

        {/* 1 — Top bar: owner / repo + Public badge + icon buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
            <Link
              href={`${GITHUB_BASE}/${details.owner}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {details.owner}
            </Link>
            <span className="text-foreground-500">/</span>
            <Link
              href={baseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-foreground transition-colors hover:text-primary"
            >
              {details.repo}
              <Icon
                icon="solar:arrow-right-up-bold-duotone"
                width={14}
                height={14}
              />
            </Link>
            <span className="ml-1 rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
              {details.visibility === 'public' ? 'Public' : 'Private'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="flex items-center gap-1 text-foreground-500">
              <Icon icon="mdi:star-outline" width={16} height={16} />
              {compactCount(details.stars)}
            </span>
            <span className="flex items-center gap-1 text-foreground-500">
              <Icon icon="mdi:eye-outline" width={16} height={16} />
              {compactCount(details.watchers)}
            </span>
            <span className="flex items-center gap-1 text-foreground-500">
              <Icon icon="mdi:source-fork" width={16} height={16} />
              {compactCount(details.forks)}
            </span>
          </div>
        </div>

        {/* 2 — Tab bar + Code dropdown */}
        <div className="relative flex items-center justify-between gap-3 border-b border-foreground-200/10">
          <nav className="-mb-px flex overflow-x-auto">
            {TABS.map((tab) => {
              // Active tab: always false during server-side rendering
              const active = false
              return (
                <a
                  key={tab.key}
                  href={`${baseUrl}${tab.href}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
                    active
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-foreground-500 hover:bg-foreground/5 hover:text-foreground',
                  )}
                >
                  <Icon
                    icon={tab.icon}
                    width={15}
                    height={15}
                    className={
                      active ? 'text-foreground' : 'text-foreground-500'
                    }
                  />
                  {t(tab.i18nKey)}
                </a>
              )
            })}
          </nav>
        </div>

        {/* 3 — Main content: wide left column + right About panel */}
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-6">
            {fileViewActive ? (
              /* File viewer */
              <div className="overflow-hidden rounded-lg border border-foreground-200/10">
                <div className="flex items-center gap-1.5 border-b border-foreground-200/10 bg-background px-3 py-2 sm:px-4">
                  <button
                    type="button"
                    onClick={showReadme}
                    aria-label={isEn ? 'Go back' : 'Geri dön'}
                    className="rounded-md p-1 text-foreground-500 transition-colors hover:bg-foreground/5 hover:text-foreground"
                  >
                    <Icon icon="mdi:arrow-left" width={16} height={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToDir('')}
                    className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5"
                  >
                    <Icon
                      icon="mdi:book-outline"
                      width={14}
                      height={14}
                      className="text-foreground-500"
                    />
                    {details.repo}
                  </button>
                  {fileDirParts.map((part, i) => (
                    <Fragment key={part}>
                      <Icon
                        icon="mdi:chevron-right"
                        width={14}
                        height={14}
                        className="shrink-0 text-foreground-600"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          goToDir(fileDirParts.slice(0, i + 1).join('/'))}
                        className="rounded-md px-1.5 py-0.5 text-sm text-foreground transition-colors hover:bg-foreground/5 hover:text-primary"
                      >
                        {part}
                      </button>
                    </Fragment>
                  ))}
                  <Icon
                    icon="mdi:chevron-right"
                    width={14}
                    height={14}
                    className="shrink-0 text-foreground-600"
                  />
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Icon
                      icon="mdi:file-outline"
                      width={14}
                      height={14}
                      className="shrink-0 text-foreground-500"
                    />
                    <span className="truncate">
                      {selected?.name ?? selectedPath.split('/').pop()}
                    </span>
                  </span>
                  {selected && (
                    <a
                      href={`${baseUrl}/blob/${details.defaultBranch}/${selectedPath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 text-primary hover:underline"
                    >
                      {t('github.fileDownload')}
                    </a>
                  )}
                </div>

                {loadingFile && (
                  <div className="flex items-center justify-center gap-2 py-16 text-foreground-500">
                    <Icon
                      icon="svg-spinners:ring-resize"
                      width={20}
                      height={20}
                    />
                    <p className="text-sm">{t('github.loadingFile')}</p>
                  </div>
                )}

                {fileError && (
                  <p className="px-4 py-10 text-center text-sm text-danger">
                    {fileError}
                  </p>
                )}

                {selected && (
                  <div className="overflow-auto">
                    {selected.content
                      ? (
                          <pre className="p-4 text-xs leading-relaxed sm:p-5 sm:text-sm">
                            <code>{selected.content}</code>
                          </pre>
                        )
                      : selected.downloadUrl
                        ? (
                            <div className="px-4 py-10 text-center text-sm text-foreground-500">
                              <a
                                href={selected.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {t('github.fileDownload')}
                              </a>
                            </div>
                          )
                        : (
                            <p className="px-4 py-10 text-center text-sm text-foreground-500">
                              {t('github.filePreviewUnavailable')}
                            </p>
                          )}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* File list */}
                <div className="overflow-hidden rounded-lg border border-foreground-200/10">
                  <div className="flex flex-wrap items-center gap-2.5 border-b border-foreground-200/10 bg-background px-3 py-2.5 sm:px-4">
                    <span
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-foreground-200/15 px-2.5 py-1 text-xs font-medium text-foreground"
                      title={isEn ? 'Default branch' : 'Varsayılan dal'}
                    >
                      <Icon
                        icon="mdi:source-branch"
                        width={14}
                        height={14}
                        className="text-foreground-500"
                      />
                      {details.defaultBranch}
                      <Icon
                        icon="mdi:chevron-down"
                        width={14}
                        height={14}
                        className="text-foreground-500"
                      />
                    </span>
                    <div className="flex min-w-0 flex-wrap items-center gap-0.5 text-sm">
                      <button
                        type="button"
                        onClick={() => goToDir('')}
                        className={cn(
                          'flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-medium transition-colors hover:bg-foreground/5',
                          currentPath
                            ? 'text-foreground hover:text-primary'
                            : 'text-foreground',
                        )}
                      >
                        <Icon
                          icon="mdi:book-outline"
                          width={14}
                          height={14}
                          className="text-foreground-500"
                        />
                        {details.repo}
                      </button>
                      {pathParts.map((part, i) => (
                        <Fragment key={part}>
                          <Icon
                            icon="mdi:chevron-right"
                            width={14}
                            height={14}
                            className="shrink-0 text-foreground-600"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              goToDir(pathParts.slice(0, i + 1).join('/'))}
                            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-foreground transition-colors hover:bg-foreground/5 hover:text-primary"
                          >
                            <Icon
                              icon="mdi:folder"
                              width={14}
                              height={14}
                              className="text-primary"
                            />
                            {part}
                          </button>
                        </Fragment>
                      ))}
                    </div>
                    {details.language && (
                      <span className="ml-auto hidden shrink-0 items-center gap-1.5 text-xs text-foreground-500 sm:flex">
                        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                        {details.language}
                      </span>
                    )}
                  </div>

                  {currentEntries.length === 0
                    ? (
                        <p className="px-4 py-10 text-center text-sm text-foreground-500">
                          {currentPath
                            ? t('github.folderEmpty')
                            : t('github.repoEmpty')}
                        </p>
                      )
                    : (
                        <ul className="divide-y divide-foreground-200/10">
                          {currentEntries.map((entry) => {
                            const isDir = entry.type === 'tree'
                            return (
                              <li key={entry.path}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    isDir
                                      ? goToDir(entry.path)
                                      : openFile(entry.path)}
                                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground transition-colors hover:bg-foreground/5 sm:px-4"
                                >
                                  <Icon
                                    icon={isDir ? 'mdi:folder' : 'mdi:file-outline'}
                                    width={16}
                                    height={16}
                                    className={
                                      isDir ? 'text-primary' : 'text-foreground-500'
                                    }
                                  />
                                  <span className="truncate">{entry.name}</span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                </div>

                {/* README */}
                <div className="overflow-hidden rounded-lg border border-foreground-200/10">
                  <div className="flex items-center justify-between border-b border-foreground-200/10 bg-background px-4 py-2.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Icon
                        icon="mdi:file-document-outline"
                        width={16}
                        height={16}
                        className="text-foreground-500"
                      />
                      README.md
                    </div>
                    <button
                      type="button"
                      aria-label={isEn ? 'README options' : 'README seçenekleri'}
                      className="rounded-md p-1 text-foreground-500 transition-colors hover:bg-foreground/5 hover:text-foreground"
                    >
                      <Icon icon="mdi:dots-horizontal" width={18} height={18} />
                    </button>
                  </div>
                  {readmeHtml
                    ? (
                        <div
                          className="markdown-body px-5 py-4 text-sm leading-relaxed sm:px-6 sm:text-base"
                          dangerouslySetInnerHTML={{ __html: readmeHtml }}
                        />
                      )
                    : (
                        <p className="px-4 py-10 text-center text-foreground-500">
                          {t('github.noReadme')}
                        </p>
                      )}
                </div>
              </>
            )}
          </div>

          {/* About panel */}
          <aside className="flex min-w-0 flex-col gap-1 self-start lg:sticky lg:top-24">
            <h2 className="text-base font-semibold text-foreground">
              {t('github.aboutTitle')}
            </h2>
            {details.description && (
              <p className="mt-1 text-sm leading-relaxed text-foreground">
                {details.description}
              </p>
            )}
            {homepageHost && (
              <a
                href={details.homepage!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex max-w-full items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Icon
                  icon="mdi:link-variant"
                  width={15}
                  height={15}
                  className="shrink-0"
                />
                <span className="truncate">{homepageHost}</span>
              </a>
            )}
            {details.topics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {details.topics.map(topic => (
                  <span
                    key={topic}
                    className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3 border-t border-foreground-200/10" />
            <ul className="flex flex-col">
              <AboutRow
                icon="mdi:star-outline"
                label={t('github.stars')}
                value={compactCount(details.stars)}
                href={baseUrl}
              />
              <AboutRow
                icon="mdi:eye-outline"
                label={t('github.watchers')}
                value={compactCount(details.watchers)}
                href={baseUrl}
              />
              <AboutRow
                icon="mdi:source-fork"
                label={t('github.forks')}
                value={compactCount(details.forks)}
                href={baseUrl}
              />
              <AboutRow
                icon="mdi:alert-circle-outline"
                label={t('github.issues')}
                value={String(details.openIssues)}
                href={`${baseUrl}/issues`}
              />
              {details.language && (
                <AboutRow
                  icon="mdi:code-braces"
                  label={t('github.language')}
                  value={details.language}
                />
              )}
              {details.license && (
                <AboutRow
                  icon="mdi:scale-balance"
                  label={t('github.license')}
                  value={details.license}
                />
              )}
              {details.updatedAt && (
                <AboutRow
                  icon="mdi:update"
                  label={t('github.updated')}
                  value={timeAgo(details.updatedAt, isEn)}
                />
              )}
            </ul>

            {/* Releases section */}
            <div className="mt-4 border-t border-foreground-200/10 pt-3">
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                {t('github.releases')}
              </h3>
              {releases === null && (
                <div className="flex items-center justify-center gap-2 py-8 text-foreground-500">
                  <Icon
                    icon="svg-spinners:ring-resize"
                    width={20}
                    height={20}
                  />
                  <p className="text-sm">{isEn ? 'Loading releases...' : 'Releases yükleniyor...'}</p>
                </div>
              )}
              {releases && releases.length === 0 && (
                <div className="rounded-lg border border-foreground-200/10 px-4 py-6 text-center text-sm text-foreground-500">
                  {t('github.noReleases')}
                </div>
              )}
              {releases && releases.length > 0 && (
                <div className="divide-y divide-foreground-200/10 overflow-hidden rounded-lg border border-foreground-200/10">
                  {releases.map(release => (
                    <div
                      key={release.tagName}
                      className="flex flex-col gap-1.5 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <a
                          href={release.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                        >
                          <Icon
                            icon="mdi:tag"
                            width={16}
                            height={16}
                            className="shrink-0 text-primary"
                          />
                          <span className="truncate">
                            {release.name || release.tagName}
                          </span>
                        </a>
                        <span className="shrink-0 text-xs text-foreground-500">
                          {release.tagName}
                          {' '}
                          {release.publishedAt
                            && ` • ${formatDate(release.publishedAt, 'en' as any)}`}
                        </span>
                      </div>
                      {release.body && (
                        <p className="whitespace-pre-line text-xs text-foreground-500 line-clamp-3 sm:text-sm">
                          {release.body}
                        </p>
                      )}
                      {release.assets.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {release.assets.map(asset => (
                            <a
                              key={asset.name}
                              href={asset.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 rounded-md border border-foreground-200/15 bg-foreground/5 px-2 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                            >
                              <Icon
                                icon="mdi:download"
                                width={13}
                                height={13}
                              />
                              <span className="max-w-[180px] truncate">
                                {asset.name}
                              </span>
                              <span className="text-foreground-500">
                                {fileSize(asset.size)}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
