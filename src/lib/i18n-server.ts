import { getContent, type SiteContent } from '@/lib/content'
import type { Locale } from '@/lib/i18n'

/** Single-locale site: the locale is always Turkish. */
export async function getLocale(): Promise<Locale> {
  return 'tr'
}

/**
 * Content localization — Turkish-only.
 *
 * data/content.json IS the single source of truth (Turkish); the old
 * tr/en overlay layer was removed when the site was locked to one locale.
 */
export function localizeContent(content: SiteContent, _locale: Locale): SiteContent {
  return content
}

/** Server components: localized content (identical to raw content here). */
export async function getLocalizedContent(): Promise<SiteContent> {
  return getContent()
}