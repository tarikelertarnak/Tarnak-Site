'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '@/components/locale-provider'
import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  SearchIcon,
} from '@/components/ui/icons'
import { COUNTRIES } from '@/lib/countries-data'

/** ISO2 → flag emoji (e.g. "TR" → 🇹🇷). */
function flagEmoji(iso2: string): string {
  try {
    return String.fromCodePoint(
      ...iso2
        .toUpperCase()
        .split('')
        .map(c => 127397 + c.charCodeAt(0)),
    )
  }
  catch {
    return '🏳️'
  }
}

export interface Country {
  iso2: string
  callingCode: string
  name: string
  flag: string
}

/** All countries with calling codes (static list, source-ordered). */
const COUNTRY_LIST: (Country & { enName: string })[] = COUNTRIES.map(c => ({
  iso2: c.iso2,
  callingCode: c.code,
  name: '',
  flag: flagEmoji(c.iso2),
  enName: c.name,
}))

interface CountrySelectProps {
  value: string
  onChange: (iso2: string) => void
  /** Show the calling code next to the country name (e.g. "+90") */
  showCode?: boolean
}

/**
 * Single-select country combobox with a search box.
 * Selected country shows its flag + name (in the active site locale).
 */
export function CountrySelect({
  value,
  onChange,
  showCode = false,
}: CountrySelectProps) {
  const { t, locale } = useT()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open)
      return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')
        setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const displayNames = useMemo(
    () =>
      new Intl.DisplayNames(locale === 'tr' ? ['tr'] : ['en'], {
        type: 'region',
      }),
    [locale],
  )

  const labelled = useMemo(() => {
    return COUNTRY_LIST.map(c => ({
      ...c,
      name:
        displayNames.of(c.iso2.toUpperCase())
        ?? new Intl.DisplayNames(['en'], { type: 'region' }).of(c.iso2.toUpperCase())
        ?? c.iso2.toUpperCase(),
    }))
  }, [displayNames])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^\+/, '')
    if (!needle)
      return labelled
    return labelled.filter(
      c =>
        c.name.toLowerCase().includes(needle)
        || c.enName.toLowerCase().includes(needle)
        || c.callingCode.includes(needle)
        || c.iso2.toLowerCase().includes(needle),
    )
  }, [labelled, q])

  const selected = labelled.find(c => c.iso2 === value)
  const triggerText = selected ? `${selected.flag} ${selected.name}` : ''

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(v => !v)
          setQ('')
        }}
        aria-label={t('country.select')}
        aria-expanded={open}
        className={`inline-flex h-12 w-full cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-medium outline-none transition-colors sm:w-44 ${
          selected
            ? 'border-primary/40 text-foreground hover:border-primary/70'
            : 'border-foreground-200/20 text-foreground/85 hover:border-primary/40'
        }`}
      >
        <span className="truncate">{triggerText}</span>
        {showCode && selected && (
          <span className="ml-auto shrink-0 text-xs font-semibold text-primary">
            +
            {selected.callingCode}
          </span>
        )}
        <ChevronDownIcon
          size={14}
          className={`shrink-0 text-foreground/50 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-foreground-200/15 bg-background shadow-2xl shadow-black/20">
          {/* Search */}
          <div className="border-b border-foreground-200/10 p-2">
            <div className="relative">
              <SearchIcon
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40"
              />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={t('country.search')}
                aria-label={t('country.search')}
                className="h-8 w-full rounded-lg border border-foreground-200/15 bg-background pl-8 pr-7 text-xs text-foreground outline-none transition-colors focus:border-primary/60"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  aria-label={t('country.clear')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground"
                >
                  <CloseIcon size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <ul className="max-h-64 overflow-y-auto p-1.5" role="listbox">
            {filtered.length === 0 && (
              <li className="px-2.5 py-1.5 text-xs text-foreground-500">
                <span className="opacity-60">{t('country.empty')}</span>
              </li>
            )}
            {filtered.map((c) => {
              const active = c.iso2 === value
              return (
                <li key={c.iso2}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c.iso2)
                      setOpen(false)
                    }}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                      active
                        ? 'bg-primary/15 text-primary'
                        : 'text-foreground/80 hover:bg-foreground-200/10 hover:text-foreground'
                    }`}
                  >
                    <CheckIcon
                      size={13}
                      className={active ? '' : 'opacity-0'}
                    />
                    <span className="shrink-0">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-foreground/50">
                      +
                      {c.callingCode}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
