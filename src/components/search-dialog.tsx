'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, Fragment, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useT } from '@/components/locale-provider'
import { CloseIcon, GithubIcon, SearchIcon } from '@/components/ui/icons'
import { clientFetchUserRepos } from '@/lib/github-client'
import type { GitHubRepo } from '@/lib/github'

// ─── Types ──────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  title: string
  description?: string
  href: string
  icon: React.ReactNode
}

// ─── Static navigation items ────────────────────────────────────────

const NAV_ITEMS: { title: string; titleEn: string; titleTr: string; href: string }[] = [
  { title: 'Home', titleEn: 'Home', titleTr: 'Ana Sayfa', href: '/' },
  { title: 'Projects', titleEn: 'Projects', titleTr: 'Projeler', href: '/projects/' },
  { title: 'Blog', titleEn: 'Blog', titleTr: 'Blog', href: '/blog/' },
  { title: 'GitHub', titleEn: 'GitHub', titleTr: 'GitHub', href: '/github/' },
  { title: 'About', titleEn: 'About', titleTr: 'Hakkında', href: '/#about' },
  { title: 'Contact', titleEn: 'Contact', titleTr: 'İletişim', href: '/#contact' },
]

// ─── Blog demo data (hardcoded) ────────────────────────────────────

const BLOG_POSTS: { title: string; slug: string; excerpt: string }[] = [
  { title: 'Building a Portfolio with Next.js', slug: 'building-portfolio-nextjs', excerpt: 'How I built this portfolio site from scratch' },
  { title: 'TypeScript Tips & Tricks', slug: 'typescript-tips-tricks', excerpt: 'Advanced TypeScript patterns for everyday use' },
  { title: 'React Server Components', slug: 'react-server-components', excerpt: 'Understanding RSC and when to use them' },
]

// ─── Helpers ────────────────────────────────────────────────────────

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t.includes(q)) return true
  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  return qi === q.length
}

const GITHUB_USERNAME = 'TARIKELER-TARNAK'

// ─── Component ──────────────────────────────────────────────────────

export function SearchDialog() {
  const { t, locale } = useT()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [reposLoading, setReposLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Open / close ────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onRequest = () => {
      setOpen(true)
      setQuery('')
    }
    window.addEventListener('search:request-open', onRequest)
    return () => window.removeEventListener('search:request-open', onRequest)
  }, [])

  // ── Fetch repos on open ────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    if (repos.length > 0) return

    setReposLoading(true)
    clientFetchUserRepos(GITHUB_USERNAME)
      .then(setRepos)
      .catch(() => setRepos([]))
      .finally(() => setReposLoading(false))
  }, [open, repos.length])

  // ── Focus input on open ────────────────────────────────────────

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(id)
    }
  }, [open])

  // ── Body scroll lock ───────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // ── Build search groups ────────────────────────────────────────

  const groups = useMemo(() => {
    const q = query.trim()
    const out: { label: string; items: SearchResult[] }[] = []

    const navItems: SearchResult[] = NAV_ITEMS
      .filter(item => {
        if (!q) return true
        const label = locale === 'tr' ? item.titleTr : item.titleEn
        return fuzzyMatch(q, label) || fuzzyMatch(q, item.titleEn)
      })
      .map(item => ({
        id: `nav-${item.href}`,
        title: locale === 'tr' ? item.titleTr : item.titleEn,
        href: item.href,
        icon: (
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-foreground-500">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        ),
      }))
    if (navItems.length > 0) {
      out.push({ label: t('search.nav') || 'Navigation', items: navItems.slice(0, 8) })
    }

    const projectItems: SearchResult[] = repos
      .filter(repo => {
        if (!q) return true
        return fuzzyMatch(q, repo.name) || fuzzyMatch(q, repo.description ?? '')
      })
      .map(repo => ({
        id: `repo-${repo.fullName}`,
        title: repo.name,
        description: repo.description ?? undefined,
        href: `/github/${repo.fullName}`,
        icon: <GithubIcon size={16} className="text-foreground-500" />,
      }))
    if (projectItems.length > 0) {
      out.push({ label: t('search.projects') || 'Projects', items: projectItems.slice(0, 8) })
    }

    if (q) {
      const ghItems: SearchResult[] = repos
        .filter(repo => fuzzyMatch(q, repo.name) || fuzzyMatch(q, repo.description ?? ''))
        .map(repo => ({
          id: `gh-${repo.fullName}`,
          title: repo.fullName,
          description: repo.language ?? undefined,
          href: `/github/${repo.fullName}`,
          icon: <GithubIcon size={16} className="text-foreground-500" />,
        }))
      if (ghItems.length > 0) {
        out.push({ label: t('search.github') || 'GitHub', items: ghItems.slice(0, 8) })
      }
    }

    const blogItems: SearchResult[] = BLOG_POSTS
      .filter(post => {
        if (!q) return true
        return fuzzyMatch(q, post.title) || fuzzyMatch(q, post.excerpt)
      })
      .map(post => ({
        id: `blog-${post.slug}`,
        title: post.title,
        description: post.excerpt,
        href: `/blog/${post.slug}/`,
        icon: (
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-foreground-500">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
      }))
    if (blogItems.length > 0) {
      out.push({ label: t('search.blog') || 'Blog', items: blogItems.slice(0, 8) })
    }

    return out
  }, [query, repos, locale, t])

  // ── Navigate to result ─────────────────────────────────────────

  const navigateTo = useCallback((href: string) => {
    setOpen(false)
    router.push(href)
  }, [router])

  // ── Render ─────────────────────────────────────────────────────

  return (
    <>
      {/* Dialog */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop — full screen solid */}
            <motion.div
              className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
            />

            {/* Panel — full width, slightly below top so TopBar disappears behind backdrop */}
            <motion.div
              className="fixed inset-x-0 top-[10vh] z-[201] mx-auto w-full max-w-lg px-4"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <div
                className="flex max-h-[72vh] flex-col overflow-hidden rounded-2xl border border-foreground-200/15 bg-background shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-label={t('search.title') || 'Search'}
              >
                <Command
                  className="bg-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setOpen(false)
                  }}
                >
                  {/* Search input + close (X, within focus ring) */}
                  <CommandInput
                    ref={inputRef}
                    value={query}
                    onValueChange={setQuery}
                    placeholder={t('search.placeholder') || 'Type a command or search...'}
                  >
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="flex h-7 shrink-0 items-center rounded-md px-1.5 text-foreground-500 transition-colors hover:text-foreground"
                      aria-label={t('common.close') || 'Close'}
                    >
                      <CloseIcon size={16} />
                    </button>
                  </CommandInput>

                  {/* Results */}
                  <CommandList>
                    <CommandEmpty>
                      {reposLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground-200/20 border-t-primary" />
                          <span className="ml-2 text-sm text-foreground-500">
                            {t('common.loading') || 'Loading...'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <SearchIcon size={28} className="mb-3 text-foreground-500/40" />
                          <p className="text-sm text-foreground-500">
                            {t('search.noResults') || 'No results found'}
                          </p>
                          <p className="mt-1 text-xs text-foreground-500/60">{query}</p>
                        </div>
                      )}
                    </CommandEmpty>
                    {groups.map((group, gi) => (
                      <Fragment key={group.label}>
                        <CommandGroup heading={group.label}>
                          {group.items.map(item => (
                            <CommandItem
                              key={item.id}
                              value={`${item.title} ${item.description ?? ''} ${item.href}`}
                              onSelect={() => navigateTo(item.href)}
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-foreground-200/10 bg-foreground/5">
                                {item.icon}
                              </span>
                              <div className="flex min-w-0 flex-1 flex-col">
                                <span className="truncate font-medium">{item.title}</span>
                                {item.description && (
                                  <span className="truncate text-xs text-foreground-500/60">
                                    {item.description}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {gi < groups.length - 1 && <CommandSeparator />}
                      </Fragment>
                    ))}
                  </CommandList>

                  {/* Footer */}
                  <div className="flex shrink-0 items-center gap-4 border-t border-foreground-200/10 px-4 py-2">
                    <span className="flex items-center gap-1 text-[11px] text-foreground-500/50">
                      <kbd className="inline-flex h-4 items-center rounded border border-foreground-200/15 bg-foreground/5 px-1 font-mono text-[10px]">↑</kbd>
                      <kbd className="inline-flex h-4 items-center rounded border border-foreground-200/15 bg-foreground/5 px-1 font-mono text-[10px]">↓</kbd>
                      <span className="ml-0.5">navigate</span>
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-foreground-500/50">
                      <kbd className="inline-flex h-4 items-center rounded border border-foreground-200/15 bg-foreground/5 px-1 font-mono text-[10px]">↵</kbd>
                      <span className="ml-0.5">select</span>
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-foreground-500/50">
                      <kbd className="inline-flex h-4 items-center rounded border border-foreground-200/15 bg-foreground/5 px-1 font-mono text-[10px]">esc</kbd>
                      <span className="ml-0.5">close</span>
                    </span>
                  </div>
                </Command>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}