'use client'

import { useEffect, useState } from 'react'
import { ChevronUpIcon } from '@/components/ui/icons'
import { cn } from '@/components/ui/cn'
import { useLocale } from '@/components/locale-provider'

export function ScrollToTop() {
  const { locale } = useLocale()
  const isEn = locale === 'en'
  const [visible, setVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      aria-label={isEn ? 'Scroll to top' : 'Yukarı dön'}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border bg-background text-foreground shadow-lg shadow-black/20 transition-all duration-300',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
        isHovered
          ? 'scale-110 border-primary bg-primary !text-background'
          : 'border-foreground-200/30 text-primary',
      )}
    >
      <ChevronUpIcon
        size={22}
        className={cn('transition-transform duration-300', isHovered && '-translate-y-0.5')}
      />
    </button>
  )
}
