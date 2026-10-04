'use client'
import type { ThemeMode } from '@/components/theme'
import type { Locale, LocalePref } from '@/lib/i18n'
import { LOCALES } from '@/lib/i18n'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale, useT } from '@/components/locale-provider'
import { useTheme } from '@/components/theme'
import { cn } from '@/components/ui/cn'
import { Drawer } from '@/components/ui/drawer'
import { Modal } from '@/components/ui/modal'
import {
  AutoIcon,
  CheckIcon,
  CogIcon,
  GlobeIcon,
  MoonIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SunIcon,
  ThemeSystemIcon,
  UserIcon,
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

/**
 * Ayarlar paneli — iki katmanlı durum: TASLAK ve UYGULANMIŞ.
 *
 * 2026-10-04 (kullanıcı isteği): "Kaydet" tusuna basılana kadar HICBIR ayar
 * uygulanmasın/kaydedilmesin. Eskiden tema `setTheme`, dil `setPref`,
 * hareket `localStorage.setItem` ve musigi `CustomEvent` ile ANINDA
 * yaziliyordu — kullanici "vay canina tema degisti" deyip geri donemiyordu.
 *
 * `draft` = panelde gorunen degerler, `applied` = localStorage'da gercekten
 * yazan deger. `dirty`, ikisinin farki; sadece onay penceresini ve Kaydet
 * butonunun durumunu besler.
 */
interface SettingsDraft {
  theme: ThemeMode
  pref: LocalePref
  reduceMotion: boolean
  musicEnabled: boolean
}

/** localStorage'da yazan (yani gercekten uygulanmis) degerleri oku. */
function readApplied(): SettingsDraft {
  return {
    theme: readLocal(THEME_KEY, ['auto', 'light', 'dark'] as const, 'auto'),
    pref: readLocal<LocalePref>(LOCALE_COOKIE, ['auto', ...LOCALES_ALL], 'auto'),
    reduceMotion:
      readLocal(REDUCE_MOTION_KEY, ['true', 'false'] as const, 'false') === 'true',
    musicEnabled:
      readLocal(MUSIC_KEY, ['true', 'false'] as const, 'true') === 'true',
  }
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

  const [draft, setDraft] = useState<SettingsDraft | null>(null)
  const [applied, setApplied] = useState<SettingsDraft>({
    theme,
    pref,
    reduceMotion: false,
    musicEnabled: true,
  })
  // Onay penceresi hangi yoldan tetiklendi: panel mi, sayfa cikisi mi.
  const [confirmOpen, setConfirmOpen] = useState(false)
  // 'Evet' deyip cikisa bagli kalinan link; tekrar tiklanacak.
  const pendingNav = useRef<HTMLAnchorElement | null>(null)
  // Bir sonraki tiklamayi gecir — onaydan sonra ayni linki tekrar
  // tetiklerken bu paneli tekrar kilitlemesin.
  const bypassNav = useRef(false)

  // Panel acilir acilmaz taslagi diskteki GERCEK degerlerden doldur.
  useEffect(() => {
    if (!open)
      return
    const next = readApplied()
    setApplied(next)
    setDraft(next)
    setConfirmOpen(false)
    bypassNav.current = false
  }, [open])

  const dirty = !!draft && (
    draft.theme !== applied.theme
    || draft.pref !== applied.pref
    || draft.reduceMotion !== applied.reduceMotion
    || draft.musicEnabled !== applied.musicEnabled
  )

  /**
   * Taslagi disariye YAZ. Tek fonksiyon: hem "Kaydet" hem sifirlamadan
   * sonra kullanilir, boylece "localStorage'a yazan iki farkli yol"
   * kurali dogmaz.
   */
  const commit = useCallback(
    (next: SettingsDraft) => {
      setTheme(next.theme)
      setPref(next.pref)

      try {
        localStorage.setItem(REDUCE_MOTION_KEY, String(next.reduceMotion))
        localStorage.setItem(MUSIC_KEY, String(next.musicEnabled))
      }
      catch {
        /* noop — private mode */
      }
      document.documentElement.dataset.reduceMotion = String(next.reduceMotion)
      window.dispatchEvent(
        new CustomEvent('site-music-toggle', { detail: next.musicEnabled }),
      )

      setApplied(next)
      setDraft(next)
    },
    [setTheme, setPref],
  )

  const save = useCallback(() => {
    if (!draft)
      return
    commit(draft)
    onOpenChange(false)
  }, [commit, draft, onOpenChange])

  /**
   * Panelden cikma denemesi. Kirli degilse dogrudan kapat; kirliyse once
   * onay penceresi. Drawer'in `onClose` hunisi X butonu, arka plan ve ESC'in
   * HEPSINI karsiladigi icin tek nokta yeter.
   */
  const requestClose = useCallback(() => {
    if (dirty)
      setConfirmOpen(true)
    else
      onOpenChange(false)
  }, [dirty, onOpenChange])

  // 'Evet' = degisiklikleri BIRAK ve cik.
  const discardAndClose = useCallback(() => {
    setDraft(applied)
    setConfirmOpen(false)
    onOpenChange(false)
  }, [applied, onOpenChange])

  /**
   * Sayfadan cikma korumasi — IKI katman, cunku biri tek basina yetmiyor:
   *  1) `beforeunload`: sekmeyi kapatma, yenileme, adres cubuguna yazma
   *     (tarayici KENDI uyarisini gosterir).
   *  2) Belgе ustunde CAPTURE fazinda link yakalama: Next.js App Router
   *     client-side gezinir, `beforeunload` TETIKLENMEZ. Sidebar/footer
   *     linkleri bu yoldan gecer, bu yuzden onlarin tiklanmasini da
   *     onaydan geciririz.
   * `ponytail: router' ici gezinme yakalama (App Router'da resmi bir
   * "leave" hook'u yok) yerine link tiklamasini yakalıyoruz. Sunucu
   * tarafi redirect + programatik `router.push` bu korumayi atlar; dogrusal
   * gezinme icin yeterli, o akis zaten ayar kaybettirmez.
   */
  useEffect(() => {
    if (!open || !dirty)
      return

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Eski tarayicilarda ozellik atamasi dogru mesaji tetikler.
      e.returnValue = t('settings.unsaved')
    }
    const onDocClick = (e: MouseEvent) => {
      if (bypassNav.current)
        return
      const el = e.target as HTMLElement | null
      const link = el?.closest?.('a') as HTMLAnchorElement | null
      // Yeni sekme / indirme / hash / dis link: bu paneli terk etmiyor.
      if (
        !link?.href
        || link.target === '_blank'
        || link.hasAttribute('download')
        || link.getAttribute('href')?.startsWith('#')
      ) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      pendingNav.current = link
      setConfirmOpen(true)
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onDocClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onDocClick, true)
    }
  }, [dirty, open, t])

  // Onaydan sonra linki tekrar tikla: bu sefer `bypassNav` korumayi gecer,
  // gezinme Normal akista olur (SPA linki SPA olarak calisir).
  const confirmDiscardAndGo = useCallback(() => {
    const link = pendingNav.current
    pendingNav.current = null
    setDraft(applied)
    setConfirmOpen(false)
    if (!link)
      return
    bypassNav.current = true
    link.click()
  }, [applied])

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

    // 2) Istatistik anahtarlari (prefix taramasi) — proje sayaclari dahil
    //    (stats + viewed/downloaded dedup bayraklari).
    try {
      const toDelete: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (
          key
          && (key.startsWith('star-state:')
            || key.startsWith('project-stats:')
            || key.startsWith('project-viewed:')
            || key.startsWith('project-downloaded:')
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

    // Sifirla = kalici bir islem; taslak kirli kalmasin.
    const reset = readApplied()
    setApplied(reset)
    setDraft(reset)
    setConfirmOpen(false)

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

  const cur = draft ?? applied

  return (
    <>
      <Drawer
        open={open}
        onClose={requestClose}
        title={t('settings.title')}
        side="right"
      >
        <div className="flex flex-col gap-6 px-6 pb-8">
          {/* Theme — taslak: `setTheme` HICIR cagrilmaz */}
          <Section title={t('settings.appearance')} icon={<CogIcon size={16} />}>
            <RadioGroup
              options={themeOptions}
              value={cur.theme}
              onChange={v => setDraft({ ...cur, theme: v as ThemeMode })}
            />
          </Section>

          {/* Language — taslak */}
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
              selected={[cur.pref]}
              onSelect={v => setDraft({ ...cur, pref: v as LocalePref })}
              onClear={() => setDraft({ ...cur, pref: 'auto' })}
              placeholder={t('settings.languageLabel')}
              searchPlaceholder={t('country.search')}
              ariaLabel={t('settings.languageLabel')}
            />
          </Section>

          {/* Motion — taslak */}
          <Section
            title={t('settings.motion')}
            icon={<RefreshCwIcon size={16} />}
          >
            <Toggle
              checked={cur.reduceMotion}
              onChange={v => setDraft({ ...cur, reduceMotion: v })}
              label={t('settings.reduceMotion')}
            />
          </Section>

          {/* Music — taslak */}
          <Section title={t('settings.music')} icon={<VolumeIcon size={16} />}>
            <Toggle
              checked={cur.musicEnabled}
              onChange={v => setDraft({ ...cur, musicEnabled: v })}
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

          {/*
            Kaydet — panelin kapatma butonu/ESC ile ayni hizada. `dirty`
            degilse pasif (disabled): hicbir sey degismediyse kaydetmenin
            anlami yok.
          */}
          <button
            type="button"
            onClick={save}
            disabled={!dirty}
            className="sticky bottom-0 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-primary"
          >
            <CheckIcon size={15} />
            {t('settings.save')}
          </button>
        </div>
      </Drawer>

      {/*
        Kaydedilmemiş değişiklik onayı. Drawer ile aynı z-index'i kullanır
        ama DOM'da Drawer'dan SONRA gelir → aynı z'de üstte durur.
      */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t('settings.unsavedTitle')}
      >
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-foreground/80">{t('settings.unsaved')}</p>
          <div className="flex flex-row justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="rounded-lg border border-foreground/15 px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5"
            >
              {t('common.no')}
            </button>
            <button
              type="button"
              onClick={pendingNav.current ? confirmDiscardAndGo : discardAndClose}
              className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-danger/90"
            >
              {t('common.yes')}
            </button>
          </div>
        </div>
      </Modal>
    </>
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
