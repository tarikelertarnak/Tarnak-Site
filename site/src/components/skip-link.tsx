'use client'

import { useT } from '@/components/locale-provider'

export function SkipLink() {
  const { t } = useT()

  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded focus:bg-primary focus:px-3 focus:py-1.5 focus:text-primary-foreground"
    >
      {t('common.skipToContent')}
    </a>
  )
}
