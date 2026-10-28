'use client'

/**
 * TopBar — fixed top bar with sidebar toggle, brand, and search trigger.
 *
 * The Sidebar (left panel) is closed by default on desktop. Users click the
 * hamburger icon to slide it in. This mirrors the live site (tarikelertarnak.github.io)
 * which uses a top-bar pattern instead of always-visible sidebar.
 */

import { motion } from 'motion/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useT } from '@/components/locale-provider'
import { SiteLogo } from '@/components/logo'
import { MenuIcon, SearchIcon } from '@/components/ui/icons'
import { scrollToTop } from '@/lib/scroll'

export function TopBar() {
  const { t } = useT()
  const [scrolled, setScrolled] = useState(false)

  /*
    2026-10-07 (lint temizliği): burada `pathname`, `router`,
    `isAdmin` ve `adminChecked` vardı ve HİÇBİRİ okunmuyordu. `isAdmin`
    yüzünden her sayfa yüklemesinde `/api/admin/session` isteği atılıyor,
    yanıtı çöpe gidiyordu. Kaldırıldı: boşuna istek + boşuna render.
  */

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
                  scrollToTop()
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

          {/* Center: search (desktop) */}
          <div className="hidden md:flex flex-1 justify-center">
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent('search:request-open'))}
              aria-label={t('common.search')}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-foreground/60 transition-colors hover:border-white/25 hover:text-foreground min-w-[280px] max-w-md"
            >
              <SearchIcon size={16} />
              <span className="flex-1 text-left truncate">
                {t('common.search')}
                ...
              </span>
              <kbd className="pointer-events-none inline-flex items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] text-foreground/50">
                <span>⌘</span>
                <span>K</span>
              </kbd>
            </button>
          </div>

          {/* Right: search trigger (mobile) */}
          <div className="flex shrink-0 items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent('search:request-open'))}
              aria-label={t('common.search')}
              className={`flex shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-foreground/60 transition-colors hover:border-white/25 hover:text-foreground ${
                scrolled ? 'h-8 w-8' : 'h-9 w-9'
              }`}
            >
              <SearchIcon size={scrolled ? 14 : 16} />
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
