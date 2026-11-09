'use client'

import { Icon } from '@iconify/react'
import { CodeIcon } from '@/components/ui/icons'
import { techIcon } from '@/components/ui/tech-icons'

/**
 * Kanonik ikon değerini (bkz. `lib/icon-resolve.ts`) çizer — TEK kaynak.
 *
 * Hem admin önizlemesi hem sitedeki teknoloji şeridi bu bileşeni kullanır, ki
 * "önizlemede gördüğün = sitede görünen" garantisi bozulmasın (2026-10-16).
 *
 * Kanonik biçimler:
 *   `<svg …>`        → satır içi işaretleme. Sunucu tarafında temizlenmiş olarak
 *                      saklanır (kaydetme yolu sanitize eder) ve okuma
 *                      sınırında (`lib/content.ts`) yeniden temizlenir.
 *   `/…`, `http…`, `data:image/…` → <img>
 *   `koleksiyon:ikon` → Iconify
 *   boş/başka         → yerel ikon haritası (`techIcon(label)`), yoksa jenerik
 */
export function TechIcon({
  icon,
  label,
  size = 18,
  className = '',
}: {
  icon?: string | null
  label?: string
  size?: number
  className?: string
}) {
  const value = (icon ?? '').trim()

  if (/^<svg[\s>]/i.test(value)) {
    return (
      <span
        aria-hidden
        className={`inline-block [&>svg]:block [&>svg]:h-full [&>svg]:w-full ${className}`}
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    )
  }

  if (/^(?:\/|https?:\/\/|data:image\/)/i.test(value)) {
    return (
      <img
        src={value}
        alt=""
        aria-hidden
        width={size}
        height={size}
        loading="lazy"
        className={`inline-block object-contain ${className}`}
      />
    )
  }

  if (/^[a-z0-9][a-z0-9-]*:[a-z0-9-]+$/i.test(value))
    return <Icon icon={value} width={size} height={size} className={className} />

  // Yerel harita (mevcut davranış) → jenerik ikon.
  return <>{techIcon(label ?? '') ?? <CodeIcon size={size} />}</>
}
