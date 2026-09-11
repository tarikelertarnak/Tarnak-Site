'use client'

/**
 * TopBar — fixed top bar with sidebar toggle, brand, and search trigger.
 *
 * The Sidebar (left panel) is closed by default on desktop. Users click the
 * hamburger icon to slide it in. This mirrors the live site (tarikeler-tarnak.github.io)
 * which uses a top-bar pattern instead of always-visible sidebar.
 */

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { usePathname, useRouter } from 'next/navigation'
import { useT } from '@/components/locale-provider'

export function TopBar() {
  const { t } = useT()
  const pathname = usePathname()
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/session')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setIsAdmin(data.user?.role === 'admin')
        setAdminChecked(true)
      })
      .catch(() => {
        if (!cancelled) setAdminChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

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

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={`fixed top-0 right-0 left-0 z-30 transition-all duration-300 ${
          scrolled
            ? 'h-12 border-b border-white/10 bg-black/80 backdrop-blur-md'
            : 'h-14 border-b border-transparent bg-black/40'
        }`}
      >
        <div
          className={`flex h-full items-center justify-between gap-3 transition-all duration-300 ${
            scrolled ? 'px-3' : 'px-3 sm:px-6'
          }`}
        >
          {/* Left: hamburger + brand */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={openSidebar}
              aria-label={t('common.toggleSidebar')}
              className={`flex shrink-0 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-white/5 hover:text-foreground ${
                scrolled ? 'h-8 w-8' : 'h-9 w-9'
              }`}
            >
              <HamburgerIcon small={scrolled} />
            </button>
            <a
              href="/"
              onClick={(e) => {
                if (typeof window !== 'undefined' && window.location.pathname === '/') {
                  e.preventDefault()
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }
              }}
              className={`flex items-center gap-2 font-bold tracking-tight whitespace-nowrap transition-all duration-300 ${
                scrolled ? 'text-xs' : 'text-sm sm:text-base'
              }`}
            >
              <img
                src="/tarnak-white.svg"
                alt="TARNAK"
                width={28}
                height={28}
                className={`shrink-0 transition-all duration-300 ${
                  scrolled ? 'h-6 w-6' : 'h-7 w-7 sm:h-7 sm:w-7'
                }`}
              />
              <span className="inline">TARIK ELER</span>
              <span className="inline text-foreground/30">—</span>
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text font-black text-transparent">
                TARNAK
              </span>
            </a>
          </div>

          {/* Right: edit (admin) + search trigger (command palette) */}
          <div className="flex shrink-0 items-center gap-2">
            {adminChecked && isAdmin && !pathname.startsWith('/admin') && (
              <button
                type="button"
                onClick={() => {
                  const page =
                    pathname === '/'
                      ? 'home'
                      : pathname.replace(/^\//, '').replace(/\//g, '-') || 'home'
                  router.push(`/admin/puck/${page}`)
                }}
                aria-label={t('common.edit')}
                title={t('common.edit')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary transition-colors hover:border-primary/50 hover:bg-primary/20 ${
                  scrolled ? 'h-8 px-2.5' : 'h-9 px-3'
                }`}
              >
                <svg
                  width={scrolled ? 14 : 16}
                  height={scrolled ? 14 : 16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                  <path d="m15 5 4 4" />
                </svg>
                <span className="hidden sm:inline">{t('common.edit')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('search:request-open'))}
              aria-label={t('common.search')}
              className={`flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] text-foreground/60 transition-colors hover:border-white/25 hover:text-foreground ${
                scrolled ? 'h-8 px-2.5' : 'h-9 px-3'
              }`}
            >
              <svg
                width={scrolled ? 14 : 16}
                height={scrolled ? 14 : 16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span className="hidden min-w-0 flex-1 truncate text-xs sm:inline">
                {t('common.search')}...
              </span>
              <kbd className="pointer-events-none hidden shrink-0 items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] text-foreground/50 sm:inline-flex">
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

function HamburgerIcon({ small }: { small?: boolean }) {
  const size = small ? 18 : 20
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  )
}
