'use client'

import type { ButtonType } from '@lobehub/ui/base-ui'
import type { ComponentType, MouseEvent, ReactNode } from 'react'
import { Button as LobeButton } from '@lobehub/ui/base-ui'

type ButtonColor = 'primary' | 'danger' | 'default' | 'success' | 'warning'
type ButtonVariant = 'solid' | 'bordered' | 'light' | 'faded' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  'children'?: ReactNode
  'color'?: ButtonColor
  'variant'?: ButtonVariant
  'size'?: ButtonSize
  'isIconOnly'?: boolean
  'isLoading'?: boolean
  'isDisabled'?: boolean
  'startContent'?: ReactNode
  'endContent'?: ReactNode
  'onPress'?: () => void
  'onClick'?: (e: MouseEvent<HTMLElement>) => void
  'type'?: 'button' | 'submit' | 'reset'
  'href'?: string
  'target'?: string
  'rel'?: string
  'className'?: string
  'aria-label'?: string
  'block'?: boolean
  'as'?: 'a' | 'button' | ComponentType<unknown> | string
}

export function Button({
  children,
  color = 'default',
  variant = 'solid',
  size = 'md',
  isIconOnly,
  isLoading,
  isDisabled,
  startContent,
  endContent,
  onPress,
  onClick,
  type = 'button',
  href,
  target,
  rel,
  className,
  block,
  'aria-label': ariaLabel,
  as: _as,
  ...rest
}: ButtonProps) {
  const danger = color === 'danger'
  let btnVariant: ButtonType = 'default'

  if (variant === 'light') {
    btnVariant = 'text'
  }
  else if (variant === 'faded') {
    btnVariant = 'fill'
  }
  else if (color === 'primary') {
    btnVariant = 'primary'
  }

  // Master style: all primary solid buttons share ONE look — the site's blue
  // (--primary). Previously they were forced to light gray + black text, which
  // clashed with the blue icons and made the nav CTAs look like a different
  // component. !important overrides LobeButton's soft blue.
  const masterClass
    = variant === 'solid' && color === 'primary'
      ? '!bg-primary !text-white !opacity-100 hover:!bg-primary/90 dark:!bg-primary/80 dark:hover:!bg-primary/70'
      : ''

  // Force the text/border color so bordered/ghost buttons stay visible in light theme too.
  // LobeButton's ghost variant + default text color could disappear
  // in light mode (see the "invisible buttons" report).
  const outlineClass
    = variant === 'bordered' || variant === 'ghost'
      ? color === 'primary'
        ? '!text-primary !border-primary/40 hover:!bg-primary/10'
        : '!text-foreground !border-foreground/30 hover:!bg-foreground/5'
      : ''

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    onClick?.(e)
    onPress?.()
  }

  return (
    <LobeButton
      {...rest}
      type={btnVariant}
      danger={danger}
      ghost={variant === 'bordered' || variant === 'ghost'}
      size={size === 'lg' ? 'large' : size === 'sm' ? 'small' : 'middle'}
      shape={isIconOnly ? 'circle' : undefined}
      loading={isLoading}
      disabled={isDisabled}
      htmlType={type}
      href={href}
      target={target}
      rel={rel}
      className={[masterClass, outlineClass, className].filter(Boolean).join(' ')}
      block={block}
      aria-label={ariaLabel}
      onClick={handleClick}
      iconPosition={endContent ? 'end' : 'start'}
      icon={startContent || endContent || undefined}
    >
      {children}
    </LobeButton>
  )
}
