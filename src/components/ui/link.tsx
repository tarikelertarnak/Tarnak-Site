'use client'

import type { MouseEvent, ReactNode } from 'react'
import NextLink from 'next/link'

export interface LinkProps {
  href: string
  children?: ReactNode
  className?: string
  target?: string
  rel?: string
  onPress?: () => void
  ariaLabel?: string
}

export function Link({ href, children, className, target, rel, onPress, ariaLabel }: LinkProps) {
  const internal = href.startsWith('/') && !href.startsWith('//')

  const handleClick = (e: MouseEvent) => {
    if (onPress) {
      e.preventDefault()
      onPress()
    }
  }

  if (internal && !target) {
    return (
      <NextLink href={href} className={className} aria-label={ariaLabel} onClick={handleClick}>
        {children}
      </NextLink>
    )
  }

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={className}
      aria-label={ariaLabel}
      onClick={handleClick}
    >
      {children}
    </a>
  )
}
