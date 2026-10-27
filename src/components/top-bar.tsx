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
import { LORD_ICONS, LordIcon } from '@/components/ui/lord-icon'
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
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={openSidebar}
              aria-label={t('common.toggleSidebar')}
              className={`flex shrink-0 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-white/5 hover:text-foreground ${
                scrolled ? 'h-8 w-8' : 'h-9 w-9'
              }`}
            >
              <LordIcon
                src={LORD_ICONS.menu}
                trigger="hover"
                size={scrolled ? 18 : 20}
                colors="primary:#e5e5e5,secondary:#3b82f6"
              />
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
              className={`group flex items-center gap-2 font-bold tracking-tight whitespace-nowrap ${
                scrolled ? 'text-xs' : 'text-sm sm:text-base'
              }`}
            >
              {/*
                Logo (2026-10-05, kullanıcı): `logo-framed-*.svg` çerçeveli
                marka dosyası. Önceden İKİ ayrı `<img>` vardı
                (`tarnak-white.svg` + `tarnak.svg`) ve `dark:block/dark:hidden`
                ile değiştiriliyordu — iki indirme, iki kopya, iki yer de
                güncellenmeliydi.

                `SiteLogo` inline SVG: `fill=currentColor` (gövde yazı rengini
                alır) + `stroke=var(--tbg)` (çerçeve sayfa zeminini alır, yani
                açık temada siyah gövde + beyaz çerçeve, koyu temada tersi).
                Tema CSS'ten okunduğu için `dark:` varyantı gereksiz.
              */}
              <SiteLogo
                size={28}
                className={`shrink-0 transition-all duration-200 ${
                  scrolled ? 'h-6 w-6' : 'h-7 w-7 sm:h-7 sm:w-7'
                } group-hover:opacity-80`}
              />
              {/* Brand text parts: hover/focus ANYWHERE on the link (group) —
                  all respond equally, as one whole.
                  - TARIK ELER: foreground → primary
                  - Separator: muted → primary
                  - TARNAK: primary → lighter primary
                  - Logo: subtle opacity dip
                  Shared: transition, duration. Link's own focus ring comes
                  from the global :focus-visible rule (tokens.css).
              */}
              <span className="inline text-foreground transition-colors duration-200 group-hover:text-primary group-focus-visible:text-primary">
                TARIK ELER
              </span>
              <span className="inline text-foreground/30 transition-colors duration-200 group-hover:text-primary group-focus-visible:text-primary">
                —
              </span>
              <span className="inline font-black text-primary transition-colors duration-200 group-hover:text-primary/70 group-focus-visible:text-primary/70">
                TARNAK
              </span>
            </Link>
          </div>

          {/* Right: search trigger (command palette) — the admin "Düzenle" button was
              removed: it duplicated the Sayfa Düzenleyici (Puck) entry in the sidebar and
              its client-side admin flag went stale right after logout. */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent('search:request-open'))}
              aria-label={t('common.search')}
              className={`flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 text-foreground/60 transition-colors hover:border-white/25 hover:text-foreground ${
                scrolled ? 'h-8 px-2.5' : 'h-9 px-3'
              }`}
            >
              <LordIcon
                src={LORD_ICONS.search}
                trigger="hover"
                size={scrolled ? 14 : 16}
                colors="primary:#e5e5e5,secondary:#3b82f6"
              />
              <span className="hidden min-w-0 flex-1 truncate text-xs sm:inline">
                {t('common.search')}
                ...
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
