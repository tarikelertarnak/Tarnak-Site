'use client'

import type { SiteContent } from '@/lib/content'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '@/components/locale-provider'
import { cn } from '@/components/ui/cn'
import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  CopyIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  socialIcon,
} from '@/components/ui/icons'
import { buildContactChannels, filterChannels, groupChannels } from '@/lib/contact-channels'
import type { ContactChannel } from '@/lib/contact-channels'
import { copyText } from '@/lib/clipboard'

/**
 * Iletisim hizli erisim menusu.
 *
 * Tek bir acilir menude TUM iletisim yollari: e-posta, telefon, konum
 * (Google/Yandex) ve sosyal medya (Instagram, GitHub...). Ustte arama var;
 * her satirda kopyala butonu, satira tiklayinca ilgili adres acilir.
 *
 * Neden ayri bilesen: `SearchableCombobox` SECIM icin tasarlandi (secili
 * ogeyi isaretler). Burada secim yok — her satir bir EYLEM (ac / kopyala).
 * Ayni bilesene iki farkli anlam yuklemek ikisini de bozardi.
 *
 * ⚠️ YON: panel HER ZAMAN ASAGI acilir (`top-full`). Onceki surumde yer
 * yoksa yukari aciliyordu ama kullanici bunu istemedi — asagi acilmali.
 *
 * ⚠️ KAYDIRMA: arama alanina `autoFocus` vermek SAYFAYI EN USTE kaydiriyordu
 * (tarayici odaklanan elemani gorunur alana getiriyor). Artik odak
 * `preventScroll: true` ile elle veriliyor.
 *
 * ⚠️ BOYUT: yukseklik sabit degil — tetikleyicinin ALTINDAKI bosluga gore
 * olculur, yani "uzayabildigi kadar" buyur (asgari 240px, azami 85vh).
 */

/**
 * Panelin liste DISINDA kalan yuksekligi (px): mt-2 boslugu + arama kutusu
 * (p-2 dolgu + h-9 alan + alt kenarlik) + panel kenarligi + pay.
 * Yukseklik hesabi yalnizca listeye uygulandigi icin buradan dusulmeli.
 */
const PANEL_CHROME = 80

/** Kanal ikonu: yerlesik kanallar sabit, sosyaller mdi adiyla. */
function ChannelIcon({ icon, size = 18 }: { icon: string, size?: number }) {
  switch (icon) {
    case 'email':
      return <MailIcon size={size} />
    case 'phone':
      return <PhoneIcon size={size} />
    case 'location':
      return <MapPinIcon size={size} />
    default:
      return socialIcon(icon, size) ?? <GlobeIcon size={size} />
  }
}

function ChannelRow({
  channel,
  copied,
  active,
  index,
  onCopy,
  onActivate,
  onHover,
}: {
  channel: ContactChannel
  copied: boolean
  active: boolean
  /** Duz listedeki sirasi — klavye gezinmesi icin `data-index` olarak yazilir */
  index: number
  onCopy: (channel: ContactChannel) => void
  onActivate: (channel: ContactChannel) => void
  onHover: () => void
}) {
  const { t } = useT()
  const canCopy = Boolean(channel.copyValue)

  const content = (
    <>
      <span className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
        active ? 'bg-primary/20 text-primary' : 'bg-primary/12 text-primary',
      )}
      >
        <ChannelIcon icon={channel.icon} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-foreground">
          {channel.label}
        </span>
        <span className="block truncate text-[11px] text-foreground-500">
          {channel.value}
        </span>
      </span>
    </>
  )

  return (
    <li
      data-index={index}
      onMouseEnter={onHover}
      className={cn(
        'group/row flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
        active ? 'bg-foreground-200/15' : 'hover:bg-foreground-200/10',
      )}
    >
      {channel.href
        ? (
            <a
              href={channel.href}
              target={channel.href.startsWith('http') ? '_blank' : undefined}
              rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              onClick={() => onActivate(channel)}
              className="flex min-w-0 flex-1 items-center gap-2.5 no-underline"
            >
              {content}
            </a>
          )
        : (
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              {content}
            </span>
          )}

      {canCopy && (
        <button
          type="button"
          onClick={() => onCopy(channel)}
          aria-label={`${channel.label} — ${t('contact.copy')}`}
          title={copied ? t('contact.copied') : t('contact.copy')}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
            copied
              ? 'border-success-300 bg-success-50 text-success'
              : 'border-foreground-200/15 text-foreground-500 hover:border-primary/40 hover:text-primary',
          )}
        >
          {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
        </button>
      )}
    </li>
  )
}

export function ContactQuickMenu({ content }: { content: SiteContent }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copyFailed, setCopyFailed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  // Panel yuksekligi: tetikleyicinin altindaki bosluga gore olculur.
  const [maxHeight, setMaxHeight] = useState(360)

  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const channels = useMemo(
    () => buildContactChannels(content, t),
    [content, t],
  )
  const filtered = useMemo(() => filterChannels(channels, q), [channels, q])
  const groups = useMemo(() => groupChannels(filtered), [filtered])

  /**
   * Paneli ASAGI acmak icin gereken alani olc.
   * Kullanici "uzayabildigi kadar buyuk olsun" istedi — sabit 22rem yerine
   * tetikleyicinin altindaki GERCEK bosluk kullaniliyor.
   *
   * ⚠️ `PANEL_CHROME`: olculen yukseklik yalnizca LISTEYE uygulaniyor, ama
   * panelin toplam yuksekligi = liste + arama kutusu + kenarliklar. Bunu
   * hesaba katmazsak panel ekranin altindan TASIYORDU (gercek tarayicida
   * olculdu: `altTasti: true`).
   */
  const measureHeight = () => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect || typeof window === 'undefined') {
      return
    }
    const vh = window.innerHeight
    const available = vh - rect.bottom - PANEL_CHROME
    const capped = Math.min(available, Math.floor(vh * 0.85))
    const height = Math.max(240, capped)
    setMaxHeight(height)

    // Panel ASAGI acildigi icin ekranin altindan tasma ihtimali var
    // (ozellikle footer'da). Yukari/YUKARI kaydirmak yerine — kullanici
    // "sayfa uste kayiyor" diye sikayet etti — paneli ortaya cikarmak icin
    // ASAGI kaydiriyoruz. Sayfanin sonundaysak zaten kaydiracak yer yoktur.
    const deficit = rect.bottom + PANEL_CHROME + height - vh
    if (deficit > 0) {
      window.scrollBy({ top: deficit, behavior: 'smooth' })
    }
  }

  const openMenu = () => {
    measureHeight()
    setOpen(true)
    setQ('')
    setActiveIndex(0)
    // ⚠️ `autoFocus` SAYFAYI EN USTE kaydiriyordu. Elle odakla ve kaydirmayi
    // engelle — panel asagi acilirken sayfa yerinde kalmali.
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true })
    })
  }

  // Disari tiklayinca / Escape ile kapan
  useEffect(() => {
    if (!open) {
      return
    }
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Bilesen kalkarken bekleyen zamanlayiciyi temizle (sizinti olmasin)
  useEffect(() => () => {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current)
    }
  }, [])

  const handleCopy = async (channel: ContactChannel) => {
    if (!channel.copyValue) {
      return
    }
    const ok = await copyText(channel.copyValue)

    if (resetTimer.current) {
      clearTimeout(resetTimer.current)
    }
    if (ok) {
      setCopiedId(channel.id)
      setCopyFailed(false)
      resetTimer.current = setTimeout(() => setCopiedId(null), 1800)
    }
    else {
      // Sessizce yutmak yok: kullanici "kopyalandi" sanmasin.
      setCopiedId(null)
      setCopyFailed(true)
      resetTimer.current = setTimeout(() => setCopyFailed(false), 2600)
    }
  }

  /** Klavye ile aktif satiri ac (Enter). */
  const activate = (channel: ContactChannel) => {
    if (!channel.href) {
      return
    }
    if (channel.href.startsWith('http')) {
      window.open(channel.href, '_blank', 'noopener,noreferrer')
    }
    else {
      window.location.href = channel.href
    }
  }

  const moveActive = (delta: number) => {
    if (!filtered.length) {
      return
    }
    setActiveIndex((prev) => {
      const next = (prev + delta + filtered.length) % filtered.length
      // Aktif satiri gorunur alana kaydir — ama SAYFAYI kaydirma.
      requestAnimationFrame(() => {
        const el = listRef.current?.querySelector<HTMLElement>(
          `[data-index="${next}"]`,
        )
        el?.scrollIntoView({ block: 'nearest' })
      })
      return next
    })
  }

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveActive(1)
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveActive(-1)
    }
    else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
    }
    else if (e.key === 'End') {
      e.preventDefault()
      setActiveIndex(Math.max(0, filtered.length - 1))
    }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const channel = filtered[activeIndex]
      if (channel) {
        activate(channel)
      }
    }
  }

  const total = channels.length
  const isEmpty = total === 0

  // Grup icindeki satirin listedeki GERCEK sirasini bul (klavye vurgusu icin)
  const indexOf = (channel: ContactChannel) =>
    filtered.findIndex(c => c.id === channel.id)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold outline-none transition-colors',
          open
            ? 'border-primary/60 bg-primary/10 text-primary'
            : 'border-foreground-200/20 text-foreground/85 hover:border-primary/40 hover:text-primary',
        )}
      >
        <MailIcon size={15} />
        {t('contact.quickMenu')}
        <ChevronDownIcon size={13} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-foreground-200/15 bg-background shadow-2xl shadow-black/25"
        >
          {/* Arama */}
          <div className="border-b border-foreground-200/10 p-2">
            <div className="relative">
              <SearchIcon
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40"
              />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={onSearchKeyDown}
                placeholder={t('contact.searchPlaceholder')}
                aria-label={t('contact.searchPlaceholder')}
                className="h-9 w-full rounded-xl border border-foreground-200/15 bg-background pl-8 pr-8 text-xs text-foreground outline-none transition-colors focus:border-primary/60"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  aria-label={t('contact.clearSearch')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/50 transition-colors hover:text-foreground"
                >
                  <CloseIcon size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Kopyalama hatasi */}
          {copyFailed && (
            <p className="border-b border-danger-200 bg-danger-50 px-3 py-1.5 text-[11px] font-medium text-danger">
              {t('contact.copyFailed')}
            </p>
          )}

          {/* Kanallar — yukseklik olculen bosluga gore */}
          <div
            ref={listRef}
            style={{ maxHeight }}
            className="overflow-y-auto p-1.5"
          >
            {isEmpty && (
              <p className="px-2.5 py-6 text-center text-xs text-foreground-500">
                {t('contact.empty')}
              </p>
            )}

            {!isEmpty && filtered.length === 0 && (
              <p className="px-2.5 py-6 text-center text-xs text-foreground-500">
                {t('contact.noResults')}
              </p>
            )}

            {groups.builtin.length > 0 && (
              <ul className="flex flex-col">
                {groups.builtin.map(c => (
                  <ChannelRow
                    key={c.id}
                    channel={c}
                    copied={copiedId === c.id}
                    active={indexOf(c) === activeIndex}
                    index={indexOf(c)}
                    onCopy={ch => void handleCopy(ch)}
                    onActivate={activate}
                    onHover={() => setActiveIndex(indexOf(c))}
                  />
                ))}
              </ul>
            )}

            {groups.social.length > 0 && (
              <>
                <p className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground-500">
                  {t('contact.socials')}
                </p>
                <ul className="flex flex-col">
                  {groups.social.map(c => (
                    <ChannelRow
                      key={c.id}
                      channel={c}
                      copied={copiedId === c.id}
                      active={indexOf(c) === activeIndex}
                      index={indexOf(c)}
                      onCopy={ch => void handleCopy(ch)}
                      onActivate={activate}
                      onHover={() => setActiveIndex(indexOf(c))}
                    />
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
