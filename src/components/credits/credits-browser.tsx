'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useT } from '@/components/locale-provider'
import {
  CodeIcon,
  CrownIcon,
  HeartIcon,
  PaletteIcon,
  SearchIcon,
  ShieldIcon,
  StarIcon,
} from '@/components/ui/icons'
import { Input } from '@/components/ui/input'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'

export interface ContributorItem {
  name: string
  role: string
  roleEn: string
  roleIcon: 'crown' | 'star' | 'code' | 'heart' | 'shield' | 'palette'
  link?: string
}

export interface TeamItem {
  name: string
  role: string
  roleEn: string
}

export interface TesterItem {
  name: string
  noteTr: string
  noteEn: string
}

export interface TranslatorItem {
  lang: string
  name: string
  noteTr: string
  noteEn: string
}

export interface DonorItem {
  nameTr: string
  nameEn: string
  noteTr: string
  noteEn: string
}

export interface LeaderboardEntry {
  sponsor: string
  views: number
  estimatedRevenue: number
}

type Category = 'all' | 'contributors' | 'team' | 'sponsors'
type SortKey = 'leadership' | 'az'

interface Entry {
  key: string
  name: string
  searchText: string
  revenue?: number
  render: (rank: number) => ReactNode
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function RoleIcon({ name }: { name: ContributorItem['roleIcon'] }) {
  const props = { size: 14, className: 'inline-block align-[-2px]' }
  switch (name) {
    case 'crown':
      return <CrownIcon {...props} />
    case 'star':
      return <StarIcon {...props} />
    case 'code':
      return <CodeIcon {...props} />
    case 'heart':
      return <HeartIcon {...props} />
    case 'shield':
      return <ShieldIcon {...props} />
    case 'palette':
      return <PaletteIcon {...props} />
    default:
      return null
  }
}

function PersonIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function CreditGroup({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-surface-border bg-background">
      <div className="border-b border-foreground-200/10 px-6 pb-4 pt-5">
        <h2 className="flex items-center gap-3 text-lg font-bold text-foreground">
          {icon}
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm text-foreground/55">{description}</p>
        )}
      </div>
      <ul className="space-y-2 p-4 sm:p-6">{children}</ul>
    </div>
  )
}

function CreditRow({
  left,
  title,
  subtitle,
  right,
}: {
  left: ReactNode
  title: ReactNode
  subtitle: ReactNode
  right?: ReactNode
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-foreground-200/10 bg-foreground-200/5 p-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground-200/10 text-primary">
          {left}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-foreground/55">{subtitle}</p>
        </div>
      </div>
      <div className="flex min-w-24 shrink-0 items-center justify-end pl-2">
        {right ?? <span className="text-foreground/40">—</span>}
      </div>
    </li>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <li className="rounded-xl border border-foreground-200/10 bg-foreground-200/5 p-4 text-sm text-foreground/55">
      {text}
    </li>
  )
}

export function CreditsBrowser({
  contributors,
  team,
  testers,
  translators,
  topDonors,
}: {
  contributors: ContributorItem[]
  team: TeamItem[]
  testers: TesterItem[]
  translators: TranslatorItem[]
  topDonors: DonorItem[]
}) {
  const { t, locale } = useT()
  const isEn = locale === 'en'
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category>('all')
  const [sort, setSort] = useState<SortKey>('leadership')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/credits/leaderboard')
      .then(res => (res.ok ? (res.json() as Promise<{ items?: LeaderboardEntry[] }>) : null))
      .then((data) => {
        if (alive)
          setLeaderboard(data?.items ?? [])
      })
      .catch(() => {
        if (alive)
          setLeaderboard([])
      })
    return () => {
      alive = false
    }
  }, [])

  const q = query.trim().toLowerCase()
  const hit = (e: Entry) => !q || e.searchText.includes(q)
  const byName = (a: Entry, b: Entry) => a.name.localeCompare(b.name, 'tr')
  const arrange = (list: Entry[]) => {
    const sorted = sort === 'az'
      ? [...list].sort(byName)
      : [...list].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0) || byName(a, b))
    return sorted.filter(hit)
  }

  const contributorEntries: Entry[] = contributors.map(c => ({
    key: c.name,
    name: c.name,
    searchText: `${c.name} ${c.role} ${c.roleEn}`.toLowerCase(),
    render: () => (
      <CreditRow
        left={c.name
          .split(' ')
          .map(w => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()}
        title={c.name}
        subtitle={(
          <>
            <RoleIcon name={c.roleIcon} />
            {' '}
            {isEn ? c.roleEn : c.role}
          </>
        )}
        right={
          c.link
            ? (
                <a
                  href={c.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-foreground-200/15 bg-background px-3 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {t('credits.visit')}
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" x2="21" y1="14" y2="3" />
                  </svg>
                </a>
              )
            : undefined
        }
      />
    ),
  }))

  const testerEntries: Entry[] = testers.map(x => ({
    key: x.name,
    name: x.name,
    searchText: `${x.name} ${x.noteTr} ${x.noteEn}`.toLowerCase(),
    render: () => (
      <CreditRow
        left={<PersonIcon />}
        title={x.name}
        subtitle={isEn ? x.noteEn : x.noteTr}
      />
    ),
  }))

  const translatorEntries: Entry[] = translators.map(x => ({
    key: x.lang,
    name: x.lang,
    searchText: `${x.lang} ${x.name} ${x.noteTr} ${x.noteEn}`.toLowerCase(),
    render: () => (
      <CreditRow
        left={<PersonIcon />}
        title={(
          <>
            {x.lang}
            {' '}
            <span className="text-foreground/40">
              —
              {x.name}
            </span>
          </>
        )}
        subtitle={isEn ? x.noteEn : x.noteTr}
      />
    ),
  }))

  const donorEntries: Entry[] = topDonors.map(x => ({
    key: x.nameTr,
    name: isEn ? x.nameEn : x.nameTr,
    searchText: `${x.nameTr} ${x.nameEn} ${x.noteTr} ${x.noteEn}`.toLowerCase(),
    render: rank => (
      <CreditRow
        left={<span className="text-sm font-bold text-primary">{rank}</span>}
        title={isEn ? x.nameEn : x.nameTr}
        subtitle={(
          <a
            href="/donate"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            {isEn ? x.noteEn : x.noteTr}
          </a>
        )}
      />
    ),
  }))

  const teamEntries: Entry[] = team.map(x => ({
    key: x.name,
    name: x.name,
    searchText: `${x.name} ${x.role} ${x.roleEn}`.toLowerCase(),
    render: () => (
      <CreditRow
        left={<PersonIcon />}
        title={x.name}
        subtitle={isEn ? x.roleEn : x.role}
      />
    ),
  }))

  const viewsLine = (count: number) =>
    t('credits.views').replace('{count}', String(count))

  const sponsorEntries: Entry[] = (leaderboard ?? []).map(x => ({
    key: x.sponsor,
    name: x.sponsor,
    searchText: `${x.sponsor} ${t('credits.sponsorRole')} ${viewsLine(x.views)}`.toLowerCase(),
    revenue: x.estimatedRevenue,
    render: rank => (
      <CreditRow
        left={<span className="text-sm font-bold text-primary">{rank}</span>}
        title={x.sponsor}
        subtitle={(
          <>
            {t('credits.sponsorRole')}
            {' · '}
            {viewsLine(x.views)}
          </>
        )}
        right={(
          <span className="whitespace-nowrap text-xs font-semibold text-primary">
            {t('credits.earned').replace('{amount}', formatUsd(x.estimatedRevenue))}
          </span>
        )}
      />
    ),
  }))

  const shownContributors = arrange(contributorEntries)
  const shownTesters = arrange(testerEntries)
  const shownTranslators = arrange(translatorEntries)
  const shownDonors = arrange(donorEntries)
  const shownTeam = arrange(teamEntries)
  const shownSponsors = arrange(sponsorEntries)

  const catAllows = (g: Category) => category === 'all' || category === g
  const teamEmptyCard = catAllows('team') && team.length === 0 && !q
  const sponsorsLoadingCard = catAllows('sponsors') && leaderboard === null
  const sponsorsEmptyCard
    = catAllows('sponsors') && leaderboard !== null && leaderboard.length === 0 && !q
  const total = shownContributors.length
    + shownTesters.length
    + shownTranslators.length
    + shownDonors.length
    + shownTeam.length
    + shownSponsors.length
  const noResults = total === 0 && !teamEmptyCard && !sponsorsEmptyCard && !sponsorsLoadingCard

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* Toolbar — search + category filter + sort */}
      <div className="flex w-full flex-col gap-3">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('credits.search')}
          aria-label={t('credits.search')}
          className="h-11 w-full"
          startContent={<SearchIcon size={16} />}
        />
        <div className="flex w-full flex-row flex-wrap items-center gap-2">
          <SearchableCombobox
            options={[
              { value: 'all', label: t('credits.filterAll') },
              { value: 'contributors', label: t('credits.filterContributors') },
              { value: 'team', label: t('credits.filterTeam') },
              { value: 'sponsors', label: t('credits.filterSponsors') },
            ]}
            selected={[category]}
            onSelect={v => setCategory(v as Category)}
            onClear={() => setCategory('all')}
            placeholder={t('credits.filterAll')}
            searchPlaceholder={t('common.search')}
            ariaLabel={t('credits.filterAll')}
          />
          <SearchableCombobox
            options={[
              { value: 'leadership', label: t('credits.sortLeadership') },
              { value: 'az', label: t('credits.sortAz') },
            ]}
            selected={[sort]}
            onSelect={v => setSort(v as SortKey)}
            onClear={() => setSort('leadership')}
            placeholder={t('credits.sort')}
            searchPlaceholder={t('common.search')}
            ariaLabel={t('credits.sort')}
          />
          <span className="ml-auto text-sm font-medium text-foreground/70">
            {total}
            {' '}
            {t('credits.found')}
          </span>
        </div>
      </div>

      {catAllows('contributors') && shownContributors.length > 0 && (
        <CreditGroup
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18} fill="currentColor" className="text-primary">
              <path d="M20.33 3.06a1 1 0 0 0-1.11.32L16 7.4l-3.22-4.02c-.38-.47-1.18-.47-1.56 0L8 7.4L4.78 3.38c-.27-.33-.71-.46-1.11-.32S3 3.58 3 4v15c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-.42-.27-.8-.67-.94M7.22 9.63c.38.47 1.18.47 1.56 0L12 5.61l3.22 4.02c.38.47 1.18.47 1.56 0L19 6.86v8.15H5V6.85l2.22 2.77ZM5 19.01v-2h14v2z" />
            </svg>
          )}
          title={t('credits.contributors')}
        >
          {shownContributors.map((e, i) => e.render(i + 1))}
        </CreditGroup>
      )}

      {catAllows('contributors') && shownTesters.length > 0 && (
        <CreditGroup
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M9 1v7L2 20v3h20v-3L15 8V1m0 17a1 1 0 1 0 0-2a1 1 0 0 0 0 2Zm-6 2a1 1 0 1 0 0-2a1 1 0 0 0 0 2Zm9-7c-7-3-6 4-12 1M6 1h12" />
            </svg>
          )}
          title={t('credits.testers')}
          description={t('credits.testersDescription')}
        >
          {shownTesters.map((e, i) => e.render(i + 1))}
        </CreditGroup>
      )}

      {catAllows('contributors') && shownTranslators.length > 0 && (
        <CreditGroup
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18} fill="currentColor" className="text-primary">
              <path d="M17 11c-.4 0-.75.23-.91.59l-4 9l1.83.81l1.07-2.41h4.03l1.07 2.41l1.83-.81l-4-9a1 1 0 0 0-.91-.59Zm-1.13 6L17 14.46L18.13 17zm-3.62-2.03l.49-1.94c-.13-.03-1.6-.43-3.17-1.42c1.4-1.41 2.49-3.26 2.74-5.61h1.68V4h-5V2h-2v2H2v2h8.3c-.25 1.91-1.19 3.34-2.31 4.4C7.3 9.75 6.68 8.96 6.25 8H4.12c.5 1.44 1.33 2.63 2.3 3.61c-1.57.99-3.04 1.39-3.17 1.42l.49 1.94c1.18-.3 2.76-.96 4.26-2.02c1.49 1.06 3.08 1.72 4.25 2.02" />
            </svg>
          )}
          title={t('credits.translators')}
          description={t('credits.translatorsDescription')}
        >
          {shownTranslators.map((e, i) => e.render(i + 1))}
        </CreditGroup>
      )}

      {catAllows('contributors') && shownDonors.length > 0 && (
        <CreditGroup
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18} fill="currentColor" className="text-primary">
              <path d="m21.32 12.05l-2.23-.74c-.81-.27-1.69-.11-2.35.42l-3.4 2.72l-1.17-2.34A2 2 0 0 0 10.38 11H4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h9.62c1.17 0 2.28-.51 3.04-1.4l5.1-5.95c.22-.25.29-.6.2-.92s-.33-.58-.65-.68Zm-6.18 6.25c-.38.44-.93.7-1.52.7H4v-6h6.38l1 2H7v2h6c.23 0 .45-.08.63-.22l4.36-3.49c.13-.11.31-.14.47-.08l.81.27z" />
              <path d="M13.28 10.69a.99.99 0 0 0 1.44 0l3.4-3.57C18.69 6.55 19 5.8 19 5s-.31-1.55-.88-2.12S16.8 2 16 2c-.06 0-1 .02-2 .7c-1-.68-1.85-.74-2-.7c-.8 0-1.56.31-2.12.88C9.31 3.45 9 4.2 9 5s.31 1.56.86 2.1l3.41 3.59Zm-1.98-6.4c.19-.19.44-.29.68-.29c.03 0 .65.04 1.31.71c.39.39 1.02.39 1.41 0c.67-.67 1.29-.71 1.29-.71a.99.99 0 0 1 1 1c0 .27-.1.52-.31.72l-2.69 2.83l-2.71-2.84c-.19-.19-.29-.44-.29-.71s.1-.52.29-.71Z" />
            </svg>
          )}
          title={t('credits.topDonors')}
          description={t('credits.topDonorsDescription')}
        >
          {shownDonors.map((e, i) => e.render(i + 1))}
        </CreditGroup>
      )}

      {catAllows('team') && (shownTeam.length > 0 || teamEmptyCard) && (
        <CreditGroup
          icon={(
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18} fill="currentColor" className="text-primary">
              <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3s-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5S5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05c1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
          )}
          title={t('credits.team')}
          description={t('credits.teamDescription')}
        >
          {teamEmptyCard
            ? <EmptyRow text={t('credits.teamComingSoon')} />
            : shownTeam.map((e, i) => e.render(i + 1))}
        </CreditGroup>
      )}

      {catAllows('sponsors')
        && (sponsorsLoadingCard || shownSponsors.length > 0 || sponsorsEmptyCard) && (
          <CreditGroup
            icon={(
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            )}
            title={t('credits.sponsors')}
            description={t('credits.sponsorsDescription')}
          >
            {sponsorsLoadingCard
              ? <EmptyRow text={t('common.loading')} />
              : sponsorsEmptyCard
                ? <EmptyRow text={t('credits.sponsorsEmpty')} />
                : shownSponsors.map((e, i) => e.render(i + 1))}
          </CreditGroup>
        )}

      {noResults && (
        <p className="text-foreground-500 py-10 text-center text-sm">
          {t('credits.noResults')}
        </p>
      )}
    </div>
  )
}