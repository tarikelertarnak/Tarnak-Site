import { DonateContent } from '@/components/donate/donate-content'
import { t } from '@/lib/i18n'

// 2026-10-03: ISR KALDIRILDI. revalidate=300 incremental cache (KV) her render'da bir OKUMA+YAZMA yapiyordu; Workers Free 10 ms CPU limitinde bu I/O worker'i asiliyordu (/donate 20 sn+ sonsuz timeout, bazen 200). Sayfa artik tam statik: KV yok, render yok. Admin icerik degisikligi deploy ile yayinlanir.
export const dynamic = 'force-static'

// Sunucuda kalan metadata sabit TR'dir (getStaticLocale 'tr' → SEO sinyali Turkce).
export function generateMetadata() {
  const locale = 'tr' as const
  // <title> sabit Ingilizce (2026-10-30, kullanici listesi).
  const title = 'Support — TARIK ELER - TARNAK'
  return {
    title,
    description: t(locale, 'donate.description'),
    alternates: { canonical: '/donate' },
    openGraph: {
      title,
      description: t(locale, 'donate.ogDescription'),
      url: '/donate',
      type: 'website',
    },
  }
}

export default function DonatePage() {
  return <DonateContent />
}
