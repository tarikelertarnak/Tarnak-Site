'use client'

import Script from 'next/script'
import { useEffect, useRef } from 'react'

import type { AdSlot } from '@/lib/ads'

/**
 * Tek bir reklam birimini cizer.
 *
 * kind='image'   -> gorsel + hedef link
 * kind='link'    -> sadece metin baglanti (sponsor)
 * kind='html'    -> elle HTML (dangerouslySetInnerHTML — icerik admin tarafindan
 *                   girilir, RLS ile sadece admin yazabilir)
 * kind='adsense' -> Google AdSense <ins class="adsbygoogle">
 *
 * AdSense yalnizca NEXT_PUBLIC_ADSENSE_CLIENT tanimliysa yuklenir; aksi halde
 * birim "reklam alani" placeholder'i olarak kalir (kirilmaz).
 */

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || ''

interface AdSlotCardProps {
  slot: AdSlot
  isEn?: boolean
  variant?: 'stage' | 'grid' | 'banner'
  className?: string
  /** Tiklama olursa (izleme akisinda "tikla = tamamla") */
  onActivate?: () => void
}

export function AdSlotCard({
  slot,
  isEn = false,
  variant = 'grid',
  className = '',
  onActivate,
}: AdSlotCardProps) {
  const pushed = useRef(false)

  useEffect(() => {
    if (slot.kind !== 'adsense' || !ADSENSE_CLIENT || pushed.current)
      return
    pushed.current = true
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] }
      w.adsbygoogle = w.adsbygoogle || []
      w.adsbygoogle.push({})
    }
    catch {
      // reklam engelleyici (adblock) — sessizce yut, sayfa calismaya devam etsin
    }
  }, [slot.kind, slot.id])

  const t = (tr: string, en: string) => (isEn ? en : tr)

  const frame
    = variant === 'stage'
      ? 'min-h-[240px] sm:min-h-[300px]'
      : variant === 'banner'
        ? 'min-h-[72px]'
        : 'min-h-[150px]'

  const body = () => {
    if (slot.kind === 'image' && slot.imageUrl) {
      const img = (
        <img
          src={slot.imageUrl}
          alt={slot.title}
          loading="lazy"
          decoding="async"
          className={
            variant === 'stage'
              ? 'max-h-[300px] w-auto max-w-full object-contain'
              : 'max-h-[120px] w-auto max-w-full object-contain'
          }
        />
      )
      return slot.targetUrl
        ? (
            <a
              href={slot.targetUrl}
              onClick={onActivate}
              className="flex h-full w-full items-center justify-center"
              {...(slot.targetUrl.startsWith('http')
                ? { target: '_blank', rel: 'noopener noreferrer sponsored' }
                : {})}
            >
              {img}
            </a>
          )
        : img
    }

    if (slot.kind === 'html' && slot.html) {
      return (
        <div
          className="flex h-full w-full items-center justify-center [&_img]:max-w-full"
          // Icerik yalnizca admin tarafindan girilebilir (RLS: ad_slots -> admin)
          dangerouslySetInnerHTML={{ __html: slot.html }}
        />
      )
    }

    if (slot.kind === 'adsense') {
      if (!ADSENSE_CLIENT) {
        return (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <span className="text-2xl">📢</span>
            <p className="text-xs font-semibold text-foreground/70">
              {t('Reklam alanı hazır', 'Ad slot ready')}
            </p>
            <p className="max-w-[220px] text-[11px] text-foreground/45">
              {t(
                'Google AdSense yayıncı kimliği eklendiğinde burada gerçek reklam görünür.',
                'A real ad appears here once a Google AdSense publisher ID is added.',
              )}
            </p>
          </div>
        )
      }
      return (
        <ins
          className="adsbygoogle block"
          style={{ display: 'block', width: '100%', height: '100%' }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot.id}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      )
    }

    // kind === 'link' (veya gorseli olmayan image)
    return (
      <a
        href={slot.targetUrl || '#'}
        onClick={onActivate}
        className="flex h-full w-full flex-col items-center justify-center gap-2 text-center"
        {...(slot.targetUrl?.startsWith('http')
          ? { target: '_blank', rel: 'noopener noreferrer sponsored' }
          : {})}
      >
        <span className="text-2xl">🔗</span>
        <span className="text-sm font-semibold text-primary">{slot.title}</span>
        <span className="text-[11px] text-foreground/55">{t('Sponsor bağlantısı', 'Sponsor link')} ↗</span>
      </a>
    )
  }

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border border-foreground-200/12 bg-background/70 transition-colors hover:border-primary/30 ${className}`}
    >
      {/* Sponsor etiketi — seffaflik: reklam oldugu acikca belli olsun */}
      <div className="flex items-center justify-between gap-2 border-b border-foreground-200/10 px-3 py-1.5">
        <span className="truncate text-[10px] font-bold uppercase tracking-widest text-foreground/40">
          {t('Reklam', 'Ad')}
        </span>
        <span className="truncate text-[10px] font-semibold text-foreground/50">
          {slot.sponsor}
        </span>
      </div>

      <div className={`flex flex-1 items-center justify-center p-3 ${frame}`}>
        {body()}
      </div>

      {variant !== 'banner' && slot.description && (
        <div className="border-t border-foreground-200/10 px-3 py-2">
          <p className="text-xs font-semibold text-foreground">{slot.title}</p>
          <p className="truncate text-[11px] text-foreground/55">{slot.description}</p>
        </div>
      )}
    </div>
  )
}

/** AdSense script'ini bir kez yukler (yalnizca yayinci kimligi varsa). */
export function AdSenseScript() {
  if (!ADSENSE_CLIENT)
    return null
  return (
    <Script
      id="adsense-loader"
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
    />
  )
}
