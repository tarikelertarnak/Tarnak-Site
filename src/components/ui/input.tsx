'use client'

import type { KeyboardEvent, ReactNode } from 'react'
import { useState } from 'react'
import { Input as LobeInput } from '@lobehub/ui/base-ui'
import { cn } from '@/components/ui/cn'
import { EyeIcon, EyeOffIcon } from '@/components/ui/icons'
import { useT } from '@/components/locale-provider'

export interface InputProps {
  'label'?: string
  'type'?: string
  'variant'?: 'faded' | 'bordered' | 'flat' | 'underlined'
  'value': string
  'onValueChange'?: (value: string) => void
  'onChange'?: (e: React.ChangeEvent<HTMLInputElement>) => void
  'isInvalid'?: boolean
  'errorMessage'?: ReactNode
  'required'?: boolean
  'maxLength'?: number
  'placeholder'?: string
  'size'?: 'sm' | 'md' | 'lg'
  'onKeyDown'?: (e: KeyboardEvent<HTMLInputElement>) => void
  'startContent'?: ReactNode
  'endContent'?: ReactNode
  'className'?: string
  'classNames'?: Record<string, string>
  'aria-label'?: string
  'autoComplete'?: string
  'inputRef'?: React.Ref<HTMLInputElement>
}

export function Input({
  label,
  type = 'text',
  variant = 'faded',
  value,
  onValueChange,
  onChange,
  isInvalid,
  errorMessage,
  required,
  maxLength,
  placeholder,
  size,
  onKeyDown,
  startContent,
  endContent,
  className,
  classNames: _classNames,
  'aria-label': ariaLabel,
  autoComplete,
  inputRef,
  ...rest
}: InputProps) {
  const { t } = useT()
  const isPassword = type === 'password'
  const [showPassword, setShowPassword] = useState(false)
  const inputVariant = variant === 'bordered' ? 'outlined' : 'filled'
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      {label && (
        <label className="text-xs sm:text-sm text-foreground-500">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <LobeInput
        {...rest}
        ref={inputRef}
        type={effectiveType}
        variant={inputVariant}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          onChange?.(e)
          onValueChange?.(e.target.value)
        }}
        maxLength={maxLength}
        placeholder={placeholder}
        size={size === 'lg' ? 'large' : size === 'sm' ? 'small' : 'middle'}
        onKeyDown={onKeyDown}
        prefix={startContent}
        suffix={
          isPassword ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((s) => !s)}
              aria-label={
                showPassword ? t('auth.hidePassword') : t('auth.showPassword')
              }
              className="text-foreground/60 transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
            </button>
          ) : (
            endContent
          )
        }
        aria-label={ariaLabel}
        autoComplete={autoComplete}
        data-invalid={isInvalid ? '' : undefined}
      />
      {isInvalid && errorMessage && (
        <p className="text-xs text-danger">{errorMessage}</p>
      )}
    </div>
  )
}