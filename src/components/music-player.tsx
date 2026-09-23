'use client'

import { Icon } from '@iconify/react'
import { useEffect, useRef, useState } from 'react'
import { useLocale } from '@/components/locale-provider'

interface MusicPlayerProps {
  src?: string
  title?: string
}

const MUSIC_ENABLED_KEY = 'site-music-enabled'
const MUSIC_TOGGLE_EVENT = 'site-music-toggle'

function readMusicEnabled(): boolean {
  if (typeof window === 'undefined') {
    return true
  }
  try {
    return localStorage.getItem(MUSIC_ENABLED_KEY) !== 'false'
  }
  catch {
    return true
  }
}

export function MusicPlayer({ src, title = 'Müzik' }: MusicPlayerProps) {
  const { locale } = useLocale()
  const isEn = locale === 'en'
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isClosed, setIsClosed] = useState(false)
  const [isGloballyEnabled, setIsGloballyEnabled] = useState(true)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState('0:00')
  const [duration, setDuration] = useState('0:00')
  const [volume, setVolume] = useState(0.7)

  useEffect(() => {
    const saved = localStorage.getItem('music-player-closed')
    if (saved === 'true')
      setIsClosed(true)
    setIsGloballyEnabled(readMusicEnabled())

    // Cross-tab updates: storage event fires only in *other* tabs.
    const onStorage = (e: StorageEvent) => {
      if (e.key === MUSIC_ENABLED_KEY) {
        setIsGloballyEnabled(readMusicEnabled())
      }
    }
    // Same-tab updates: SettingsModal dispatches this after writing localStorage
    // so the MusicPlayer rerenders immediately when the user toggles the switch.
    const onToggle = () => setIsGloballyEnabled(readMusicEnabled())
    window.addEventListener('storage', onStorage)
    window.addEventListener(MUSIC_TOGGLE_EVENT, onToggle)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(MUSIC_TOGGLE_EVENT, onToggle)
    }
  }, [])

  useEffect(() => {
    if (!src)
      return
    const audio = audioRef.current
    if (!audio)
      return

    const onTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100)
        setCurrentTime(formatTime(audio.currentTime))
        setDuration(formatTime(audio.duration))
      }
    }
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
    }
  }, [src])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio)
      return
    if (isPlaying) {
      audio.pause()
    }
    else {
      audio.play().catch(() => {})
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio || !audio.duration)
      return
    const pct = Number(e.target.value)
    audio.currentTime = (pct / 100) * audio.duration
    setProgress(pct)
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio)
      return
    const v = Number(e.target.value)
    audio.volume = v
    setVolume(v)
  }

  const handleClose = () => {
    const audio = audioRef.current
    if (audio)
      audio.pause()
    setIsPlaying(false)
    setIsClosed(true)
    localStorage.setItem('music-player-closed', 'true')
  }

  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  if (isClosed || !src || !isGloballyEnabled)
    return null

  const displayTitle = title || (isEn ? 'Music' : 'Müzik')

  return (
    <>
      <audio ref={audioRef} src={src} preload="metadata" />
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
          isMinimized ? 'translate-y-[calc(100%-48px)]' : 'translate-y-0'
        }`}
      >
        <div className="mx-auto max-w-6xl border-t border-foreground-200/10 bg-background/80 ">
          {!isMinimized && (
            <div className="flex items-center gap-3 px-4 py-2">
              <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                {displayTitle}
              </span>
              <span className="text-xs text-foreground-500">{currentTime}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={handleSeek}
                className="flex-1 h-1 accent-primary cursor-pointer"
              />
              <span className="text-xs text-foreground-500">{duration}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolume}
                className="w-16 h-1 accent-primary cursor-pointer"
              />
            </div>
          )}
          <div className="flex items-center justify-between border-t border-foreground-200/10 px-4 py-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? (isEn ? 'Pause' : 'Duraklat') : isEn ? 'Play' : 'Oynat'}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary transition-all hover:bg-primary/25"
              >
                <Icon icon={isPlaying ? 'mdi:pause' : 'mdi:play'} width={18} height={18} />
              </button>
              {!isMinimized && (
                <button
                  type="button"
                  onClick={() => audioRef.current && (audioRef.current.currentTime = 0)}
                  aria-label={isEn ? 'Restart' : 'Başa sar'}
                  className="text-foreground-500 hover:text-foreground transition-colors"
                >
                  <Icon icon="mdi:skip-backward" width={16} height={16} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleMinimize}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-500 hover:text-foreground hover:bg-background transition-all"
                title={isMinimized ? (isEn ? 'Expand' : 'Genişlet') : isEn ? 'Minimize' : 'Küçült'}
              >
                <Icon
                  icon={isMinimized ? 'mdi:chevron-up' : 'mdi:minus'}
                  width={16}
                  height={16}
                />
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-foreground-500 hover:text-danger hover:bg-danger/10 transition-all"
                title={isEn ? 'Close music' : 'Müziği kapat'}
              >
                <Icon icon="mdi:close" width={16} height={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
