'use client'

import type { BreadcrumbItem, CrumbsI18n } from '@/lib/breadcrumb'
import { useT } from '@/components/locale-provider'
import { siteUrl } from '@/lib/site-url'

/**
 * BreadcrumbList JSON-LD (sunucu — SEO bilinçli sınır, TR kalır).
 *
 * Görünen `Breadcrumb` artık `CrumbsI18n` (labelKey) alıyor; JSON-LD
 * ise çözülmüş `BreadcrumbItem` bekler. Çağıran `resolveCrumbs` ile
 * çevirir (statik TR).
 */
export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, i) => ({
      '@type': 'ListItem',
      'position': i + 1,
      'name': item.label,
      'item': siteUrl(item.href),
    })),
  }
  return (
    <script
      type="application/ld+json"
      // JSON-LD: içerik tamamen bizim string'lerimizden geliyor; `</script>`
      // enjeksiyonunu kapatmak için `>` kaçırılır.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  )
}

/** `labelKey` → görünen etiket. `__raw:` ön ekli değer kullanıcı verisidir. */
function labelOf(item: CrumbsI18n, t: (k: string) => string): string {
  return item.labelKey.startsWith('__raw:')
    ? item.labelKey.slice(6)
    : t(item.labelKey)
}

export function Breadcrumb({ items }: { items: CrumbsI18n[] }) {
  const { t } = useT()

  // Tek öğe varsa navigasyon anlamsız — basma.
  if (items.length < 2)
    return null

  return (
    <nav aria-label="Breadcrumb" className="w-full">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/50 sm:text-sm">
        {items.map((item, i) => {
          const son = i === items.length - 1
          return (
            <li key={`${item.href}#${i}`} className="flex items-center gap-1.5">
              {son ? (
                <span
                  aria-current="page"
                  className="font-medium text-foreground/80"
                >
                  {labelOf(item, t)}
                </span>
              ) : (
                <a
                  href={item.href}
                  className="rounded transition-colors duration-200 hover:text-primary"
                >
                  {labelOf(item, t)}
                </a>
              )}
              {!son && (
                <span aria-hidden className="text-foreground/30">
                  /
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/** Ana sayfa için standart crumb zinciri. Sayfa özel `override` verebilir. */
export function homeCrumbs(
  t: (k: string) => string,
  override?: BreadcrumbItem[],
): BreadcrumbItem[] {
  return override ?? [{ label: t('nav.home'), href: '/' }]
}
