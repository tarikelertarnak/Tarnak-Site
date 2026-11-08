'use client'

import { useEffect, useRef, useState } from 'react'
import { useT } from '@/components/locale-provider'
import { cn } from '@/components/ui/cn'
import {
  ArrowUpRightIcon,
  DownloadIcon,
  MoreVerticalIcon,
  PauseIcon,
  PlayIcon,
  VolumeIcon,
  VolumeXIcon,
} from '@/components/ui/icons'

/**
 * Medya oynatıcı çubuğu — Material tarzı kompakt çubuk (2026-11-08, kullanıcı
 * görsel örneği). Ses VE video için paylaşılan kontroller:
 *   [▶/⏸] geçen / toplam süre ───●───  [🔊]→(hover'da açılır kaydırıcı)  [⋮]
 * `⋮` menüsü: İndir · Yeni sekmede aç · Oynatma hızı (0.5×…2×).
 * `<media>` gizli çalışır; bu bar metadata/timeupdate/volumechange ile sürücüdür.
 */

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s <= 0)
    return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function MediaPlayerBar({
  mediaRef,
  mine = false,
  src,
  fileName,
}: {
  mediaRef: React.RefObject<HTMLMediaElement | null>
  mine?: boolean
  src: string
  fileName?: string | null
}) {
  const { t } = useT()
  const menuRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const media = mediaRef.current
    if (!media)
      return
    const onLoaded = () => setDuration(Number.isFinite(media.duration) ? media.duration : 0)
    const onTime = () => setCurrent(media.currentTime || 0)
    const onEnded = () => {
      setPlaying(false)
      setCurrent(0)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onVolumeChange = () => setVolume(media.volume)
    media.addEventListener('loadedmetadata', onLoaded)
    media.addEventListener('timeupdate', onTime)
    media.addEventListener('ended', onEnded)
    media.addEventListener('play', onPlay)
    media.addEventListener('pause', onPause)
    media.addEventListener('volumechange', onVolumeChange)
    if (media.readyState >= 1)
      onLoaded()
    return () => {
      media.removeEventListener('loadedmetadata', onLoaded)
      media.removeEventListener('timeupdate', onTime)
      media.removeEventListener('ended', onEnded)
      media.removeEventListener('play', onPlay)
      media.removeEventListener('pause', onPause)
      media.removeEventListener('volumechange', onVolumeChange)
    }
  }, [mediaRef])

  // Dışarı tıklanınca/ESC ile menü kapanır.
  useEffect(() => {
    if (!menuOpen)
      return
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node))
        setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')
        setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // Hızı uygula (seçim değişince).
  useEffect(() => {
    const media = mediaRef.current
    if (media)
      media.playbackRate = speed
  }, [speed, mediaRef])

  const toggle = () => {
    const media = mediaRef.current
    if (!media)
      return
    if (media.paused) {
      media.play().catch(() => setPlaying(false))
    }
    else {
      media.pause()
    }
  }

  const seek = (value: number) => {
    const media = mediaRef.current
    if (!media)
      return
    media.currentTime = value
    setCurrent(value)
  }

  const toggleMute = () => {
    const media = mediaRef.current
    if (!media)
      return
    media.muted = !media.muted
    setMuted(media.muted)
  }

  const changeVolume = (value: number) => {
    const media = mediaRef.current
    if (!media)
      return
    const v = Math.min(1, Math.max(0, value))
    media.volume = v
    if (v > 0)
      media.muted = false
    setVolume(v)
  }

  return (
    <div
      className={cn(
        'flex w-full items-center gap-2 rounded-full border py-1.5 pr-2 pl-1.5',
        mine
          ? 'border-white/10 bg-black/20'
          : 'border-foreground/10 bg-foreground/5',
      )}
    >
      {/* Oynat / Duraklat */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t('chat.pause') : t('chat.play')}
        className={cn(
          'flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors',
          mine
            ? 'bg-primary-fg text-primary hover:bg-primary-fg/90'
            : 'bg-foreground/10 text-foreground hover:bg-foreground/20',
        )}
      >
        {playing
          ? <PauseIcon size={15} />
          : <PlayIcon size={15} className="ml-0.5" />}
      </button>

      <span className={cn(
        'shrink-0 text-[11px] font-medium tabular-nums',
        mine ? 'text-primary-fg/85' : 'text-foreground-500',
      )}
      >
        {`${fmtTime(current)} / ${fmtTime(duration)}`}
      </span>

      {/* Seek çubuğu */}
      <input
        type="range"
        min={0}
        max={Math.max(duration, 0.01)}
        step={0.01}
        value={current}
        onChange={e => seek(Number(e.target.value))}
        aria-label={t('chat.audioPlayer')}
        className={cn(
          'h-1 min-w-0 flex-1 cursor-pointer accent-currentColor',
          mine ? 'text-primary-fg' : 'text-foreground',
        )}
      />

      {/* Ses — hover'da/focus'ta açılan kaydırıcı (Material) */}
      <div className="group/vol flex shrink-0 items-center">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted || volume === 0 ? t('chat.unmute') : t('chat.mute')}
          className={cn(
            'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors',
            mine
              ? 'text-primary-fg/75 hover:bg-white/10 hover:text-primary-fg'
              : 'text-foreground-500 hover:bg-foreground/10 hover:text-foreground',
          )}
        >
          {muted || volume === 0 ? <VolumeXIcon size={16} /> : <VolumeIcon size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={e => changeVolume(Number(e.target.value))}
          aria-label={t('chat.volume')}
          className={cn(
            'h-1 w-0 cursor-pointer accent-currentColor opacity-0 transition-all duration-200 group-focus-within/vol:w-20 group-focus-within/vol:pr-1.5 group-focus-within/vol:opacity-100 group-hover/vol:w-20 group-hover/vol:pr-1.5 group-hover/vol:opacity-100',
            mine ? 'text-primary-fg' : 'text-foreground',
          )}
        />
      </div>

      {/* Taşma menüsü — İndir · Yeni sekmede aç · Oynatma hızı */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={t('chat.options')}
          aria-expanded={menuOpen}
          className={cn(
            'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors',
            mine
              ? 'text-primary-fg/75 hover:bg-white/10 hover:text-primary-fg'
              : 'text-foreground-500 hover:bg-foreground/10 hover:text-foreground',
          )}
        >
          <MoreVerticalIcon size={16} />
        </button>
        {menuOpen && (
          <div className="absolute top-full right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-lg">
            <a
              href={src}
              download={fileName ?? undefined}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-foreground-600 transition-colors hover:bg-foreground/5"
            >
              <DownloadIcon size={13} />
              {t('chat.download')}
            </a>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs text-foreground-600 transition-colors hover:bg-foreground/5"
            >
              <ArrowUpRightIcon size={13} />
              {t('chat.openNewTab')}
            </a>
            <div className="border-t border-foreground/10 pt-1 pb-1">
              <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground-500">
                {t('chat.playbackSpeed')}
              </p>
              <div className="flex flex-wrap gap-1 px-2 pb-1">
                {SPEEDS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    aria-pressed={speed === s}
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[11px] tabular-nums transition-colors',
                      speed === s
                        ? 'border-primary bg-primary/15 font-semibold text-primary'
                        : 'border-foreground/15 text-foreground-500 hover:bg-foreground/5',
                    )}
                  >
                    {`${s}×`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
