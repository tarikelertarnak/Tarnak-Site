import type { BreadcrumbItem } from '@/lib/breadcrumb'
import { siteUrl } from '@/lib/site-url'

/**
 * Breadcrumb arayüzü + BreadcrumbList JSON-LD (Faz 2 · SEO 2)
 *
 * İKİ ŞEYİ TEK YERDE ÜRETİR:
 *  1) Ekranda görünen navigasyon (tıklanabilir `Link`'ler).
 *  2) `<script type="application/ld+json">` içinde `BreadcrumbList`.
 * Ayrı ayrı yazılırsa ikisi zamanla ayrışır (görselde yeni bir kırıntı
 * eklenir ama JSON-LD unutulur) — arama motoru breadcrumb'ı görmez.
 *
 * TASARIM: mevcut kart diliyle uyumlu, küçük, ikincil renkte.
 */
export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: siteUrl(item.href),
    })),
  }
  return (
    <script
      type="application/ld+json"
      // JSON-LD: içerik tamamen bizim string'lerimizden geliyor; `</script>`
      // enjeksiyonunu kapatmak için `>` kaçırılır.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  )
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  // Tek öğe varsa navigasyon anlamsız — basma.
  if (items.length < 2) return null

  return (
    <nav aria-label="Breadcrumb" className="w-full">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/50 sm:text-sm">
        {items.map((item, i) => {
          const son = i === items.length - 1
          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {son
                ? (
                    <span aria-current="page" className="font-medium text-foreground/80">
                      {item.label}
                    </span>
                  )
                : (
                    <a
                      href={item.href}
                      className="rounded transition-colors duration-200 hover:text-primary"
                    >
                      {item.label}
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