'use client'

/**
 * Dile göre çözülen hero metinleri (2026-10-20, kullanıcı isteği).
 *
 * SORUN: kök layout `force-static` + `getStaticLocale()` sabit 'tr' olduğu
 * için sunucu hero'yu HER ZAMAN Türkçe basıyordu. Admin panelde EN/DE metin
 * girip kaydetse bile public sitede görünmezdi — "Kaydedildi" yalanı olurdu.
 *
 * ÇÖZÜM: `content.hero.i18n[alan][dil]` değeri istemcide seçili dile göre
 * okunur. Öncelik: `i18n[dil]` > sunucu prop (TR tabanı/overlay) > boş.
 * Admin hiç girmemişse davranış bugünküyle AYNEN aynı (sıfır regresyon).
 *
 * Bkz. vault/multipleagent/site/outbox/architect-i18n-admin.md
 */
import type { HeroI18n, HeroI18nKey } from '@/lib/content'
import { useT } from '@/components/locale-provider'

/** `hero.i18n[alan][seçili dil]` — yoksa `fallback` (sunucu tabanı). */
export function useHeroText() {
  const { locale } = useT()
  return (i18n: HeroI18n | undefined, key: HeroI18nKey, fallback: string) => {
    const byLocale = i18n?.[key]
    const v = byLocale?.[locale] ?? byLocale?.[locale.split('-')[0]]
    return typeof v === 'string' && v.trim() ? v : fallback
  }
}
