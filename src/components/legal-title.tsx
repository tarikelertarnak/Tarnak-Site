'use client'

import { useT } from '@/components/locale-provider'

/**
 * Hukuki sayfa başlığı (2026-10-21).
 *
 * Ayrı istemci bileşeni: `LegalPage` bir sunucu bileşeni (`async`), `useT()`
 * yalnızca istemcide çalışır. Kök layout `force-static` olduğu için sunucu
 * her zaman TR basardı; bu bileşen başlığı aktif dile çevirir.
 */
export function LegalTitle({ i18nKey, fallback }: { i18nKey: string, fallback: string }) {
  const { t } = useT()
  return <>{t(i18nKey) || fallback}</>
}
