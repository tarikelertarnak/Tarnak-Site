import { Icon } from '@iconify/react'

/**
 * Sekme şeridi etiketi (ikon + metin).
 *
 * Tek kaynak: hem üst sekme şeridi (`AdminPanel`) hem `DataManager` içindeki
 * kaynak şeridi aynı görünsün diye ayrı bileşen (2026-10-13).
 */
export function TabLabel({ icon, text }: { icon: string, text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon icon={icon} width={15} height={15} />
      {text}
    </span>
  )
}
