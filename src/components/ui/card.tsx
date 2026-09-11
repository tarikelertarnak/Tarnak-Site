'use client'

import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

export function Card({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <div className={cn('flex flex-col relative overflow-hidden rounded-2xl bg-background', className)}>
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

export function CardBody({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <div className={cn('relative flex flex-1 w-full p-3 flex-col h-auto break-words text-left', className)}>
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
