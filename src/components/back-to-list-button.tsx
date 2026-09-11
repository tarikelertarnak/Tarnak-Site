'use client'

import { Icon } from '@iconify/react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { usePreviousListPath } from '@/lib/use-previous-list-path'
import { useLocale } from '@/components/locale-provider'

interface LabelCtx {
  isEn: boolean
}

/** Path → short, user-friendly label. */
function pathLabel(path: string, isEn: boolean): string {
  if (path === '/') return isEn ? 'Home' : 'Ana sayfa'
  if (path.startsWith('/projects')) return isEn ? 'Projects' : 'Projeler'
  if (path.startsWith('/blog')) return 'Blog'
  if (path.startsWith('/github')) return 'GitHub'
  if (path.startsWith('/chat')) return isEn ? 'Chat' : 'Sohbet'
  return path
}

/**
 * "Go Back" button shown at the top of detail pages.
 * - usePreviousListPath: returns to the list page
 * - Falls back to / when there is no list
 * - Shows the target in parentheses (e.g. "Go Back (Blog)")
 */
export function BackToListButton({ fallback = '/' }: { fallback?: string }) {
  const router = useRouter()
  const { previous } = usePreviousListPath()
  const { locale } = useLocale()
  const isEn = locale === 'en'
  const target = previous ?? fallback
  const label = pathLabel(target, isEn)

  return (
    <Button
      size="sm"
      variant="bordered"
      color="default"
      onPress={() => router.push(target)}
      startContent={<Icon icon="solar:arrow-left-bold-duotone" width={16} height={16} />}
      className="self-start"
    >
{isEn ? 'Go Back' : 'Geri Gel'}
      {' '}
      <span className="text-foreground-500">
        (
        {label}
        )
      </span>
    </Button>
  )
}
