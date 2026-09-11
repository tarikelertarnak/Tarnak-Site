'use client'

import type { ReactNode } from 'react'
import { TextArea as LobeTextArea } from '@lobehub/ui/base-ui'
import { cn } from '@/components/ui/cn'

export interface TextareaProps {
  label?: string
  variant?: 'faded' | 'bordered' | 'flat' | 'underlined'
  value: string
  onValueChange?: (value: string) => void
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  isInvalid?: boolean
  errorMessage?: ReactNode
  required?: boolean
  minRows?: number
  maxRows?: number
  placeholder?: string
  className?: string
  classNames?: Record<string, string>
  inputRef?: React.Ref<HTMLTextAreaElement>
}

export function Textarea({
  label,
  variant = 'faded',
  value,
  onValueChange,
  onChange,
  isInvalid,
  errorMessage,
  required,
  minRows = 3,
  maxRows,
  placeholder,
  className,
  classNames: _classNames,
  inputRef,
  ...rest
}: TextareaProps) {
  const inputVariant = variant === 'bordered' ? 'outlined' : 'filled'
  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {label && (
        <label className="text-foreground-500 text-xs sm:text-sm">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <LobeTextArea
        {...rest}
        ref={inputRef}
        variant={inputVariant}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          onChange?.(e)
          onValueChange?.(e.target.value)
        }}
        autoSize={{ minRows, maxRows }}
        placeholder={placeholder}
        data-invalid={isInvalid ? '' : undefined}
      />
      {isInvalid && errorMessage && (
        <p className="text-xs text-danger">{errorMessage}</p>
      )}
    </div>
  )
}
