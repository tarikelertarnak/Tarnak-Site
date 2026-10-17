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
  'download'?: boolean
  'as'?: 'a' | 'button' | ComponentType<unknown> | string
}

/**
 * `solid` + `primary` butonun görünümü — TEK kaynak (2026-10-17).
 *
 * NEDEN: hero/split butonları (`hero-button-style.ts`) `border-primary-fg`
 * çerçevesi ve `rounded-md` (8px) köşesiyle çizilirken LobeButton tabanlı
 * butonlar CANLI ÖLÇÜMDE (CDP, koyu tema) `border-width: 0px` ve
 * `border-radius: 0px` çıkıyordu — aynı sayfada iki farklı buton dili.
 * Kullanıcının istediği referans hero dili: mavi zemin + zıt renk (açık
 * temada siyah, koyu temada beyaz) 1px kenarlık.
 *
 * Kayma YOK: kenarlık ve radius her durumda sabittir, hover/active yalnızca
 * renk değiştirir (`hover:!bg-primary/90`). Geometriye dokunan hover
 * utility'si (translate/scale/h-/py-/border-2) BİLEREK yok.
 *
 * `isIconOnly` istisnası: ikon butonları `shape="circle"` ile yuvarlak
 * kalır — `!rounded-md` onların şeklini bozardı.
 */
export function primarySolidClass(isIconOnly = false): string {
  return [
    '!bg-primary !text-primary-fg !opacity-100 !border !border-primary-fg',
    'hover:!bg-primary/90 dark:!bg-primary/80 dark:hover:!bg-primary/70',
    isIconOnly ? '' : '!rounded-md',
  ]
    .filter(Boolean)
    .join(' ')
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
  //
  // `!text-primary-fg` (was `!text-white`): user asked for BLACK text and
  // black icons on these buttons in light theme. The utility resolves to
  // `var(--tprimary-fg)` — black in light, white in dark (black text on a
  // dark blue button would be unreadable). Koyu temada `dark:` varyantı
  // gerekmiyor çünkü token zaten tema ile değişiyor.
  const masterClass
    = variant === 'solid' && color === 'primary'
      ? primarySolidClass(isIconOnly)
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

  /**
   * Buton yüksekliği TEK bir sabit: 40px (`h-10`). `size` yalnızca yazı tipi
   * ve iç boşluğu değiştirir, yüksekliği ASLA — 30 `size="sm"` çağrısı vardı
   * ve yükseklikler çağrıdan çağrıya kayıyordu.
   *
   * `!` ile zorlanır: Tailwind'de aynı katmandaki iki sınıfın çelişmesi
   * attribute sırasına değil CSS çıktı sırasına bakar, yani çağıran
   * `h-9`/`h-12` yazsa bile `!h-10` kazanır. Genişlik metin uzunluğuna göre
   * serbest kalır (kullanıcı isteği: genişlik farklı olabilir).
   *
   * 44px -> 40px: kullanıcı butonları "biraz daha küçük" istedi. 40px hâlâ
   * erişilebilir dokunma hedefi (>=40px) eşiğinde; split butonların
   * yarıları da tam bu yükseklikte birleşiyor.
   */
  const heightClass = isIconOnly ? '!h-10 !w-10' : '!h-10'

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
      className={[heightClass, masterClass, outlineClass, className].filter(Boolean).join(' ')}
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
