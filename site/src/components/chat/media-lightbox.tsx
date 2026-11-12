'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useT } from '@/components/locale-provider'
import { cn } from '@/components/ui/cn'
import {
  ArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  DownloadIcon,
  ForwardIcon,
  PinIcon,
  ReplyIcon,
  SmileFaceIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@/components/ui/icons'

/**
 * Medya lightbox — WhatsApp tarzı (2026-11-08, kullanıcı isteği):
 *   [✕  ad/tarih]                    [büyüt ↩ 📌 🙂 ➤ ⬇ ⤓  mesaja git]
 *   ◀        görsel / video (tekerlekle büyüt, kaydır)        ▶
 *   [thumbnail thumbnail thumbnail thumbnail]
 * Zoom > 1 olduğunda ileri/geri düğmeleri gizlenir (kullanıcı isteği).
 */

export interface LightboxItem {
  id: string
  url: string
  kind: 'image' | 'video'
  fileName?: string | null
  createdAt?: string | null
  senderName?: string | null
  senderAvatarUrl?: string | null
  pinned?: boolean
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const

function formatWhen(iso: string | null | undefined): string {
  if (!iso)
    return ''
  const d = new Date(iso)
  const date = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })
  const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

export function MediaLightbox({
  items,
  index,
  onIndexChange,
  onClose,
  onReply,
  onPin,
  onReact,
  onForward,
  onGoToMessage,
}: {
  items: LightboxItem[]
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
  onReply: (id: string) => void
  onPin: (id: string) => void
  onReact: (id: string, emoji: string) => void
  onForward: (id: string) => void
  onGoToMessage: (id: string) => void
}) {
  const { t } = useT()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ startX: number, startY: number, originX: number, originY: number } | null>(null)
  const [reactOpen, setReactOpen] = useState(false)
  const isVideoRef = useRef(false)

  const item = items[index]
  const isVideo = item?.kind === 'video'
  const zoomed = scale > 1
  const canNav = items.length > 1 && !zoomed

  const go = useCallback(
    (delta: number) => {
      if (items.length <= 1)
        return
      onIndexChange((index + delta + items.length) % items.length)
    },
    [index, items.length, onIndexChange],
  )

  // Varlık değişince zoom/pan/reaksiyon sıfırlanır.
  useEffect(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
    setReactOpen(false)
    setDragging(false)
    dragRef.current = null
    isVideoRef.current = isVideo
  }, [index, isVideo])

  // Tekerlek ile büyüt (passive:false — preventDefault şart).
  useEffect(() => {
    const el = containerRef.current
    if (!el)
      return
    const onWheel = (e: WheelEvent) => {
      if (isVideoRef.current) {
        return
      }
      e.preventDefault()
      setScale((s) => {
        const next = Math.min(5, Math.max(1, s * (1 - e.deltaY * 0.0015)))
        if (next === 1)
          setOffset({ x: 0, y: 0 })
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Escape ile kapat; ok tuşları ile gez (zoom'dayken değil).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')
        onClose()
      else if (e.key === 'ArrowRight' && !zoomed)
        go(1)
      else if (e.key === 'ArrowLeft' && !zoomed)
        go(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [go, onClose, zoomed])

  const onPointerDown = (e: React.PointerEvent) => {
    if (!zoomed)
      return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d)
      return
    const box = containerRef.current?.getBoundingClientRect()
    const w = box?.width ?? 800
    const h = box?.height ?? 600
    const maxX = (w * (scale - 1)) / 2 + 40
    const maxY = (h * (scale - 1)) / 2 + 40
    setOffset({
      x: Math.max(-maxX, Math.min(maxX, d.originX + (e.clientX - d.startX))),
      y: Math.max(-maxY, Math.min(maxY, d.originY + (e.clientY - d.startY))),
    })
  }
  const onPointerUp = () => {
    setDragging(false)
    dragRef.current = null
  }

  if (!item)
    return null

  const actionBtn
    = 'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur transition-colors hover:bg-black/60 hover:text-white'

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.fileName ?? 'Media'}
    >
      {/* ── ÜST BAR ── */}
      <div className="relative z-20 flex items-center gap-3 px-3 py-2.5" onClick={e => e.stopPropagation()}>
        {/* Gönderen: avatar + isim + tarih (kullanıcı isteği: isim yanında avatar) */}
        <div className="flex min-w-0 items-center gap-2.5">
          {item.senderAvatarUrl ? (
            <img src={item.senderAvatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white/80">
              {(item.senderName ?? '?').slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            {item.senderName && (
              <p className="bg-black/40 w-fit max-w-full truncate rounded-md px-2 py-0.5 text-sm font-semibold text-white backdrop-blur">{item.senderName}</p>
            )}
            <p className="bg-black/40 mt-0.5 w-fit rounded-md px-2 py-0.5 text-[11px] text-white/60 backdrop-blur">{formatWhen(item.createdAt)}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {!isVideo && (
            <button
              type="button"
              onClick={() => setScale(s => (s > 1 ? 1 : 2.5))}
              className={actionBtn}
              aria-label={zoomed ? t('chat.zoomOut') : t('chat.zoomIn')}
              title={zoomed ? t('chat.zoomOut') : t('chat.zoomIn')}
            >
              {zoomed ? <ZoomOutIcon size={17} /> : <ZoomInIcon size={17} />}
            </button>
          )}
          <button type="button" onClick={() => onReply(item.id)} className={actionBtn} aria-label={t('chat.reply')} title={t('chat.reply')}>
            <ReplyIcon size={17} />
          </button>
          <button
            type="button"
            onClick={() => onPin(item.id)}
            className={cn(actionBtn, item.pinned && 'text-primary')}
            aria-pressed={item.pinned}
            aria-label={t('chat.pin')}
            title={t('chat.pin')}
          >
            <PinIcon size={17} />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setReactOpen(o => !o)}
              className={actionBtn}
              aria-expanded={reactOpen}
              aria-label={t('chat.react')}
              title={t('chat.react')}
            >
              <SmileFaceIcon size={17} />
            </button>
            {reactOpen && (
              <div className="absolute top-full right-0 z-30 mt-2 flex items-center gap-0.5 rounded-full border border-white/10 bg-background px-1.5 py-1 shadow-xl">
                {QUICK_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onReact(item.id, emoji)
                      setReactOpen(false)
                    }}
                    aria-label={emoji}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-base transition-transform hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={() => onForward(item.id)} className={actionBtn} aria-label={t('chat.forward')} title={t('chat.forward')}>
            <ForwardIcon size={17} />
          </button>
          <a
            href={item.url}
            download={item.fileName ?? true}
            className={actionBtn}
            aria-label={t('chat.download')}
            title={t('chat.download')}
          >
            <DownloadIcon size={17} />
          </a>
          <button type="button" onClick={() => onGoToMessage(item.id)} className={actionBtn} aria-label={t('chat.goToMessage')} title={t('chat.goToMessage')}>
            <ArrowDownIcon size={17} />
          </button>
          {/* Kapat — EN SAĞDA (2026-11-08, kullanıcı isteği) */}
          <button type="button" onClick={onClose} className={actionBtn} aria-label={t('common.close')} title={t('common.close')}>
            <CloseIcon size={20} />
          </button>
        </div>
      </div>

      {/* ── MEDYA + OKLAR ── */}
      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => {
          // Boş alana tıklayınca KAPAT (yan panel gibi) — medyanın/okun üstünde değil.
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      >
        {canNav && (
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 z-10 cursor-pointer rounded-full bg-black/50 p-2.5 text-white/80 backdrop-blur transition-colors hover:bg-black/70 hover:text-white"
            aria-label={t('common.previous')}
          >
            <ChevronLeftIcon size={26} />
          </button>
        )}
        {item.kind === 'image' ? (
          <img
            src={item.url}
            alt={item.fileName ?? ''}
            draggable={false}
            className={cn(
              'max-h-full max-w-full object-contain select-none',
              !dragging && 'transition-transform duration-150',
            )}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              cursor: zoomed ? 'grab' : 'default',
            }}
          />
        ) : (
          <video
            src={item.url}
            controls
            playsInline
            preload="metadata"
            className="max-h-full w-full bg-black object-contain"
          />
        )}
        {canNav && (
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 z-10 cursor-pointer rounded-full bg-black/50 p-2.5 text-white/80 backdrop-blur transition-colors hover:bg-black/70 hover:text-white"
            aria-label={t('common.next')}
          >
            <ChevronRightIcon size={26} />
          </button>
        )}
      </div>

      {/* ── ALTTAKİ KÜÇÜK RESİMLER ── */}
      {items.length > 1 && (
        <div
          className="relative z-20 flex gap-1.5 overflow-x-auto px-3 py-2"
          onClick={e => e.stopPropagation()}
        >
          {items.map((it, i) => (
            <button
              key={`${it.id}-${i}`}
              type="button"
              onClick={() => onIndexChange(i)}
              className={cn(
                'h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-lg ring-1 ring-white/15 transition-all',
                i === index ? 'ring-2 ring-primary' : 'opacity-60 hover:opacity-100',
              )}
              aria-label={it.fileName ?? `media ${i + 1}`}
            >
              {it.kind === 'image'
                ? <img src={it.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                : <video src={it.url} preload="metadata" muted className="h-full w-full object-cover" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
