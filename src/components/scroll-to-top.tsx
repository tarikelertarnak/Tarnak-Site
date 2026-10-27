'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/components/locale-provider'
import { cn } from '@/components/ui/cn'
import { LORD_ICONS, LordIcon } from '@/components/ui/lord-icon'
import { scrollToTop } from '@/lib/scroll'

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

  /**
   * `/#contact` gibi adresleri `https://tarikelertarnak.pages.dev/` yapar.
   *
   * Sunucuya hash GONDERILMEZ, bu yuzden redirect ile cozulemez; istemcide
   * `replaceState` ile adres temizlenir. `replace` (reassign) degil — geri
   * tusu onceki URL'e donmesin diye. Sayfa yeniden yuklenmez, kayma olmaz.
   */
  useEffect(() => {
    if (!window.location.hash)
      return
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  }, [])

  return (
    <button
      type="button"
      aria-label={isEn ? 'Scroll to top' : 'Yukarı dön'}
      onClick={() => scrollToTop()}
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
      <LordIcon
        src={LORD_ICONS.arrowUp}
        trigger={isHovered ? 'hover' : undefined}
        size={22}
        colors={isHovered ? 'primary:#ffffff,secondary:#3b82f6' : 'primary:#3b82f6,secondary:#ffffff'}
        className={cn('transition-transform duration-300', isHovered && '-translate-y-0.5')}
      />
    </button>
  )
}
