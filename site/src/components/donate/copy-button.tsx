'use client'

import { useState } from 'react'
import { useT } from '@/components/locale-provider'
import { cn } from '@/components/ui/cn'
import { CheckIcon, CopyIcon } from '@/components/ui/icons'

/**
 * Address/URL copy button. On click it writes to the clipboard and shows a
 * confirmation icon for 2 seconds.
 */
export function CopyButton({ text, className }: { text: string, className?: string }) {
  const { t } = useT()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    catch {
      /* noop */
    }
  }

  const copiedLabel = copied
    ? t('donate.copied')
    : t('donate.copy')

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copiedLabel}
      title={copiedLabel}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-foreground-200/15 bg-background text-foreground/70 transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary sm:w-auto sm:gap-1.5 sm:px-3',
        copied && 'border-success/40 text-success',
        className,
      )}
    >
      {copied
        ? (
            <CheckIcon size={16} />
          )
        : (
            <CopyIcon size={16} />
          )}
      <span className="hidden text-xs font-medium sm:inline">
        {copiedLabel}
      </span>
    </button>
  )
}
