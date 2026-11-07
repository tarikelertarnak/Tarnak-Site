'use client'

/**
 * TopBar — fixed top bar with sidebar toggle, brand, page nav, and search trigger.
 *
 * The Sidebar (left panel) is closed by default on desktop. Users click the
 * hamburger icon to slide it in. This mirrors the live site (tarikelertarnak.github.io)
 * which uses a top-bar pattern instead of always-visible sidebar.
 *
 * Nav (2026-11-08): fixed bar now carries a horizontal, per-page navigation
 * so users can jump between in-page sections without opening the sidebar.
 * Items are derived from the current pathname (`getPageNav`).
 */
import { motion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useT } from '@/components/locale-provider'
import { SiteLogo } from '@/components/logo'
import { MenuIcon, SearchIcon } from '@/components/ui/icons'
import { scrollToElement } from '@/lib/scroll'

interface NavItem {
  key: string
  label: string
  /** In-page anchor (without #) or full path. */
  target: string
  kind: 'anchor' | 'route'
}

function getPageNav(pathname: string, t: (k: string) => string): NavItem[] {
  // Home: in-page section jumps.
  if (pathname === '/' || pathname === '') {
    return [
      { key: 'about', label: t('nav.about'), target: 'about', kind: 'anchor' },
      { key: 'projects', label: t('nav.projects'), target: 'projects', kind: 'anchor' },
      { key: 'blog', label: t('nav.blog'), target: 'blog', kind: 'anchor' },
      { key: 'contact', label: t('hero.feedback'), target: 'contact', kind: 'anchor' },
    ]
  }
  // Other pages: quick cross-page links, current page highlighted.
  const base: NavItem[] = [
    { key: 'home', label: t('nav.home'), target: '/', kind: 'route' },
    { key: 'projects', label: t('nav.projects'), target: '/projects', kind: 'route' },
    { key: 'blog', label: t('nav.blog'), target: '/blog', kind: 'route' },
    { key: 'about', label: t('nav.about'), target: '/about', kind: 'route' },
    { key: 'contact', label: t('hero.feedback'), target: '/contact', kind: 'route' },
    { key: 'chat', label: t('nav.chat'), target: '/chat', kind: 'route' },
  ]
  return base
}

export function TopBar() {
  const { t } = useT()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Listen for sidebar toggle from Sidebar component
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ open: boolean }>
      void custom.detail.open
    }
    window.addEventListener('sidebar:toggle', handler)
    return () => window.removeEventListener('sidebar:toggle', handler)
  }, [])

  const openSidebar = () => {
    window.dispatchEvent(new CustomEvent('sidebar:request-toggle'))
  }

  const navItems = getPageNav(pathname ?? '/', t)

  const jumpTo = (item: NavItem) => {
    if (item.kind === 'anchor') {
      const el = document.getElementById(item.target)
      if (el)
scrollToElement(el)
    }
  }

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`fixed top-0 right-0 left-0 z-30 transition-[background-color,border-color] duration-200 ${
          scrolled
            ? 'h-12 border-b border-white/10 bg-black/80 backdrop-blur-md'
            : 'h-14 border-b border-transparent bg-black/40'
        }`}
      >
        <div
          className={`relative flex h-full items-center justify-between gap-4 transition-[padding] duration-200 ${
            scrolled ? 'px-3' : 'px-3 sm:px-6'
          }`}
        >
          {/* Left: hamburger + brand */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={openSidebar}
              aria-label={t('common.toggleSidebar')}
              className={`flex shrink-0 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-white/5 hover:text-foreground ${
                scrolled ? 'h-8 w-8' : 'h-9 w-9'
              }`}
            >
              <MenuIcon size={scrolled ? 18 : 20} />
            </button>
            <Link
              href="/"
              onClick={(e) => {
                if (
                  typeof window !== 'undefined'
                  && window.location.pathname === '/'
                ) {
                  e.preventDefault()
                  // scrollToTop imported lazily below via window
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }
              }}
              className={`group relative z-10 flex items-center gap-2 font-bold tracking-tight whitespace-nowrap ${
                scrolled ? 'text-xs' : 'text-sm sm:text-base'
              }`}
            >
              <SiteLogo
                size={28}
                className={`shrink-0 transition-all duration-200 ${
                  scrolled ? 'h-6 w-6' : 'h-7 w-7 sm:h-7 sm:w-7'
                } group-hover:opacity-80`}
              />
              <span className="inline select-text text-foreground transition-colors duration-200 group-hover:text-primary group-focus-visible:text-primary">
                TARIK ELER
              </span>
              <span className="inline select-text text-foreground/30 transition-colors duration-200 group-hover:text-primary group-focus-visible:text-primary">
                —
              </span>
              <span className="inline select-text text-foreground transition-colors duration-200 group-hover:text-primary group-focus-visible:text-primary">
                TARNAK
              </span>
            </Link>
          </div>

          {/* Middle: page nav (horizontal, scrollable) */}
          <nav
            aria-label="Page navigation"
            className="hidden md:flex flex-1 items-center justify-center gap-1 min-w-0 overflow-x-auto"
          >
            {navItems.map((item) => {
              const active
                = item.kind === 'route'
                  ? pathname === item.target || pathname?.startsWith(`${item.target}/`)
                  : false
              const cls = `shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-foreground/60 hover:bg-white/5 hover:text-foreground'
              }`
              if (item.kind === 'anchor') {
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => jumpTo(item)}
                    className={cls}
                  >
                    {item.label}
                  </button>
                )
              }
              return (
                <Link key={item.key} href={item.target} className={cls}>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right: search button with right margin */}
          <div className="flex shrink-0 items-center gap-2 min-w-0 justify-end mr-4">
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent('search:request-open'))}
              aria-label={t('common.search')}
              className={`flex shrink-0 min-w-0 items-center justify-between gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-foreground/70 transition-colors hover:border-white/20 hover:text-foreground min-w-[44px] sm:min-w-[64px] sm:max-w-[220px] md:max-w-[280px] ${
                scrolled ? 'h-9' : 'h-10'
              }`}
            >
              <SearchIcon size={scrolled ? 14 : 16} />
              <span className="hidden sm:inline text-[11px] sm:text-sm font-medium text-foreground">{t('common.search')}</span>
              <kbd className="pointer-events-none shrink-0 inline-flex items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1 font-mono text-[10px] text-foreground/50">
                <span>⌘</span>
                <span>K</span>
              </kbd>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Spacer so content doesn't go under fixed header — height matches the bar */}
      <div
        aria-hidden
        className={`w-full transition-all duration-300 ${
          scrolled ? 'h-12' : 'h-14'
        }`}
      />
    </>
  )
}
