'use client'

import type { SiteContent } from '@/lib/content'

import { useEffect, useState } from 'react'

import { SettingsModal } from '@/components/settings-dropdown'

/**
 * Navigation wrapper — SettingsModal (drawer). The TopBar emits
 * `settings:open` events which the SettingsModal listens to.
 * Sidebar now lives in the root layout (openable on every page).
 */
export function Navigation({ content }: { content: SiteContent }) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const onSettings = () => setSettingsOpen(true)
    window.addEventListener('settings:open', onSettings)
    return () => window.removeEventListener('settings:open', onSettings)
  }, [])

  return (
    <SettingsModal
      githubUsername={content.settings.githubUsername}
      open={settingsOpen}
      onOpenChange={setSettingsOpen}
    />
  )
}
