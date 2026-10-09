import type { Metadata } from 'next'

import { legalMetadata, LegalPage } from '@/components/legal-page'

export const dynamic = 'force-static'

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata(
    '/gizlilik',
    'Gizlilik Politikası',
    "TARNAK'ın gizlilik politikası ve veri işleme uygulamaları.",
  )
}

export default function GizlilikPage() {
  return (
    <LegalPage
      anahtar="privacy"
      varsayilanBaslik="Gizlilik Politikası"
      yol="/gizlilik"
    />
  )
}
