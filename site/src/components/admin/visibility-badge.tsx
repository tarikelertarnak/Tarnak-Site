'use client'

export function VisibilityBadge({ hidden }: { hidden: boolean }) {
  if (!hidden)
return null
  return (
    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
      Gizli
    </span>
  )
}
