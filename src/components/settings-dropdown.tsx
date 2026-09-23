'use client'
import type { ThemeMode } from '@/components/theme'
import type { Locale, LocalePref } from '@/lib/i18n'
import { LOCALES } from '@/lib/i18n'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useLocale, useT } from '@/components/locale-provider'
import { useTheme } from '@/components/theme'
import { cn } from '@/components/ui/cn'
import { Drawer } from '@/components/ui/drawer'
import {
  AutoIcon,
  CogIcon,
  GlobeIcon,
  MoonIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SunIcon,
  ThemeSystemIcon,
  VolumeIcon,
} from '@/components/ui/icons'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'
import { flagIcons } from '@/components/ui/flag-icons'

const MUSIC_KEY = 'site-music-enabled'
const REDUCE_MOTION_KEY = 'site-reduce-motion'
const THEME_KEY = 'site-theme'
const LOCALE_COOKIE = 'site-locale'

/** Native names for each locale, shown in the language picker. */
const NATIVE_NAMES: Record<Locale, string> = {
  tr: 'Türkçe',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  ja: '日本語',
  fr: 'Français',
  pt: 'Português',
  ru: 'Русский',
  it: 'Italiano',
  zh: '中文',
  nl: 'Nederlands',
  pl: 'Polski',
  ko: '한국어',
  ar: 'العربية',
  id: 'Bahasa Indonesia',
  vi: 'Tiếng Việt',
  fa: 'فارسی',
  uk: 'Українська',
  th: 'ไทย',
  cs: 'Čeština',
  hu: 'Magyar',
  ro: 'Română',
  sv: 'Svenska',
  el: 'Ελληνικά',
  he: 'עברית',
}

const LOCALES_ALL: readonly Locale[] = [...LOCALES]

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
  const { pref, setPref, detected } = useLocale()
  const router = useRouter()

  const [reduceMotion, setReduceMotion] = useState<boolean>(false)
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true)

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
  }, [open])

  const applyReduceMotion = useCallback((next: boolean) => {
    setReduceMotion(next)
    try {
      localStorage.setItem(REDUCE_MOTION_KEY, String(next))
    }
    catch {
      /* noop */
    }
    document.documentElement.dataset.reduceMotion = String(next)
  }, [])

  const applyMusicEnabled = useCallback((next: boolean) => {
    setMusicEnabled(next)
    try {
      localStorage.setItem(MUSIC_KEY, String(next))
    }
    catch {
      /* noop */
    }
    window.dispatchEvent(new CustomEvent('site-music-toggle'))
  }, [])

  const resetLocal = useCallback(() => {
    const confirmMsg = t('settings.resetConfirm')
    if (typeof window === 'undefined' || !window.confirm(confirmMsg)) {
      return
    }

    // 1) Kendi localStorage anahtarlarimiz
    const ownKeys = [THEME_KEY, REDUCE_MOTION_KEY, MUSIC_KEY, 'music-player-closed']
    for (const k of ownKeys) {
      try {
        localStorage.removeItem(k)
      }
      catch {
        /* noop */
      }
    }

    // 2) Istatistik anahtarlari (prefix taramasi)
    try {
      const toDelete: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (
          key
          && (key.startsWith('star-state:')
            || key.startsWith('project-stats:')
            || key.startsWith('blog-stats:'))
        ) {
          toDelete.push(key)
        }
      }
      toDelete.forEach(k => localStorage.removeItem(k))
    }
    catch {
      /* noop */
    }

    // 3) DOM'a uygulanmis anlik durumu geri al.
    //    Eskiden yalnizca localStorage siliniyordu; attribute ve tema sinifi
    //    oldugu gibi kaliyordu → "sifirla" sozu tam tutmuyordu.
    try {
      document.documentElement.removeAttribute('data-reduce-motion')
    }
    catch {
      /* noop */
    }

    // 4) Tema ve dil tercihini de sifirla. Dil bir CEREZDE tutuluyor ve
    //    eskiden hic temizlenmiyordu; sifirlama sonrasi dil eski secimde
    //    kaliyordu.
    setTheme('auto')
    try {
      document.cookie = `${LOCALE_COOKIE}=auto; path=/; max-age=31536000; SameSite=Lax`
    }
    catch {
      /* noop */
    }
    setPref('auto')

    onOpenChange(false)
    router.refresh()
  }, [t, onOpenChange, router, setTheme, setPref])

  const themeOptions: { value: ThemeMode, icon: React.ReactNode, label: string }[] = [
    { value: 'auto', icon: <ThemeSystemIcon size={16} />, label: t('settings.auto') },
    { value: 'light', icon: <SunIcon size={16} />, label: t('settings.light') },
    { value: 'dark', icon: <MoonIcon size={16} />, label: t('settings.dark') },
  ]

  // "Otomatik" secilirse hangi dilin kullanilacagini ETIKETIN ICINDE gosteriyoruz:
  // "Otomatik (Türkçe)". `detected` tarayici dilinden (ve bolgeden) hesaplanan
  // gercek sonuctur — yani etiket tahmin degil, olculmus deger.
  const autoLabel = `${t('lang.auto')} (${NATIVE_NAMES[detected]})`

  const localeOptions: { value: LocalePref, icon?: React.ReactNode, label: string }[] = [
    { value: 'auto', icon: <AutoIcon size={16} />, label: autoLabel },
    ...LOCALES_ALL.map((l) => {
      const Flag = flagIcons[l]
      return {
        value: l,
        icon: Flag ? <Flag size={16} /> : undefined,
        label: NATIVE_NAMES[l],
      }
    }),
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
            onChange={v => setTheme(v as ThemeMode)}
          />
        </Section>

        {/* Language */}
        <Section title={t('settings.language')} icon={<GlobeIcon size={16} />}>
          {/*
            `showAllOption` KALDIRILDI: combobox hem "Tümü" butonunu hem de
            listedeki 'auto' secenegini "Otomatik" olarak gosteriyordu →
            ekranda ayni isim IKI KEZ cikiyordu. Artik tek bir 'auto' secenegi
            var; temizlemek isteyen de ayni secenegi secer (ikisi de
            setPref('auto') cagiriyordu, yani bir sey kaybolmadi).
          */}
          <SearchableCombobox
            options={localeOptions}
            selected={[pref]}
            onSelect={(v) => setPref(v as LocalePref)}
            onClear={() => setPref('auto')}
            placeholder={t('settings.languageLabel')}
            searchPlaceholder={t('country.search')}
            ariaLabel={t('settings.languageLabel')}
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
  options: { value: T, label: string, icon?: React.ReactNode }[]
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
