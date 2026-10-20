import type { Metadata } from 'next'

import { legalMetadata, LegalPage } from '@/components/legal-page'

export const dynamic = 'force-static'

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata(
    '/kvkk',
    'KVKK Aydınlatma Metni',
    '6698 sayılı KVKK kapsamında kişisel verilerin işlenmesi hakkında aydınlatma metni.',
  )
}

export default function KvkkPage() {
  return (
    <LegalPage
      anahtar="kvkk"
      varsayilanBaslik="KVKK Aydınlatma Metni"
      yol="/kvkk"
    />
  )
}
