'use client'

import type { ReactNode } from 'react'
import type { ThemeMode } from '@/components/theme'
import { ConfigProvider, ThemeProvider } from '@lobehub/ui'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { ThemeContext } from '@/components/theme'
import { ThemedBackground } from '@/components/themed-background'

const STORAGE_KEY = 'site-theme'

/**
 * Legacy 'system' → 'auto' (both track the system theme; the settings list only has
 * auto/light/dark — if 'system' ever got into state, the RadioGroup looked empty).
 */
function normalizeThemeMode(t: ThemeMode | null | undefined): ThemeMode {
  if (t === 'system') return 'auto'
  if (t === 'light' || t === 'dark' || t === 'auto') return t
  return 'auto'
}

const darkToken = {
  colorPrimary: '#3b82f6',
  colorInfo: '#3b82f6',
  colorLink: '#ededed',
  colorLinkHover: '#3b82f6',
  colorLinkActive: '#3b82f6',
  colorBgLayout: '#050507',
  colorBgContainer: '#0d0d12',
  colorBgElevated: '#12121a',
  borderRadius: 12,
  components: {
    Link: {
      colorLink: '#ededed',
      colorLinkHover: '#3b82f6',
      colorLinkActive: '#3b82f6',
    },
  },
}

const lightToken = {
  colorPrimary: '#2563eb',
  colorInfo: '#2563eb',
  colorLink: '#18181b',
  colorLinkHover: '#2563eb',
  colorLinkActive: '#2563eb',
  colorBgLayout: '#fafafa',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#f4f4f5',
  colorText: '#18181b',
  borderRadius: 12,
  components: {
    Link: {
      colorLink: '#18181b',
      colorLinkHover: '#2563eb',
      colorLinkActive: '#2563eb',
    },
  },
}

export function Providers({
  children,
  backgroundImage,
  defaultTheme,
}: {
  children: ReactNode
  backgroundImage: string
  defaultTheme: ThemeMode
}) {
  const [theme, setTheme] = useState<ThemeMode>(() => normalizeThemeMode(defaultTheme))
  const [systemDark, setSystemDark] = useState(false)

  // Read the saved preference from localStorage (if any) + make body visible on first mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    setTheme(normalizeThemeMode(stored))
    // Make <body style="visibility:hidden"> visible. Even though the theme init script
    // may run before body loads, this guarantees it.
    if (document.body.style.visibility !== 'visible') {
      document.body.style.visibility = 'visible'
    }
  }, [])

  // Track system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemDark(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme: 'light' | 'dark' =
    theme === 'auto' || theme === 'system'
      ? systemDark
        ? 'dark'
        : 'light'
      : theme

  useEffect(() => {
    // Only write on an actual change — writing the same value triggers needless renders
    if (localStorage.getItem(STORAGE_KEY) !== theme) {
      localStorage.setItem(STORAGE_KEY, theme)
    }
    // HeroUI dark/light variables depend on the .dark/.light classes — keep both in sync
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
    document.documentElement.classList.toggle('light', resolvedTheme === 'light')
  }, [theme, resolvedTheme])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark')),
    }),
    [theme],
  )

  return (
    <ConfigProvider motion={motion}>
      <ThemeProvider
        appearance={resolvedTheme}
        enableCustomFonts={false}
        theme={{ token: resolvedTheme === 'dark' ? darkToken : lightToken }}
      >
        <ThemeContext.Provider value={value}>
          <ThemedBackground backgroundImage={backgroundImage} />
          {children}
        </ThemeContext.Provider>
      </ThemeProvider>
    </ConfigProvider>
  )
}
