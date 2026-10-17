'use client'

import { cn } from '@/components/ui/cn'
import { Switch } from '@/components/ui/switch'

export interface VisibilitySwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  ariaLabel?: string
  className?: string
}

export function VisibilitySwitch({
  checked,
  onChange,
  disabled,
  ariaLabel,
  className,
}: VisibilitySwitchProps) {
  return (
    <Switch
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      ariaLabel={ariaLabel}
      className={cn('flex-shrink-0', className)}
    />
  )
}
