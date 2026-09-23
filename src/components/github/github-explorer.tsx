'use client'

import type { GitHubRepo, GitHubUserProfile } from '@/lib/github'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ErrorState } from '@/components/error-state'
import { useLocale, useT } from '@/components/locale-provider'
import { Card, CardBody } from '@/components/ui/card'
import { SearchIcon } from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { Link } from '@/components/ui/link'
import {
  clientFetchUserProfile,
  clientFetchUserRepos,
} from '@/lib/github-client'

function RepoCard({ repo, t }: { repo: GitHubRepo, t: (k: string) => string }) {
  return (
    <Card className="bg-background ">
      <CardBody className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          {repo.language
            ? (
                <span className="flex items-center gap-1.5 text-xs text-foreground-500">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {repo.language}
                </span>
              )
            : (
                <span />
              )}
          <svg
            viewBox="0 0 16 16"
            width={18}
            height={18}
            fill="currentColor"
            aria-hidden="true"
            className="shrink-0 text-foreground-500"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
        </div>

        <h3 className="text-base font-semibold break-all">
          <Link
            href={`/github/${repo.fullName}`}
            className="text-foreground hover:text-primary"
          >
            {repo.name}
          </Link>
        </h3>

        <p className="text-xs sm:text-sm text-foreground-500 line-clamp-3 min-h-[3em]">
          {repo.description || t('github.noDescription')}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 text-[11px] text-foreground/75">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1" title="Stars">
              ★
              {' '}
              {repo.stars}
            </span>
            <span className="flex items-center gap-1" title="Forks">
              ⑂
              {' '}
              {repo.forks}
            </span>
          </div>
          {repo.updatedAt && (
            <span title="Updated">
              {new Date(repo.updatedAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

function ProfileCard({ profile }: { profile: GitHubUserProfile }) {
  return (
    <Card className="bg-background ">
      <CardBody className="flex flex-row items-center gap-4 p-4 sm:p-6">
        {profile.avatarUrl && (
          <img
            src={profile.avatarUrl}
            alt={profile.login}
            className="h-[72px] w-[72px] shrink-0 rounded-2xl object-cover"
          />
        )}
        <div className="flex w-full flex-col gap-1">
          {profile.name && (
            <h3 className="text-base sm:text-lg font-semibold">
              {profile.name}
            </h3>
          )}
          <p className="text-sm text-foreground-500">
            @
            {profile.login}
          </p>
          {profile.bio && (
            <p className="text-xs text-foreground-500 line-clamp-2">
              {profile.bio}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-foreground/75">
            {profile.publicRepos != null && (
              <span>
                {profile.publicRepos}
                {' '}
                repos
              </span>
            )}
            {profile.followers != null && (
              <span>
                {profile.followers}
                {' '}
                followers
              </span>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function SkeletonCard() {
  return (
    <Card className="bg-background ">
      <CardBody className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="h-4 w-16 rounded-full shimmer" />
        </div>
        <span className="h-5 w-3/4 rounded-md shimmer" />
        <span className="h-3 w-full rounded-md shimmer" />
        <span className="h-3 w-2/3 rounded-md shimmer" />
      </CardBody>
    </Card>
  )
}

type SortKey = 'updated' | 'stars' | 'forks' | 'name'

const SORT_OPTIONS_TR: { key: SortKey, label: string }[] = [
  { key: 'updated', label: 'Güncellenme' },
  { key: 'stars', label: 'Yıldız' },
  { key: 'forks', label: 'Fork' },
  { key: 'name', label: 'Ad (A-Z)' },
]

const SORT_OPTIONS_EN: { key: SortKey, label: string }[] = [
  { key: 'updated', label: 'Updated' },
  { key: 'stars', label: 'Stars' },
  { key: 'forks', label: 'Forks' },
  { key: 'name', label: 'Name (A-Z)' },
]

export function GithubExplorer({ username }: { username: string }) {
  const { t } = useT()
  const { locale } = useLocale()
  const isEn = locale === 'en'
  const [profile, setProfile] = useState<GitHubUserProfile | null>(null)
  const [query, setQuery] = useState('')
  const [repos, setRepos] = useState<GitHubRepo[] | null>(null)
  const [sort, setSort] = useState<SortKey>('updated')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [profileData, reposData] = await Promise.all([
        clientFetchUserProfile(username),
        clientFetchUserRepos(username),
      ])
      setProfile(profileData)
      setRepos(reposData)
    }
    catch {
      setError(t('github.loadError'))
    }
    finally {
      setLoading(false)
    }
  }, [username])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (!repos) {
      return []
    }
    const q = query.trim().toLowerCase()
    const list = q
      ? repos.filter(
          repo =>
            repo.name.toLowerCase().includes(q)
            || (repo.description ?? '').toLowerCase().includes(q)
            || (repo.language ?? '').toLowerCase().includes(q),
        )
      : [...repos]
    list.sort((a, b) => {
      if (sort === 'stars') {
        return b.stars - a.stars
      }
      if (sort === 'forks') {
        return b.forks - a.forks
      }
      if (sort === 'name') {
        return a.name.localeCompare(b.name, 'tr')
      }
      // 'updated': most recently updated first
      const aT = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const bT = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return bT - aT
    })
    return list
  }, [repos, query, sort])

  return (
    <div className="flex w-full max-w-6xl flex-col gap-4">
      {profile && <ProfileCard profile={profile} />}

      <div className="flex w-full flex-col gap-3">
        {repos && repos.length > 0 && (
          <>
            <Input
              type="text"
              variant="faded"
              placeholder={t('github.search')}
              value={query}
              onValueChange={setQuery}
              startContent={
                <SearchIcon size={18} className="text-foreground/60" />
              }
            />
            <div className="flex w-full flex-row flex-wrap items-center gap-2">
              {/* Sorting — on the left */}
              <span className="flex flex-row flex-wrap items-center gap-1.5">
                <span className="hidden sm:inline text-[11px] font-medium uppercase tracking-wider text-foreground-500">
                  {isEn ? 'Sort:' : 'Sırala:'}
                </span>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as SortKey)}
                  aria-label={isEn ? 'Sort' : 'Sırala'}
                  className="h-9 cursor-pointer rounded-full border border-foreground-200/15 bg-background px-3 text-xs font-medium text-foreground/85 outline-none transition-colors hover:border-primary/40 focus:border-primary/60"
                >
                  {(isEn ? SORT_OPTIONS_EN : SORT_OPTIONS_TR).map(opt => (
                    <option
                      key={opt.key}
                      value={opt.key}
                      className="bg-background text-foreground"
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              </span>

              {/* Repo count right-aligned */}
              <span className="ml-auto text-sm text-foreground-500">
                {filtered.length}
                {' '}
                {t('github.reposFound')}
              </span>
            </div>
          </>
        )}
      </div>

      {error && !loading && (
        <ErrorState
          error={error}
          onRetry={() => void load()}
          retrying={loading}
          iconSize={72}
        />
      )}

      {loading && (
        <div className="flex w-full flex-col gap-4">
          <Card className="bg-background ">
            <CardBody className="flex flex-row items-center gap-4 p-4 sm:p-6">
              <span className="h-[72px] w-[72px] shrink-0 rounded-2xl shimmer" />
              <div className="flex w-full flex-col gap-2">
                <span className="h-6 w-1/3 rounded-md shimmer" />
                <span className="h-3 w-1/4 rounded-md shimmer" />
                <span className="h-3 w-1/2 rounded-md shimmer" />
              </div>
            </CardBody>
          </Card>
          <div className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[0, 1, 2].map(i => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      )}

      {repos && repos.length > 0 && (
        <>
          {filtered.length === 0
            ? (
                <p className="text-center text-foreground-500 py-10">
                  {t('github.noResults')}
                </p>
              )
            : (
                <div className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filtered.map(repo => (
                    <RepoCard key={repo.fullName} repo={repo} t={t} />
                  ))}
                </div>
              )}
        </>
      )}

      {repos && repos.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-foreground-500">
          <svg
            viewBox="0 0 16 16"
            width={48}
            height={48}
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
          <p className="max-w-sm">{t('github.noRepos')}</p>
        </div>
      )}
    </div>
  )
}
