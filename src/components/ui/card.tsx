'use client'

import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

export function Card({ children, className }: { children: ReactNode, className?: string }) {
  // İÇ KART (surface-2): `bg-background` token'ı artık surface-2'yi okuyor,
  // yani kart üstündeki dış gruptan (surface-1) bir katman açıkta.
  // `border-surface-border` hover OLMADAN da kartın çizgisini görünür
  // kılar — aksi halde kart ancak üzerine gelince ayrışıyordu (2026-10-05).
  return (
    <div
      className={cn(
        'flex flex-col relative overflow-hidden rounded-2xl border border-surface-border bg-background transition-colors hover:border-primary/40',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <div className={cn('flex p-3 z-10 w-full justify-start items-center shrink-0', className)}>
      {children}
    </div>
  )
}

export function CardBody({ children, className, ...rest }: { children: ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  // `...rest`: auth-form `id`/`role`/`aria-labelledby` geçiriyor (tabpanel).
  // Tip daraltılırsa burası TS2322 veriyordu — HTMLAttributes ile esnetildi.
  return (
    <div
      {...rest}
      className={cn('relative flex flex-1 w-full p-3 flex-col h-auto break-words text-left', className)}
    >
      {children}
    </div>
  )
}

export function CardFooter({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <div className={cn('p-3 h-auto flex w-full items-center', className)}>
      {children}
    </div>
  )
}
