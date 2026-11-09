'use client'

/**
 * TopBar — fixed top bar with sidebar toggle, brand, page nav, and search trigger.
 *
 * Nav (2026-11-08): in-page section links (Hakkımda, Projeler, Blog, İletişim)
 * appear ONLY on the home page. On every other page the nav is fully removed
 * — the user navigates by URL instead.
 */
import { motion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useT } from '@/components/locale-provider'
import { SiteLogo } from '@/components/logo'
import {
  FolderIcon,
  MenuIcon,
  NewspaperIcon,
  SearchIcon,
  SendIcon,
  UserIcon,
} from '@/components/ui/icons'
import { useScrollState } from '@/hooks/use-scroll-state'
import { scrollToElement, scrollToTop } from '@/lib/scroll'

interface NavItem {
  key: string
  label: string
  target: string
  kind: 'anchor' | 'route'
  icon: (props: { size?: number, className?: string }) => React.ReactElement
}

function getPageNav(pathname: string, t: (k: string) => string): NavItem[] {
  // Nav SADECE ana sayfada. Diğer sayfalarda boş — nav rendered edilmez.
  if (pathname === '/' || pathname === '') {
    return [
      { key: 'about', label: t('nav.about'), target: 'about', kind: 'anchor', icon: UserIcon },
      { key: 'projects', label: t('nav.projects'), target: 'projects', kind: 'anchor', icon: FolderIcon },
      { key: 'blog', label: t('nav.blog'), target: 'blog', kind: 'anchor', icon: NewspaperIcon },
      { key: 'contact', label: t('hero.feedback'), target: 'contact', kind: 'anchor', icon: SendIcon },
    ]
  }
  return []
}

export function TopBar() {
  const { t } = useT()
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const onScrollProgress = () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
      setScrollProgress(height ? (winScroll / height) * 100 : 0)
    }
    onScrollProgress()
    window.addEventListener('scroll', onScrollProgress, { passive: true })
    return () => window.removeEventListener('scroll', onScrollProgress)
  }, [])

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

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const state = useScrollState(scrollRef)

  const jumpTo = (item: NavItem) => {
    if (item.kind !== 'anchor')
      return
    const el = document.getElementById(item.target)
    if (!el)
      return
    // `Section` içinde `id` bir `absolute -top-20` boş div'dir — doğrudan
    // getBoundingClientRect() ile hesaplanırsa bölüm 80–96px YUKARI gider
    // (bkz. lib/hero-scroll.ts). Hedefin gerçek içeriğini (h2 / ilk child)
    // kullanarak üst çubuğun hemen altına getir.
    const target = el.querySelector<HTMLElement>('h2, h1') ?? el.firstElementChild as HTMLElement | null
    scrollToElement(target ?? el)
  }

  const TabArrow = ({ side, disabled, onClick }: { side: 'left' | 'right', disabled: boolean, onClick: () => void }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={side === 'left' ? 'Sola kaydır' : 'Sağa kaydır'}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-fg transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="text-sm font-bold">{side === 'left' ? '‹' : '›'}</span>
    </button>
  )

  const isHome = pathname === '/' || pathname === ''

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`fixed top-0 right-0 left-0 z-30 transition-[height,background-color,border-color] duration-300 ease-out ${
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
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <button
              type="button"
              onClick={openSidebar}
              aria-label={t('common.toggleSidebar')}
              className={`flex shrink-0 items-center justify-center rounded-lg text-foreground/70 transition-[height,width,color,background-color] duration-300 ease-out hover:bg-white/5 hover:text-foreground ${
                scrolled ? 'h-8 w-8' : 'h-9 w-9'
              }`}
            >
              <MenuIcon size={scrolled ? 18 : 20} />
            </button>
            <Link
              href="/"
              onClick={(e) => {
                if (typeof window !== 'undefined' && window.location.pathname === '/') {
                  e.preventDefault()
                  scrollToTop()
                }
              }}
              className={`group relative z-10 flex items-center gap-2 font-bold tracking-tight whitespace-nowrap transition-[font-size] duration-300 ease-out ${
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

          {/* Middle: page nav (centered, scrollable with arrows) — SADECE ana sayfada */}
          <div className="flex flex-1 items-center justify-center min-w-0 gap-1">
            {isHome ? (
              <>
                {state.hasOverflow && (
                  <TabArrow side="left" disabled={!state.canScrollLeft} onClick={() => state.scrollBy(-1)} />
                )}
                <div
                  ref={scrollRef}
                  className="flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-x-auto scroll-smooth px-1"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const cls = `shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      'border-white/10 bg-white/5 text-foreground/70 hover:border-primary/40 hover:bg-primary/10 hover:text-foreground'
                    }`
                    return (
                      <button key={item.key} type="button" onClick={() => jumpTo(item)} className={cls}>
                        <Icon size={14} />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
                {state.hasOverflow && (
                  <TabArrow side="right" disabled={!state.canScrollRight} onClick={() => state.scrollBy(1)} />
                )}
              </>
            ) : null}
          </div>

          {/* Right: search button with right margin */}
          <div className="flex shrink-0 items-center gap-2 min-w-0 justify-end mr-4">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('search:request-open'))}
              aria-label={t('common.search')}
              className={`flex shrink-0 min-w-0 items-center justify-between gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-foreground/70 transition-[height,width,color,background-color,border-color] duration-300 ease-out hover:border-white/20 hover:text-foreground min-w-[44px] sm:min-w-[64px] sm:max-w-[220px] md:max-w-[280px] ${
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
        {/* İlerleme çubuğu: nav'ın hemen dibine bitişik (absolute bottom-0),
            yalnızca istemci tarafında render edilir (SSR'de yok → hydration mismatch yok) */}
        {isMounted && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1 bg-primary transition-all duration-300 z-[31]"
            style={{ width: `${scrollProgress}%` }}
          />
        )}
      </motion.header>

      <div
        aria-hidden
        className={`w-full transition-all duration-300 ${
          scrolled ? 'h-12' : 'h-14'
        }`}
      />
    </>
  )
}
