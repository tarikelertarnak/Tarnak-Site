'use client'

/**
 * GitHub repo sayfasının (`/github/[owner]/[repo]`) çevrilen metinleri.
 *
 * NEDEN İSTEMCİ (2026-10-20): kök layout `force-static` + `getStaticLocale()`
 * sabit 'tr' → sunucu bu metinleri hep Türkçe basıyordu; EN ziyaretçi
 * "Canlı demo", "Vaka çalışması", "Problem", "Çözüm", "Sonuç",
 * "Kullanılan teknolojiler" gibi başlıkları kalıcı Türkçe görüyordu.
 * Mimari karar: wiki/concepts/i18n-ssr-sabit-locale-tuzagi.
 */
import { useT } from '@/components/locale-provider'

/** Tek bir çevrilmiş metin düğümü — `<T k="repo.liveDemo" />`. */
export function T({ k }: { k: string }) {
  const { t } = useT()
  return <>{t(k)}</>
}

/** Bölüm başlığı — `SectionTitle` ile AYNI görsel dil, ama çevrilebilir. */
export function RepoSectionTitle({ k }: { k: string }) {
  const { t } = useT()
  return (
    <h2 className="border-b-2 border-primary pb-2 text-sm font-bold uppercase tracking-wide text-primary">
      {t(k)}
    </h2>
  )
}

/** Vaka çalışması bölümü: alt başlıklar + boş durum. */
export function RepoCaseStudy({
  summary,
  problem,
  solution,
  outcome,
}: {
  summary?: string
  problem?: string
  solution?: string
  outcome?: string
}) {
  const { t } = useT()
  const bos = !summary && !problem && !solution && !outcome

  const bloklar = [
    { baslik: t('repo.summary'), metin: summary },
    { baslik: t('repo.problem'), metin: problem },
    { baslik: t('repo.solution'), metin: solution },
    { baslik: t('repo.outcome'), metin: outcome },
  ].filter(b => b.metin)

  return (
    <div className="mt-6 space-y-6">
      {bloklar.map(b => (
        <section key={b.baslik}>
          <h3 className="text-base font-semibold">{b.baslik}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">
            {b.metin}
          </p>
        </section>
      ))}

      {bos && (
        <div className="rounded-xl border border-foreground/10 p-5">
          <p className="text-sm text-foreground/60">
            {t('repo.caseStudyEmpty')}
          </p>
        </div>
      )}
    </div>
  )
}
