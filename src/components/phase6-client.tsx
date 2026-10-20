'use client'

/**
 * Ek bölüm sayfalarının (uses/now/changelog + hukuki) ORTAK istemci parçaları.
 *
 * NEDEN İSTEMCİ (2026-10-20): kök layout `force-static` + `getStaticLocale()`
 * sabit 'tr' olduğu için sunucu bu metinleri HER ZAMAN Türkçe basıyordu;
 * EN ziyaretçi boş durum kartlarında kalıcı Türkçe görüyordu. Mimari karar
 * (bkz. wiki/concepts/i18n-ssr-sabit-locale-tuzagi): sayfa gövdesindeki
 * metin istemciye taşınır → hydration sonrası sayfa tek dilde boyanır.
 * Sunucu tarafı yalnız VERİYİ taşır (başlık/içerik zaten kullanıcı verisi).
 */
import type { ReactNode } from 'react'
import type { LegalPage } from '@/lib/phase6'

import { useT } from '@/components/locale-provider'

/** Boş durum — içerik girilene kadar gösterilir. Çevrilmiş metin. */
export function Phase6EmptyClient({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-card/40 p-6 text-center">
      <p className="text-sm font-medium text-foreground/70">{title}</p>
      {children ? (
        <p className="mt-2 text-xs text-foreground/50">{children}</p>
      ) : null}
    </div>
  )
}

/** `uses`/`now`/`changelog` boş durumları — sözlükten. */
export function Phase6EmptyI18n({ kind }: { kind: 'uses' | 'now' | 'changelog' }) {
  const { t } = useT()
  return (
    <Phase6EmptyClient title={t(`${kind}EmptyTitle`)}>
      {t(`${kind}EmptyBody`)}
    </Phase6EmptyClient>
  )
}

/** Sayfa başlığı — veri varsa o, yoksa sözlükten varsayılan. */
export function Phase6Title({
  value,
  kind,
  labelKey,
}: {
  value?: string
  kind?: 'uses' | 'now' | 'changelog'
  /** Doğrudan sözlük anahtarı (ör. `now.learning`). `kind` yerine geçer. */
  labelKey?: string
}) {
  const { t } = useT()
  return <>{value || t(labelKey ?? `${kind}Title`)}</>
}

/** Hukuki sayfa gövdesi — çevrilmiş boş/taslak/güncelleme metinleri. */
export function LegalBodyClient({ page }: { page?: LegalPage }) {
  const { t } = useT()
  const paragraflar = (page?.body ?? '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)

  return (
    <div className="max-w-3xl">
      {page?.needsLegalReview ? (
        <p className="mb-6 rounded-xl border border-foreground/15 bg-card/40 p-4 text-xs text-foreground/60">
          {t('legalDraft')}
        </p>
      ) : null}
      {paragraflar.length === 0 ? (
        <p className="text-sm text-foreground/60">{t('legalEmpty')}</p>
      ) : (
        paragraflar.map((p, i) => (
          <p
            key={i}
            className="mb-4 whitespace-pre-line text-sm leading-relaxed text-foreground/75"
          >
            {p}
          </p>
        ))
      )}
      {page?.updated ? (
        <p className="mt-8 text-xs text-foreground/45">
          {t('legalUpdated')}
          {' '}
          {page.updated}
        </p>
      ) : null}
    </div>
  )
}
