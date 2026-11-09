'use client'

/**
 * GitHub sahip sayfasının (`/github/[owner]`) çevrilen metinleri.
 *
 * NEDEN (2026-10-20): eski kod sunucuda `getLocale()` çağırıp `isEn` ile
 * dallanıyordu. İki ayrı hata birden:
 *  1. `getLocale()`/`cookies()` route'u DYNAMIC yapar → Workers Free 10 ms
 *     CPU bütçesi aşılır (1102 riski). Diğer public sayfalar bu yüzden
 *     `force-static`.
 *  2. Kök layout `force-static` olduğu için cookie BOŞ döner →
 *     `resolveLocale(undefined, undefined)` = 'en' → TR ziyaretçi İngilizce
 *     metin görüyordu (ters-hata).
 * Çözüm: sunucu verisiz kalsın, metin istemcide `t()` ile çözülsün.
 * Bkz. wiki/concepts/i18n-ssr-sabit-locale-tuzagi.
 */
import { useT } from '@/components/locale-provider'

export function OwnerSoon({ owner }: { owner: string }) {
  const { t } = useT()
  return <>{t('gh.ownerSoon').replace('{owner}', owner)}</>
}

export function OpenGitHub() {
  const { t } = useT()
  return <>{t('gh.openGitHub')}</>
}
