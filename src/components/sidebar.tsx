'use client'

/**
 * Sidebar — left panel that slides in from the left when toggled.
 *
 * Default state: CLOSED. The TopBar hamburger button (or window event) opens it.
 * Closes when:
 *   - User clicks a nav link
 *   - User clicks the backdrop (mobile/tablet)
 *   - User presses Escape
 *   - User toggles again
 *
 * This matches the live site pattern (tarikeler-tarnak.github.io) — sidebar
 * is opt-in, not always visible. Pages no longer need `md:ml-[240px]` since
 * the sidebar overlays content.
 */

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { useT } from '@/components/locale-provider'
import type { SessionUser } from '@/lib/supabase/session'
import {
  CogIcon,
  FolderIcon,
  HouseIcon,
  LoginIcon,
  LogoutIcon,
  NewspaperIcon,
  ShieldIcon,
  UserIcon,
} from '@/components/ui/icons'
import { cn } from '@/components/ui/cn'
import { Link } from '@/components/ui/link'

/* ─── Navigation Items ─────────────────────────────────────── */

/** Support (Donate) icon — heart/mug. */
function DonateIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
    >
      <path d="m21.32 12.05l-2.23-.74c-.81-.27-1.69-.11-2.35.42l-3.4 2.72l-1.17-2.34A2 2 0 0 0 10.38 11H4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h9.62c1.17 0 2.28-.51 3.04-1.4l5.1-5.95c.22-.25.29-.6.2-.92s-.33-.58-.65-.68Zm-6.18 6.25c-.38.44-.93.7-1.52.7H4v-6h6.38l1 2H7v2h6c.23 0 .45-.08.63-.22l4.36-3.49c.13-.11.31-.14.47-.08l.81.27z"/>
      <path d="M13.28 10.69a.99.99 0 0 0 1.44 0l3.4-3.57C18.69 6.55 19 5.8 19 5s-.31-1.55-.88-2.12S16.8 2 16 2c-.06 0-1 .02-2 .7c-1-.68-1.85-.74-2-.7c-.8 0-1.56.31-2.12.88C9.31 3.45 9 4.2 9 5s.31 1.56.86 2.1l3.41 3.59Zm-1.98-6.4c.19-.19.44-.29.68-.29c.03 0 .65.04 1.31.71c.39.39 1.02.39 1.41 0c.67-.67 1.29-.71 1.29-.71a.99.99 0 0 1 1 1c0 .27-.1.52-.31.72l-2.69 2.83l-2.71-2.84c-.19-.19-.29-.44-.29-.71s.1-.52.29-.71Z"/>
    </svg>
  )
}

/** Contributors (credits) icon — document/pen. */
function CreditsIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <g fill="none">
        <path d="M5 3h14v12l-7 5l-7-5z" />
        <path
          stroke="currentColor"
          strokeLinecap="square"
          strokeWidth={2}
          d="M9 8h6m-5 4h4M5 3v12l7 5l7-5V3M5 3H2m3 0h14m0 0h3"
        />
      </g>
    </svg>
  )
}

/** Page Editor icon — pen + square. */
function EditSquareIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </svg>
  )
}

interface NavItem {
  key: string
  labelKey: string
  href: string
  icon: (props: { size?: number; className?: string }) => React.ReactElement
}

const SIDEBAR_WIDTH = 260

const NAV_LINKS: NavItem[] = [
  { key: 'home', labelKey: 'nav.home', href: '/', icon: HouseIcon },
  { key: 'projects', labelKey: 'nav.projects', href: '/projects', icon: FolderIcon },
  { key: 'blog', labelKey: 'nav.blog', href: '/blog', icon: NewspaperIcon },
  { key: 'about', labelKey: 'nav.about', href: '/about', icon: UserIcon },
  { key: 'donate', labelKey: 'nav.donate', href: '/donate', icon: DonateIcon },
  { key: 'credits', labelKey: 'nav.credits', href: '/credits', icon: CreditsIcon },
]

export function Sidebar() {
  const { t } = useT()
  const pathname = usePathname()
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(false)
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    const handler = () => setIsOpen(o => !o)
    window.addEventListener('sidebar:request-toggle', handler)
    return () => window.removeEventListener('sidebar:request-toggle', handler)
  }, [])

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('sidebar:state', { detail: { open: isOpen } }),
    )
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen])

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/session')
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        setSessionUser(data.user || null)
        setSessionChecked(true)
      })
      .catch(() => {
        if (!cancelled) setSessionChecked(true)
      })
    return () => {
      cancelled = true
    }
  }, [pathname])

  const isActive = useCallback(
    (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href)),
    [pathname],
  )

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    setSessionUser(null)
    router.push('/')
    router.refresh()
  }

  const sidebarInner = (
    <nav className="flex h-full flex-col bg-[#0a0a0e]" aria-label="Sidebar navigation">
      {/* Brand — same layout as header: logo + "TARIK ELER — TARNAK" side by side */}
      <div className="flex items-center gap-2.5 border-b border-white/5 px-5 py-4">
        <img
          src="/tarnak-white.svg"
          alt="TARNAK"
          width={30}
          height={30}
          className="shrink-0"
        />
        <span className="truncate text-sm font-bold tracking-tight text-foreground">
          TARIK ELER
          <span className="text-white/30"> — </span>
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text font-black text-transparent">
            TARNAK
          </span>
        </span>
      </div>

      {/* Search input — opens command palette */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('search:request-open'))}
        aria-label={t('common.search')}
        className="flex w-full items-center gap-2.5 border-b border-white/5 px-4 py-3 text-left text-sm text-foreground/50 transition-colors hover:bg-white/5 hover:text-foreground"
      >
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="min-w-0 flex-1 truncate">{t('common.search')}...</span>
        <kbd className="pointer-events-none inline-flex shrink-0 items-center gap-0.5 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] text-foreground/50">
          <span>⌘</span>
          <span>K</span>
        </kbd>
      </button>

      {/* Primary nav */}
      <div className="flex flex-1 flex-col gap-1 px-3 py-4">
        {NAV_LINKS.map(item => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                'transition-colors duration-200',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-foreground/70 hover:bg-white/5 hover:text-foreground',
              )}
            >
              <Icon size={18} />
              <span>{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </div>

      <div className="mx-4 border-t border-white/5" />

      {/* Bottom: session, settings */}
      <div className="flex flex-col gap-1 px-3 py-4">
        {/* Session-dependent buttons */}
        {sessionChecked && sessionUser?.role === 'admin' && (
          <>
            <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-widest text-foreground-500/70">
              {t('nav.adminPanel') ?? 'Admin Panel'}
            </p>
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors duration-200 hover:bg-white/5 hover:text-foreground"
            >
              <ShieldIcon size={18} />
              <span>{t('nav.panel') ?? 'Panel'}</span>
            </Link>
            <button
              onClick={() => {
                setIsOpen(false)
                window.dispatchEvent(new CustomEvent('editor:open'))
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors duration-200 hover:bg-white/5 hover:text-foreground"
            >
              <EditSquareIcon size={18} />
              <span>{t('nav.pageEditor') ?? 'Sayfa Düzenleyici'}</span>
              <span className="ml-auto text-[9px] uppercase tracking-wide text-foreground-500/60">
                URL değişmez
              </span>
            </button>
          </>
        )}
        {sessionChecked && sessionUser && (
          <button
            onClick={logout}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors duration-200 hover:bg-white/5 hover:text-foreground"
          >
            <LogoutIcon size={18} />
            <span>{t('nav.logout') ?? 'Çıkış'}</span>
          </button>
        )}
        {sessionChecked && !sessionUser && (
          <div className="flex flex-row items-center gap-2">
            <Link
              href="/login"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-foreground-200/15 bg-background px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors duration-200 hover:border-primary/40 hover:text-foreground"
            >
              <LoginIcon size={16} />
              <span>{t('nav.login')}</span>
            </Link>
            <span className="text-foreground/30">|</span>
            <Link
              href="/login?mode=signup"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/90"
            >
              <span>{t('nav.signup') ?? 'Kayıt Ol'}</span>
            </Link>
          </div>
        )}

        <div className="my-1 border-t border-white/5" />

        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('settings:open'))
            setIsOpen(false)
          }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/70 transition-colors duration-200 hover:bg-white/5 hover:text-foreground"
        >
          <CogIcon size={18} />
          <span>{t('settings.title')}</span>
        </button>
      </div>
    </nav>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — dark + blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: -SIDEBAR_WIDTH }}
            animate={{ x: 0 }}
            exit={{ x: -SIDEBAR_WIDTH }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            className={cn(
              'fixed top-0 left-0 z-50 h-full w-[260px]',
              'border-r border-white/10 bg-[#0a0a0e] shadow-2xl',
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Sidebar"
          >
            {sidebarInner}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
