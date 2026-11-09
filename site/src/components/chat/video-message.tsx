'use client'

import { useRef } from 'react'
import { MediaPlayerBar } from '@/components/chat/media-player-bar'

/**
 * Video mesajı — `<video>` karesi + paylaşılabilir `MediaPlayerBar`
 * (ses mesajıyla aynı: oynat · süre · seek · hover ses · ⋮ → İndir / hız /
 * yeni sekmede aç). `controls` bilerek YOK — tüm kontroller MediaPlayerBar'da.
 * Kayda tıklamak lightbox'ı açar (gömülü oynatıcı yoktur).
 */
export function VideoMessage({
  src,
  fileName,
  mine = false,
  onOpen,
}: {
  src: string
  fileName?: string | null
  mine?: boolean
  onOpen?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <div className="mb-2 w-full max-w-md overflow-hidden rounded-2xl border border-foreground/10 bg-black">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onOpen?.()
        }}
        title={fileName ?? undefined}
        aria-label={fileName ?? 'Video'}
        className="block w-full cursor-zoom-in"
      >
        <video
          ref={videoRef}
          src={src}
          playsInline
          preload="metadata"
          className="pointer-events-none max-h-64 w-full bg-black object-contain"
        />
      </button>
      <MediaPlayerBar mediaRef={videoRef} mine={mine} src={src} fileName={fileName} />
    </div>
  )
}
