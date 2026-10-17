'use client'

import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'

export interface RowActionsProps {
  onEdit: () => void
  editDisabled?: boolean
  editLabel?: string
  extra?: React.ReactNode
  className?: string
}

export function RowActions({
  onEdit,
  editDisabled,
  editLabel,
  extra,
  className,
}: RowActionsProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <Button
        size="sm"
        variant="bordered"
        isDisabled={editDisabled}
        onPress={onEdit}
        startContent={<Icon icon="mdi:pencil" width={16} height={16} />}
      >
        {editLabel || 'Düzenle'}
      </Button>
      {extra}
    </div>
  )
}
