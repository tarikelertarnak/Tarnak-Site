'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/components/locale-provider'
import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  SearchIcon,
} from '@/components/ui/icons'
import { COUNTRIES } from '@/lib/countries-data'

/**
 * Ülke bayrağı — icons0 `circle-flags` (MIT), `public/flags/{iso2}.svg`.
 *
 * SVG'ler JS olarak paketlenmişti: 218 bayrak = 146 KB, 19 route'un hepsinde
 * client bundle'da indiriliyordu (kullanıcı telefon moduna hiç geçmese bile).
 * Artık statik dosya → Workers'a asset olarak gidiyor, JS'ten tamamen çıktı.
 *
 * Emoji yerine SVG: emoji Windows'ta "TR" gibi harf çiftlerine düşüyordu.
 * `<img>` ayrıca `<mask id>` çakışmasını imkânsız kılıyor.
 */
function CountryFlag({ iso2, size = 18 }: { iso2: string, size?: number }) {
  const h = Math.round(size * 0.75)
  return (
    <img
      src={`/flags/${iso2.toLowerCase()}.svg`}
      alt=""
      aria-hidden="true"
      width={size}
      height={h}
      loading="lazy"
      decoding="async"
      className="inline-block shrink-0 bg-foreground/5 object-contain"
      style={{ width: size, height: h }}
      onError={(e) => {
        // Dosya yoksa ISO kodu göster — kırık ikon okunabilirliği bozmasın.
        const el = e.currentTarget
        el.style.display = 'none'
        el.insertAdjacentHTML(
          'afterend',
          `<span class="inline-flex items-center justify-center rounded-full bg-foreground/10 font-bold" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px">${iso2.toUpperCase()}</span>`,
        )
      }}
    />
  )
}

export interface Country {
  iso2: string
  callingCode: string
  name: string
  flag: string
}

interface Row extends Country {
  enName: string
  /** Arama için normalize metin (küçük harf, aksan kaldırılmış). */
  haystack: string
}

/** Aksanları katlar, boşlukları sadeleştirir: "Cote d'Ivoire" → "cote divoire". */
function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Aramayı normalize eder: "+90 " / "90" / "Türkiye" hepsi "90" / "turkiye" olur. */
function normalizeQuery(raw: string): string {
  return fold(raw.replace(/^\s*\+/, ''))
}

interface CountrySelectProps {
  value: string
  onChange: (iso2: string) => void
}

export function CountrySelect({
  value,
  onChange,
}: CountrySelectProps) {
  const { t, locale } = useT()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  /** Klavye ile gezinilen satır indeksi. */
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  /**
   * Panel `document.body`'ye portal ile basılır.
   *
   * Sebep: Drawer'ın içeriği `overflow-y-auto` olan bir kaydırma kabı —
   * `overflow-x: visible` CSS'te mümkün olmadığı için (ikisi de visible
   * dışında bir değere düşer) mutlak konumlu panel kırpılıyordu: listenin
   * bir kısmı alttaki alanların ARDINDA kalıyordu. Portal hem kırpılmayı hem de
   * z-index savaşını bitirir.
   */
  const [panelPos, setPanelPos] = useState<{ top: number, left: number, width: number, dropUp: boolean } | null>(null)

  useLayoutEffect(() => {
    if (!open) {
      return
    }
    const place = () => {
      const el = triggerRef.current
      if (!el) {
        return
      }
      const r = el.getBoundingClientRect()
      const H = 320
      const spaceBelow = window.innerHeight - r.bottom
      const dropUp = spaceBelow < H && r.top > spaceBelow
      setPanelPos({
        top: dropUp ? Math.max(8, r.top - 8) : r.bottom + 6,
        left: r.left,
        width: Math.max(r.width, 300),
        dropUp,
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open)
      return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      /*
        Panel portaldan body'ye basıldığı için `rootRef` içinde DEĞİL. Sadece
        rootRef'e bakarsak, bir seçeneğe tıklamak "dışarı tıklama" sayılıp liste
        kapanıyor ve seçim hiç uygulanmıyordu. İkisine de bakıyoruz.
      */
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target))
        return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Açılınca aramaya odaklan — kullanıcı hemen yazabilsin.
  useEffect(() => {
    if (open) {
      setActive(0)
      // input mount olsun diye bir kare bekle
      const id = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
  }, [open])

  const rows = useMemo<Row[]>(() => {
    const tr = new Intl.DisplayNames(['tr'], { type: 'region' })
    const en = new Intl.DisplayNames(['en'], { type: 'region' })
    return COUNTRIES.map(c => {
      const iso = c.iso2.toUpperCase()
      const name = tr.of(iso) ?? en.of(iso) ?? iso
      const enName = en.of(iso) ?? c.name
      return {
        iso2: c.iso2,
        callingCode: c.code,
        name,
        enName,
        flag: '',
        haystack: `${name} ${enName} ${c.name} ${iso} ${c.code} ${c.code}`.toLowerCase(),
      }
    })
  }, [])

  const filtered = useMemo(() => {
    const needle = normalizeQuery(q)
    if (!needle) {
      return rows
    }
    const scored = rows
      .map((r) => {
        const name = fold(r.name)
        const enName = fold(r.enName)
        const iso = r.iso2
        const code = r.callingCode
        // Sıralama: tam eşleşme > ön ek > içinde geçme.
        if (iso === needle || code === needle)
          return { r, score: 0 }
        if (name.startsWith(needle) || enName.startsWith(needle))
          return { r, score: 1 }
        if (iso.startsWith(needle) || code.startsWith(needle))
          return { r, score: 2 }
        if (name.includes(needle) || enName.includes(needle))
          return { r, score: 3 }
        if (r.haystack.includes(needle))
          return { r, score: 4 }
        return null
      })
      .filter((x): x is { r: Row, score: number } => x !== null)
    // Eşit skorda alfabetik (kararlı sıra).
    scored.sort((a, b) => a.score - b.score || a.r.name.localeCompare(b.r.name, 'tr'))
    return scored.map(x => x.r)
  }, [q, rows])

  // Klavye: ↑ ↓ seç, Enter onayla, Esc kapat.
  const commit = (iso2: string) => {
    onChange(iso2)
    setOpen(false)
    setQ('')
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(prev => {
        const next = e.key === 'ArrowDown'
          ? Math.min(prev + 1, filtered.length - 1)
          : Math.max(prev - 1, 0)
        // Aktif satırı görünür alana getir.
        const el = listRef.current?.children[next] as HTMLElement | undefined
        el?.scrollIntoView({ block: 'nearest' })
        return next
      })
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const row = filtered[active]
      if (row) {
        commit(row.iso2)
      }
      else if (filtered.length === 1) {
        commit(filtered[0].iso2)
      }
    }
  }

  const selected = rows.find(c => c.iso2 === value)

  /*
    Tetikleyici SABİT ve dar. Önceden genişlik en uzun ülke adından türetiliyordu
    (30+ch ≈ 220px); flex satırında `flex-1` olan kardeşler onu 75px'e
    sıkıştırıyor ve "Seç" -> "S..." olarak kırpılıyordu. Artık metin yazmıyoruz:
    seçim yokken ARA ikonu, seçiliyken bayrak + ISO kodu.
  */
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        aria-label={selected ? `${t('country.select')}: ${selected.name}` : t('country.select')}
        title={selected ? selected.name : t('country.select')}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`inline-flex h-12 w-[5.5rem] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-2 text-sm font-medium outline-none transition-colors ${
          selected
            ? 'border-primary/40 text-foreground hover:border-primary/70'
            : 'border-foreground-200/20 text-foreground/60 hover:border-primary/40'
        }`}
      >
        {selected
          ? (
              <>
                <CountryFlag iso2={selected.iso2} size={20} />
                <span className="truncate uppercase">{selected.iso2}</span>
              </>
            )
          : <SearchIcon size={16} className="shrink-0" />}
        <ChevronDownIcon
          size={14}
          className={`ml-auto shrink-0 text-foreground/50 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Panel: portal ile body'ye basılır (kırpılma/z-index sorunu yok). */}
      {open && panelPos && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: panelPos.dropUp ? undefined : panelPos.top,
            bottom: panelPos.dropUp ? window.innerHeight - panelPos.top : undefined,
            left: Math.min(panelPos.left, window.innerWidth - panelPos.width - 12),
            width: Math.min(panelPos.width, window.innerWidth - 24),
          }}
          className="z-[9999] overflow-hidden rounded-xl border border-foreground-200/15 bg-background shadow-2xl shadow-black/30"
        >
          {/* Arama */}
          <div className="border-b border-foreground/200/10 p-2">
            <div className="relative">
              <SearchIcon
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40"
              />
              <input
                ref={inputRef}
                value={q}
                onChange={e => {
                  setQ(e.target.value)
                  setActive(0)
                }}
                onKeyDown={onKeyDown}
                placeholder={t('country.search')}
                aria-label={t('country.search')}
                autoComplete="off"
                // rakam/harf dışını yazmayı engelle
                pattern="[\\p{L}\\p{N}\\s+.-]*"
                className="h-8 w-full rounded-lg border border-foreground/200/15 bg-background pl-8 pr-7 text-xs text-foreground outline-none transition-colors focus:border-primary/60"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ('')
                    setActive(0)
                    inputRef.current?.focus()
                  }}
                  aria-label={t('country.clear')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground"
                >
                  <CloseIcon size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Seçenekler */}
          <ul
            ref={listRef}
            className="max-h-64 overflow-y-auto p-1.5"
            role="listbox"
            aria-label={t('country.select')}
          >
            {filtered.length === 0 && (
              <li className="px-2.5 py-3 text-center text-xs text-foreground/50">
                <span className="opacity-70">{t('country.empty')}</span>
              </li>
            )}
            {filtered.map((c, i) => {
              const isActive = c.iso2 === value
              return (
                <li key={c.iso2} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    onClick={() => commit(c.iso2)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                      i === active
                        ? 'bg-foreground-200/10'
                        : ''
                    } ${isActive ? 'text-primary' : 'text-foreground/80'}`}
                  >
                    {/*
                      Sıra: [bayrak] [ülke adı] [kısaltım] ...... [+90 sağda].
                      +90'lar aynı hizada durabilsin diye kısa satırlarda
                      sabit genişlikli bir sütun kullanıyoruz.
                    */}
                    <CountryFlag iso2={c.iso2} />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="w-6 shrink-0 text-center text-[10px] font-semibold uppercase text-foreground/60">
                      {c.iso2}
                    </span>
                    <span className="w-[3.75rem] shrink-0 text-right text-[11px] tabular-nums text-foreground/55">
                      +
                      {c.callingCode}
                    </span>
                    <span className="w-4 shrink-0">
                      <CheckIcon
                        size={13}
                        className={isActive ? 'shrink-0' : 'shrink-0 opacity-0'}
                      />
                    </span>
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
