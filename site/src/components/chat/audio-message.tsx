'use client'

import { useRef } from 'react'
import { MediaPlayerBar } from '@/components/chat/media-player-bar'

/**
 * Sesli mesaj balonu — gizli `<audio>` + paylaşılabilir `MediaPlayerBar`.
 * Material tarzı: oynat/duraklat · süre · seek · hover'da açılan ses · ⋮
 */
export function AudioMessage({
  src,
  fileName,
  mine = false,
}: {
  src: string
  fileName?: string | null
  mine?: boolean
}) {
  const audioRef = useRef<HTMLAudioElement>(null)

  return (
    <div className="mb-2 w-full max-w-md">
      <audio ref={audioRef} src={src} preload="metadata" />
      <MediaPlayerBar mediaRef={audioRef} mine={mine} src={src} fileName={fileName} />
    </div>
  )
}
