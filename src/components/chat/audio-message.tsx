'use client'

import { useEffect, useRef, useState } from 'react'
import { useT } from '@/components/locale-provider'
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
 * Sesli mesaj oynatıcı — Material tarzı kompakt çubuk (2026-11-08, kullanıcı
 * görsel örneği): yuvarlak Oynat/Duraklat düğmesi, geçen/toplam süre, seek
 * çubuğu, ses düğmesi ve sağda dikey üç nokta menüsü (İndir / Yeni sekmede aç).
 *
 * `<audio>` gizli çalışır (metadata + timeupdate sürücüsü) — arayüz tamamen
 * özel çizilir; oynatım imleci/çubuk kullanıcı seçimine bağlı değil.
 */

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s <= 0)
    return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export function AudioMessage({
  src,
  fileName,
}: {
  src: string
  fileName?: string | null
}) {
  const { t } = useT()
  const audioRef = useRef<HTMLAudioElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const a = audioRef.current
    if (!a)
      return
    const onLoaded = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0)
    const onTime = () => setCurrent(a.currentTime || 0)
    const onEnded = () => {
      setPlaying(false)
      setCurrent(0)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    a.addEventListener('loadedmetadata', onLoaded)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('ended', onEnded)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    return () => {
      a.removeEventListener('loadedmetadata', onLoaded)
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('ended', onEnded)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
    }
  }, [])

  // Menü dışarı tıklanırsa kapanır (context-menu ile aynı davranış).
  useEffect(() => {
    if (!menuOpen)
      return
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node))
        setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const toggle = () => {
    const a = audioRef.current
    if (!a)
      return
    if (a.paused) {
      a.play().catch(() => setPlaying(false))
    }
    else {
      a.pause()
    }
  }

  const seek = (value: number) => {
    const a = audioRef.current
    if (!a)
      return
    a.currentTime = value
    setCurrent(value)
  }

  const toggleMute = () => {
    const a = audioRef.current
    if (!a)
      return
    a.muted = !a.muted
    setMuted(a.muted)
  }

  return (
    <div className="mb-2 flex w-full max-w-md items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 py-1.5 pr-2 pl-1.5">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Oynat / Duraklat — her zaman görünür, yuvarlak */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t('chat.pause') : t('chat.play')}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground/10 text-foreground transition-colors hover:bg-foreground/20"
      >
        {playing
          ? <PauseIcon size={15} />
          : <PlayIcon size={15} className="ml-0.5" />}
      </button>

      <span className="shrink-0 text-[11px] font-medium tabular-nums text-foreground-500">
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
        className="h-1 min-w-0 flex-1 cursor-pointer accent-primary"
      />

      {/* Sessiz / Sesi aç */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? t('chat.unmute') : t('chat.mute')}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground-500 transition-colors hover:bg-foreground/10 hover:text-foreground"
      >
        {muted ? <VolumeXIcon size={16} /> : <VolumeIcon size={16} />}
      </button>

      {/* Taşma menüsü — İndir / Yeni sekmede aç */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={t('chat.options')}
          aria-expanded={menuOpen}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-foreground-500 transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <MoreVerticalIcon size={16} />
        </button>
        {menuOpen && (
          <div className="absolute top-full right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-foreground/10 bg-background shadow-lg">
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
          </div>
        )}
      </div>
    </div>
  )
}
