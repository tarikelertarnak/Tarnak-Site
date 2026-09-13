'use client'

import type { ProjectItem } from '@/lib/content'
import type { GitHubRepo } from '@/lib/github'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale, useT } from '@/components/locale-provider'
import { ProjectCard } from '@/components/projects/project-card'
import { Button } from '@/components/ui/button'
import {
  ChevronDownIcon,
  CloseIcon,
  SearchIcon,
} from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'
import { clientFetchUserRepos } from '@/lib/github-client'
import { useGridCols } from '@/lib/use-grid-cols'

/** All sort types — the direction is embedded in the option itself (no separate ASC/DESC buttons needed). */
type SortKey
  = | 'newest'
    | 'oldest'
    | 'views'
    | 'downloads'
    | 'stars'
    | 'forks'
    | 'rating'
    | 'az'
    | 'za'

const SORT_LABEL_KEYS: Record<SortKey, string> = {
  newest: 'projects.sortNewest',
  oldest: 'projects.sortOldest',
  views: 'projects.sortViews',
  downloads: 'projects.sortDownloads',
  stars: 'projects.sortStars',
  forks: 'projects.sortForks',
  rating: 'projects.sortRating',
  az: 'projects.sortAz',
  za: 'projects.sortZa',
}

interface UserStars {
  [title: string]: { average: number, count: number }
}

const GITHUB_DOWNLOAD_OVERRIDES: Record<string, Partial<ProjectItem>> = {
  OfficeSetupWizard: {
    downloadMode: 'per-os',
    downloads: {
      windows:
        'https://github.com/TARIKELER-TARNAK/OfficeSetupWizard/releases/download/v1.0.0/OfficeSetupWizard.exe',
    },
  },
}

/** Turkish translations of GitHub repo descriptions (so EN descriptions don't show in TR locales). */
const REPO_DESCRIPTIONS_TR: Record<string, string> = {
  'Accentra':
    'Accentra - Ferdium kod tabanı üzerine inşa edilmiş çalışma alanı işletim sistemi.',
  'codehub-vsc':
    'VS Code için Terminal & AI kodlama ajan yöneticisi - tüm ajanlarınız, oturumlarınız ve projeleriniz için tek panel.',
  'TarnakLua-Roblox': 'Roblox için Lua araçları ve scriptleri.',
  'Scribd-Download':
    'Scribd belge indirici tarayıcı eklentisi - yüksek kaliteli PDF dışa aktarımı.',
  'TARIKELER-TARNAK': 'GitHub profil README\'si.',
  'TARIKELER-TARNAK.github.io': 'Kişisel portfolyo web sitesi.',
  'AI-Jailbreak': 'AI model güvenlik sınır testleri için prompt koleksiyonu.',
  'OfficeSetupWizard':
    'Tek tıkla Microsoft Office LTSC Professional Plus 2024 kurulum ve aktivasyonu (Office Deployment Tool sarmalayıcısı).',
  'Player':
    'Müzik, video, ses, eklenti ve AI entegrasyonlu modern, çok platformlu medya oynatıcısı.',
}

function githubRepoToProject(repo: GitHubRepo, tr: boolean): ProjectItem {
  return {
    title: repo.name,
    description: tr
      ? (REPO_DESCRIPTIONS_TR[repo.name] ?? repo.description ?? '')
      : (repo.description ?? ''),
    projectLink: `/github/${repo.fullName}`,
    image: '',
    srcLink: repo.url,
    stars: repo.stars,
    forks: repo.forks,
    watchers: repo.watchers,
    updatedAt: repo.updatedAt,
    tags: repo.topics ?? [],
    ...(GITHUB_DOWNLOAD_OVERRIDES[repo.name] ?? {}),
  }
}

function readLocalStats(): Record<
  string,
  { views: number, downloads: number }
> {
  if (typeof window === 'undefined') {
    return {}
  }
  const map: Record<string, { views: number, downloads: number }> = {}
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key?.startsWith('project-stats:')) {
        const title = key.slice('project-stats:'.length)
        const data = JSON.parse(window.localStorage.getItem(key) ?? '{}')
        map[title] = {
          views: Number(data.views) || 0,
          downloads: Number(data.downloads) || 0,
        }
      }
    }
  }
  catch {
    /* swallow */
  }
  return map
}

export function ProjectsGrid({
  projects,
  showSearch = true,
  githubUsername,
  actions,
}: {
  projects: ProjectItem[]
  showSearch?: boolean
  githubUsername?: string
  actions?: React.ReactNode
}) {
  const [query, setQuery] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [sort, setSort] = useState<SortKey>('newest')
  const [visibleCount, setVisibleCount] = useState(9)
  const cols = useGridCols()
  const [userStars, setUserStars] = useState<UserStars>({})
  const [githubRepos, setGithubRepos] = useState<ProjectItem[] | null>(null)
  const [githubError, setGithubError] = useState('')
  const { t } = useT()
  const { locale } = useLocale()
  const isEn = locale === 'en'

  const loadGithubRepos = useCallback(async () => {
    if (!githubUsername) {
      // Show only admin projects if GitHub is not configured
      // (not []: `githubRepos ?? projects` treats an empty array as truthy, leaving the grid empty)
      setGithubRepos(projects)
      return
    }
    setGithubError('')
    setGithubRepos(null)
    try {
      const repos = await clientFetchUserRepos(githubUsername)
      const seen = new Set(projects.map(p => p.title.toLowerCase()))
      const merged: ProjectItem[] = [
        ...repos.map(r => githubRepoToProject(r, !isEn)),
      ].filter(
        p => !seen.has(p.title.toLowerCase()),
      )
      merged.unshift(...projects)
      setGithubRepos(merged)
    }
    catch {
      setGithubError(t('github.loadErrorSection'))
      setGithubRepos(projects)
    }
  }, [githubUsername, projects])

  useEffect(() => {
    loadGithubRepos()
  }, [loadGithubRepos])

  // Fetch user stars in bulk
  useEffect(() => {
    fetch('/api/stars?itemType=project&list=1')
      .then(res =>
        res.ok
          ? (res.json() as Promise<{
              items: Array<{
                itemId: string
                average: number
                count: number
              }>
            }>)
          : null,
      )
      .then((d) => {
        if (!d?.items)
          return
        const map: UserStars = {}
        d.items.forEach((item) => {
          map[item.itemId] = { average: item.average, count: item.count }
        })
        setUserStars(map)
      })
      .catch(() => {})
  }, [])

  // Collect all tags (admin + github topics)
  const allTags = useMemo(() => {
    const set = new Set<string>()
    projects.forEach(p => p.tags?.forEach(t => set.add(t)))
    if (githubRepos) {
      githubRepos.forEach(p => p.tags?.forEach(t => set.add(t)))
    }
    return Array.from(set).sort()
  }, [projects, githubRepos])

  const allProjects = githubRepos ?? projects

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = allProjects.filter((p) => {
      const matchesQuery
        = !q
          || p.title.toLowerCase().includes(q)
          || p.description.toLowerCase().includes(q)
          || (p.tags ?? []).some(t => t.toLowerCase().includes(q))
      const matchesTag
        = activeTags.length === 0
          || (p.tags ?? []).some(t => activeTags.includes(t))
      return matchesQuery && matchesTag
    })

    const stats = readLocalStats()
    const sorted = [...list]
    const updated = (p: ProjectItem) =>
      p.updatedAt ? new Date(p.updatedAt).getTime() : 0
    const score = (p: ProjectItem): number => {
      switch (sort) {
        case 'views':
          return stats[p.title]?.views ?? 0
        case 'downloads':
          return stats[p.title]?.downloads ?? 0
        case 'rating':
          return userStars[p.title]?.average ?? 0
        case 'newest':
        case 'oldest':
          return updated(p)
        default:
          return 0
        case 'stars':
          return p.stars ?? 0
        case 'forks':
          return p.forks ?? 0
      }
    }
    switch (sort) {
      case 'az':
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
        break
      case 'za':
        sorted.sort((a, b) => b.title.localeCompare(a.title, 'tr'))
        break
      case 'oldest':
        sorted.sort((a, b) => score(a) - score(b))
        break
      default:
        sorted.sort((a, b) => score(b) - score(a))
    }
    return sorted
  }, [allProjects, query, activeTags, sort, userStars])

  const shown = filtered.slice(0, visibleCount)
  const hasMore = shown.length < filtered.length
  const remaining = filtered.length - shown.length

  return (
    <div className="flex w-full max-w-6xl flex-col gap-4">
      {showSearch && (
        <div className="flex w-full flex-col gap-3">
          {/* Search — below the title, above the filters */}
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('projects.search')}
            aria-label={t('projects.search')}
            className="h-11 w-full"
            startContent={<SearchIcon size={16} />}
          />

          {/* Sorting + tag filter + counter */}
          <div className="flex w-full flex-row flex-wrap items-center gap-2">
            <SearchableCombobox
              options={(Object.keys(SORT_LABEL_KEYS) as SortKey[]).map(
                v => ({ value: v, label: t(SORT_LABEL_KEYS[v]) }),
              )}
              selected={[sort]}
              onSelect={v => setSort(v as SortKey)}
              onClear={() => setSort('newest')}
              placeholder={t('projects.sort')}
              searchPlaceholder={t('projects.searchSort')}
              ariaLabel={t('projects.sort')}
            />
            {allTags.length > 0 && (
              <SearchableCombobox
                multiple
                options={allTags.map(tag => ({
                  value: tag,
                  label: `#${tag}`,
                }))}
                selected={activeTags}
                onSelect={v =>
                  setActiveTags(prev =>
                    prev.includes(v)
                      ? prev.filter(x => x !== v)
                      : [...prev, v],
                  )}
                onClear={() => setActiveTags([])}
                placeholder={t('projects.allTags')}
                searchPlaceholder={t('projects.searchTag')}
                ariaLabel={t('projects.allTags')}
                showAllOption
                allLabel={t('combobox.all')}
                badge={activeTags.length}
              />
            )}
            <span className="ml-auto text-sm font-medium text-foreground/70">
              {filtered.length}
              {' '}
              {t('projects.found')}
            </span>
          </div>

          {/* Active filter chips — clicked tags, removed with an x */}
          {activeTags.length > 0 && (
            <div className="flex flex-row flex-wrap items-center gap-1.5">
              {activeTags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                >
                  #
                  {tag}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTags(prev =>
                        prev.filter(x => x !== tag),
                      )}
                    aria-label={`${t('projects.removeTag')} ${tag}`}
                    className="-mr-1 grid h-4 w-4 cursor-pointer place-items-center rounded-full transition-colors hover:bg-primary/20"
                  >
                    <CloseIcon size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {githubError && (
        <p className="text-center text-danger text-sm">{githubError}</p>
      )}

      {filtered.length === 0
        ? (
            <p className="text-foreground-500 py-10 text-center">
              {t('projects.empty')}
            </p>
          )
        : (
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              {shown.map(project => (
                <ProjectCard key={project.title} project={project} />
              ))}
            </div>
          )}

      {hasMore && (
        <div className="flex flex-col items-center justify-center gap-3 pt-6 sm:flex-row">
          <Button
            variant="solid"
            color="primary"
            onPress={() =>
              setVisibleCount(c => Math.min(c + cols, filtered.length))}
            endContent={<ChevronDownIcon size={18} />}
          >
            {t('projects.showMore')}
            {' '}
            (
            {remaining}
            )
          </Button>
        </div>
      )}

      {actions}
    </div>
  )
}
