'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { HERO_BTN_TRIGGER } from '@/components/ui/hero-button-style'
import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  SearchIcon,
} from '@/components/ui/icons'
import { usePopoverPosition } from '@/components/ui/use-popover-position'

interface SearchableComboboxOption {
  value: string
  label: string
  /** Optional leading icon (flags, etc.) shown in trigger + list. */
  icon?: ReactNode
}

interface SearchableComboboxProps {
  /** true = multi-select (filter); false = single-select (sorting) */
  multiple?: boolean
  options: SearchableComboboxOption[]
  /** Selected values (0-1 items in single mode) */
  selected: string[]
  onSelect: (value: string) => void
  /** "All" / clear (multi mode only) */
  onClear: () => void
  placeholder: string
  searchPlaceholder: string
  ariaLabel: string
  /** Show "All" as the first option in multi mode */
  showAllOption?: boolean
  allLabel?: string
  /** Trigger badge in multi mode (selected count) */
  badge?: number
}

function optionsLabel(options: SearchableComboboxOption[], selected: string[]) {
  const found = options.find(o => o.value === selected[0])
  return found ? found.label : ''
}

/**
 * Popup with a search box + selection list.
 * Used for sorting (single selection) and tag filtering (multi selection + "All").
 */
export function SearchableCombobox({
  multiple = false,
  options,
  selected,
  onSelect,
  onClear,
  placeholder,
  searchPlaceholder,
  ariaLabel,
  showAllOption = false,
  allLabel = '',
  badge,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  /*
    Konum (2026-10-06, kullanıcı "Sürüm seç" için de aynısını istedi).
    Önce `absolute left-0 top-full mt-2` idi: sabit 8px boşluk bırakıyordu
    ve dar ekranda panel ekrandan taşabiliyordu. Artık ortak çözümleyici:
    alt → üst → sağ → sol, asla tetikleyicinin üstüne binmez.
  */
  const {
    triggerRef,
    panelRef,
    ready,
    portalStyle,
  } = usePopoverPosition<HTMLDivElement>(open, 6)

  useEffect(() => {
    if (!open)
      return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      // PORTAL: panel `document.body` altında, `rootRef` disinda —
      // eski tek-kapsayici kontrolu listeye tiklayinca paneli kapatiyordu.
      const icerde
        = (rootRef.current?.contains(t) ?? false)
          || (panelRef.current?.contains(t) ?? false)
      if (!icerde)
        setOpen(false)
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
  }, [open, panelRef])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle)
      return options
    return options.filter(o => o.label.toLowerCase().includes(needle))
  }, [options, q])

  const triggerText = multiple ? placeholder : optionsLabel(options, selected) || placeholder
  const selectedOption = multiple ? undefined : options.find(o => o.value === selected[0])

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        type="button"
        onClick={() => {
          setOpen(v => !v)
          setQ('')
        }}
        aria-label={ariaLabel}
        aria-expanded={open}
        /*
          2026-10-05 (kullanıcı): tetikleyici ölçüldü ve referans butonlarla
          karşılaştırıldı. Sapmalar:
            radius  0px  vs referans 6px   → rounded-md
            border  yok  vs referans 1px   → border-primary-fg
            bg      mavi ✓, renk ✓, h 40 ✓, fs 13px ✓
          Artık `HERO_BTN_TRIGGER` tek kaynak; Blog ve Projeler bu bileşeni
          paylaştığı için ikisi birebir aynı görünür (aynı dosya).
          Önceki `rounded-full border px-3 text-xs` ve sonraki elle
          `rounded-lg px-4 text-sm` denemeleri yerine ölçülmüş değer.
        */
        className={`${HERO_BTN_TRIGGER} cursor-pointer`}
      >
        {selectedOption?.icon}
        <span className="max-w-[12rem] truncate">{triggerText}</span>
        {multiple && (badge ?? 0) > 0 && (
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {badge}
          </span>
        )}
        <ChevronDownIcon
          size={13}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && createPortal(
        <div
          ref={panelRef as React.RefObject<HTMLDivElement>}
          style={portalStyle}
          className="z-50 flex w-64 flex-col overflow-hidden rounded-xl border border-foreground-200/15 bg-background shadow-2xl shadow-black/20"
        >
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
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-8 w-full rounded-lg border border-foreground-200/15 bg-surface-3 pl-8 pr-7 text-xs text-foreground outline-none transition-colors focus:border-primary/60"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  aria-label="Temizle"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground"
                >
                  <CloseIcon size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <ul className="max-h-64 overflow-y-auto p-1.5" role="listbox">
            {showAllOption && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onClear()
                    setOpen(false)
                  }}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                    selected.length === 0
                      ? 'bg-primary/15 text-primary'
                      : 'text-foreground/80 hover:bg-foreground-200/10 hover:text-foreground'
                  }`}
                >
                  <CheckIcon
                    size={13}
                    className={selected.length === 0 ? '' : 'opacity-0'}
                  />
                  {allLabel || placeholder}
                </button>
              </li>
            )}
            {filtered.length === 0 && (
              <li className="px-2.5 py-1.5 text-xs text-foreground-500">
                <span className="opacity-60">‹boş›</span>
              </li>
            )}
            {filtered.map((o) => {
              const active = selected.includes(o.value)
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(o.value)
                      if (!multiple)
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
                    {o.icon}
                    <span className="truncate">{o.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  )
}
