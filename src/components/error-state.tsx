'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { useT } from '@/components/locale-provider'
import { cn } from '@/components/ui/cn'
import { CheckIcon, ChevronDownIcon, CopyIcon, FileQuestionIcon } from '@/components/ui/icons'
import { Link } from '@/components/ui/link'
import { copyText } from '@/lib/clipboard'

/**
 * Hata durumu — "sayfa bulunamadi" / "veri yuklenemedi" gibi durumlar icin
 * ortak gorsel.
 *
 * Tarık'in istedigi duzen:
 *  1. Ustte BUYUK bir `file-question` ikonu (IconPark outline).
 *  2. Kisa hata mesaji.
 *  3. Butonlar: "Projelere Göz At", "GitHub Explorer'a Git →", "Yenile".
 *  4. En altta ACILIR hata kutusu:
 *     - Ustte TAB gibi bir baslik: "Hata ..." + Kopyala butonu + ASAĞI ok
 *     - Oka tiklayinca ok YUKARI doner ve altindaki kutu acilir
 *     - Kutu bir TEXTAREA ve hata orada gorunur
 */

export function ErrorDetails({
  error,
  details,
}: {
  error: string
  /** Teknik ayrintilar (istek url'si, HTTP kodu, yigin...) — varsa eklenir. */
  details?: string
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  // Textarea'da gosterilecek TAM metin: mesaj + teknik ayrintilar.
  const full = [error, details].filter(Boolean).join('\n\n')

  const onCopy = async () => {
    const ok = await copyText(full)
    setCopied(ok)
    if (ok) {
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-danger/25">
      {/* TAB gibi duran baslik satiri */}
      <div className="flex items-center gap-2 bg-danger/5 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-label={open ? t('error.hide') : t('error.show')}
          className="flex shrink-0 items-center gap-1.5 text-danger outline-none"
        >
          <ChevronDownIcon
            size={15}
            className={cn('transition-transform duration-200', open && 'rotate-180')}
          />
          <span className="text-xs font-bold uppercase tracking-[0.08em]">
            {t('error.tab')}
          </span>
        </button>

        <span className="min-w-0 flex-1 truncate text-[11px] text-foreground-500">
          {error}
        </span>

        <button
          type="button"
          onClick={() => void onCopy()}
          aria-label={t('error.copy')}
          title={copied ? t('error.copied') : t('error.copy')}
          className={cn(
            'flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
            copied
              ? 'border-success-300 bg-success-50 text-success'
              : 'border-foreground-200/20 text-foreground-500 hover:border-danger/40 hover:text-danger',
          )}
        >
          {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
          {copied ? t('error.copied') : t('error.copy')}
        </button>
      </div>

      {/* Acilan kutu — TEXTAREA */}
      {open && (
        <div className="border-t border-danger/25 p-2">
          <textarea
            readOnly
            value={full}
            aria-label={t('error.label')}
            spellCheck={false}
            className="h-40 w-full resize-y rounded-lg border border-foreground-200/15 bg-background p-2.5 font-mono text-[11px] leading-relaxed text-foreground-500 outline-none focus:border-danger/40"
          />
        </div>
      )}
    </div>
  )
}

export function ErrorState({
  error,
  details,
  onRetry,
  retrying,
  children,
  iconSize = 96,
}: {
  error: string
  details?: string
  /** "Yenile" butonu — verilmezse buton gorunmez. */
  onRetry?: () => void
  retrying?: boolean
  /** Ek butonlar / icerik (opsiyonel). */
  children?: ReactNode
  iconSize?: number
}) {
  const { t } = useT()

  return (
    <div className="flex w-full flex-col items-center gap-5 px-4 py-10 text-center">
      <FileQuestionIcon size={iconSize} className="text-primary/80" />

      <p className="max-w-md text-sm font-medium text-foreground sm:text-base">
        {error}
      </p>

      {/* Butonlar: Projelere Göz At / GitHub Explorer'a Git → / Yenile */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-4 py-2 text-sm font-medium text-primary no-underline transition-colors hover:bg-primary/10"
        >
          {t('notFound.projects')}
        </Link>

        <Link
          href="/github"
          className="inline-flex items-center gap-1.5 rounded-lg border border-foreground-200/20 px-4 py-2 text-sm font-medium text-foreground/85 no-underline transition-colors hover:border-primary/40 hover:text-primary"
        >
          {t('notFound.explorer')}
        </Link>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <svg
              viewBox="0 0 24 24"
              width={15}
              height={15}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={cn(retrying && 'animate-spin')}
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            {retrying ? t('error.retrying') : t('error.retry')}
          </button>
        )}
      </div>

      {children}

      <ErrorDetails error={error} details={details} />
    </div>
  )
}
