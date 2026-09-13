'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/components/locale-provider'
import { cn } from '@/components/ui/cn'
import { StarIcon, StarOutlineIcon } from '@/components/ui/icons'

interface StarsData {
  totalStars: number
  count: number
  average: number
}

/**
 * Single-star like (GitHub style). Pressing again undoes the like —
 * an unstar — the count never inflates. Whether the user liked is kept
 * in localStorage (per browser/session), so the same user cannot
 * keep pumping the star up.
 */
export function StarRating({
  itemId,
  itemType,
  readonly = false,
  size = 18,
  showCount = true,
}: {
  itemId: string
  itemType: 'project' | 'blog'
  readonly?: boolean
  size?: number
  showCount?: boolean
}) {
  const { t } = useT()
  const storeKey = `star-state:${itemType}:${itemId}`
  const [data, setData] = useState<StarsData>({ totalStars: 0, count: 0, average: 0 })
  // Like state is initialized from localStorage — so pressing again sends an
  // unstar. 'false' during SSR (no interaction yet), corrected only on the client
  // via localStorage → correct after hydration.
  const [liked, setLiked] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load the existing star/like data
  useEffect(() => {
    let cancelled = false
    fetch(`/api/stars?itemId=${encodeURIComponent(itemId)}&itemType=${itemType}`)
      .then(res => (res.ok ? res.json() as Promise<StarsData> : null))
      .then((d) => {
        if (d && !cancelled) {
          setData(d)
        }
      })
      .catch(() => {})

    // Hydrate the "did I like it" state from localStorage on the client
    try {
      setLiked(window.localStorage.getItem(storeKey) === '1')
    }
    catch { /* sessiz */ }

    return () => {
      cancelled = true
    }
  }, [itemId, itemType, storeKey])

  const handleToggle = async () => {
    if (readonly || isSubmitting)
      return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, itemType, rating: 1, unstar: liked }),
      })
      if (res.ok) {
        const d = await res.json() as StarsData
        setData(d)
        setLiked(!liked)
        try {
          window.localStorage.setItem(storeKey, liked ? '0' : '1')
        }
        catch { /* sessiz */ }
      }
    }
    catch {
      // pass silently
    }
    finally {
      setIsSubmitting(false)
    }
  }

  // The shown number is only the real like count from the API; localStorage
  // only stores the "did I like it" state — it never inflates the number.
  const displayCount = Math.max(0, data.count)

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={readonly || isSubmitting}
        onClick={handleToggle}
        className={cn(
          'transition-all duration-200',
          readonly ? 'cursor-default' : 'cursor-pointer hover:scale-125',
          liked ? 'text-yellow-400' : 'text-foreground/80 hover:text-yellow-400',
        )}
        title={liked ? t('stars.unlike') : t('stars.like')}
        aria-label={liked ? t('stars.unlike') : t('stars.like')}
        aria-pressed={liked}
      >
        {liked ? <StarIcon size={size} /> : <StarOutlineIcon size={size} />}
      </button>
      {showCount && (
        <span className="text-[11px] text-foreground-500">
          {displayCount}
          <span className="ml-0.5 opacity-70">{t('stars.likes')}</span>
        </span>
      )}
    </div>
  )
}
