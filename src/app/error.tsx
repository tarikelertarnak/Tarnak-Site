'use client'

import { useT } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useT()

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-5 px-4 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={64} height={64} fill="currentColor" className="text-danger/80">
        <path d="M12.884 2.532c-.346-.654-1.422-.654-1.768 0l-9 17A1 1 0 0 0 3 21h18a.998.998 0 0 0 .883-1.467zM13 18h-2v-2h2zm-2-4V9h2l.001 5z"/>
      </svg>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('error.title')}</h1>
        <p className="max-w-md text-sm sm:text-base text-foreground-500">
          {t('error.desc')}
        </p>
      </div>
      <Button color="primary" onPress={() => reset()} startContent={
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 16h5v5" />
        </svg>
      }>
        {t('error.retry')}
      </Button>
    </div>
  )
}
