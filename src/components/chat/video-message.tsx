'use client'

import { useRef } from 'react'
import { MediaPlayerBar } from '@/components/chat/media-player-bar'

/**
 * Video mesajı — `<video>` karesi + paylaşılabilir `MediaPlayerBar`
 * (ses mesajıyla aynı: oynat · süre · seek · hover ses · ⋮ → İndir / hız /
 * yeni sekmede aç). `controls` bilerek YOK — tüm kontroller MediaPlayerBar'da.
 */
export function VideoMessage({
  src,
  fileName,
  mine = false,
}: {
  src: string
  fileName?: string | null
  mine?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <div className="mb-2 w-full max-w-md overflow-hidden rounded-2xl border border-foreground/10 bg-black">
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="metadata"
        className="max-h-64 w-full bg-black object-contain"
        aria-label={fileName ?? undefined}
      />
      <MediaPlayerBar mediaRef={videoRef} mine={mine} src={src} fileName={fileName} />
    </div>
  )
}
