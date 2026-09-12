'use client'
import type { ThemeMode } from '@/components/theme'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useLocale, useT } from '@/components/locale-provider'
import { useTheme } from '@/components/theme'
import { cn } from '@/components/ui/cn'
import { Drawer } from '@/components/ui/drawer'
import {
  AutoIcon,
  CheckIcon,
  CogIcon,
  FileIcon,
  FlagEnIcon,
  FlagTrIcon,
  GlobeIcon,
  MoonIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SunIcon,
  ThemeSystemIcon,
  VolumeIcon,
} from '@/components/ui/icons'
import { Link } from '@/components/ui/link'
import type { LocalePref } from '@/lib/i18n'

type DarkIntensity = 'light' | 'standard' | 'dark'

const MUSIC_KEY = 'site-music-enabled'
const REDUCE_MOTION_KEY = 'site-reduce-motion'
const DARK_INTENSITY_KEY = 'site-dark-intensity'
const THEME_KEY = 'site-theme'

function readLocal<T extends string>(
  key: string,
  valid: readonly T[],
  fallback: T,
): T {
  if (typeof window === 'undefined') {
    return fallback
  }
  const v = localStorage.getItem(key)
  return (valid as readonly string[]).includes(v ?? '') ? (v as T) : fallback
}

export function SettingsModal({
  githubUsername,
  open,
  onOpenChange,
}: {
  githubUsername: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { theme, setTheme } = useTheme()
  const { t } = useT()
  const { pref, setPref } = useLocale()
  const router = useRouter()

  const [reduceMotion, setReduceMotion] = useState<boolean>(false)
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true)
  const [darkIntensity, setDarkIntensity] = useState<DarkIntensity>('standard')

  useEffect(() => {
    if (!open) {
      return
    }
    setReduceMotion(
      readLocal(REDUCE_MOTION_KEY, ['true', 'false'] as const, 'false') === 'true',
    )
    setMusicEnabled(
      readLocal(MUSIC_KEY, ['true', 'false'] as const, 'true') === 'true',
    )
    setDarkIntensity(
      readLocal(DARK_INTENSITY_KEY, ['light', 'standard', 'dark'] as const, 'standard'),
    )
  }, [open])

  const applyReduceMotion = useCallback((next: boolean) => {
    setReduceMotion(next)
    try {
      localStorage.setItem(REDUCE_MOTION_KEY, String(next))
    } catch {
      /* noop */
    }
    document.documentElement.dataset.reduceMotion = String(next)
  }, [])

  const applyMusicEnabled = useCallback((next: boolean) => {
    setMusicEnabled(next)
    try {
      localStorage.setItem(MUSIC_KEY, String(next))
    } catch {
      /* noop */
    }
    window.dispatchEvent(new CustomEvent('site-music-toggle'))
  }, [])

  const applyDarkIntensity = useCallback((next: DarkIntensity) => {
    setDarkIntensity(next)
    try {
      localStorage.setItem(DARK_INTENSITY_KEY, next)
    } catch {
      /* noop */
    }
    document.documentElement.dataset.darkIntensity = next
  }, [])

  const resetLocal = useCallback(() => {
    const confirmMsg = t('settings.resetConfirm')
    if (typeof window === 'undefined' || !window.confirm(confirmMsg)) {
      return
    }
    const ownKeys = [
      THEME_KEY,
      REDUCE_MOTION_KEY,
      MUSIC_KEY,
      DARK_INTENSITY_KEY,
      'music-player-closed',
    ]
    for (const k of ownKeys) {
      try {
        localStorage.removeItem(k)
      } catch {
        /* noop */
      }
    }
    try {
      const toDelete: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (
          key &&
          (key.startsWith('star-state:') ||
            key.startsWith('project-stats:') ||
            key.startsWith('blog-stats:'))
        ) {
          toDelete.push(key)
        }
      }
      toDelete.forEach((k) => localStorage.removeItem(k))
    } catch {
      /* noop */
    }
    onOpenChange(false)
    router.refresh()
  }, [t, onOpenChange, router])

  const themeOptions: { value: ThemeMode; icon: React.ReactNode; label: string }[] = [
    { value: 'auto', icon: <ThemeSystemIcon size={16} />, label: t('settings.auto') },
    { value: 'light', icon: <SunIcon size={16} />, label: t('settings.light') },
    { value: 'dark', icon: <MoonIcon size={16} />, label: t('settings.dark') },
  ]

  const intensityOptions: { value: DarkIntensity; label: string }[] = [
    { value: 'light', label: t('settings.darkIntensityLight') },
    { value: 'standard', label: t('settings.darkIntensityStandard') },
    { value: 'dark', label: t('settings.darkIntensityIntense') },
  ]

  const localeOptions: { value: LocalePref; icon?: React.ReactNode; label: string }[] = [
    { value: 'auto', icon: <AutoIcon size={16} />, label: t('settings.auto') },
    { value: 'tr', icon: <FlagTrIcon size={16} />, label: 'Türkçe' },
    { value: 'en', icon: <FlagEnIcon size={16} />, label: 'English' },
  ]

  return (
    <Drawer
      open={open}
      onClose={() => onOpenChange(false)}
      title={t('settings.title')}
      side="right"
    >
      <div className="flex flex-col gap-5 px-5 pb-8">
        {/* Theme */}
        <Section title={t('settings.appearance')} icon={<CogIcon size={16} />}>
          <RadioGroup
            options={themeOptions}
            value={theme}
            onChange={(v) => setTheme(v as ThemeMode)}
          />
        </Section>

        {/* Language */}
        <Section title={t('settings.language')} icon={<GlobeIcon size={16} />}>
          <RadioGroup
            options={localeOptions}
            value={pref}
            onChange={(v) => setPref(v as LocalePref)}
          />
        </Section>

        {/* Dark theme intensity */}
        <Section
          title={t('settings.darkIntensity')}
          icon={<MoonIcon size={16} />}
        >
          <RadioGroup
            options={intensityOptions}
            value={darkIntensity}
            onChange={(v) => applyDarkIntensity(v as DarkIntensity)}
          />
        </Section>

        {/* Motion */}
        <Section
          title={t('settings.motion')}
          icon={<RefreshCwIcon size={16} />}
        >
          <Toggle
            checked={reduceMotion}
            onChange={applyReduceMotion}
            label={t('settings.reduceMotion')}
          />
        </Section>

        {/* Music */}
        <Section title={t('settings.music')} icon={<VolumeIcon size={16} />}>
          <Toggle
            checked={musicEnabled}
            onChange={applyMusicEnabled}
            label={t('settings.musicEnabled')}
          />
        </Section>

        {/* Reset */}
        <button
          type="button"
          onClick={resetLocal}
          className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-foreground/10 px-3 py-2 text-sm text-foreground/70 transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
        >
          <RotateCcwIcon size={14} />
          {t('settings.reset')}
        </button>
      </div>
    </Drawer>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/60">
        {icon}
        {title}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

function RadioGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: React.ReactNode }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
              active
                ? 'border-primary/50 bg-primary/15 text-foreground'
                : 'border-foreground/10 text-foreground/70 hover:bg-foreground/5',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="flex items-center justify-between rounded-lg border border-foreground/10 px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-foreground/5"
    >
      <span>{label}</span>
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-foreground/20',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked && 'translate-x-4',
          )}
        />
      </span>
    </button>
  )
}
