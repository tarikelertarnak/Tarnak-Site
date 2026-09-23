'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { AdSenseScript, AdSlotCard } from '@/components/ads/ad-slot'
import type { AdSlot, AdStats } from '@/lib/ads'

/**
 * /reklam sayfasinin istemci tarafi.
 *
 * Akis: GET /api/ads -> sunucu slot + imzali token verir
 *       -> geri sayim -> POST /api/ads -> sunucu gecen sureyi dogrular
 *       -> istatistik guncellenir.
 *
 * Sekme arka plana atilirsa sayac DURUR. Bu bilincli: "arka planda acik
 * birak, izlenmis sayilsin" davranisini engeller. Reklam aglari da boyle yapar.
 */

type Phase = 'loading' | 'idle' | 'running' | 'done' | 'error'

interface AdWatchProps {
  isEn?: boolean
}

export function AdWatch({ isEn = false }: AdWatchProps) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [slot, setSlot] = useState<AdSlot | null>(null)
  const [token, setToken] = useState('')
  const [remaining, setRemaining] = useState(0)
  const [duration, setDuration] = useState(15)
  const [stats, setStats] = useState<AdStats | null>(null)
  const [grid, setGrid] = useState<AdSlot[]>([])
  const [banners, setBanners] = useState<AdSlot[]>([])
  const [message, setMessage] = useState('')
  const [tabHidden, setTabHidden] = useState(false)
  const submitted = useRef(false)

  const t = useCallback((tr: string, en: string) => (isEn ? en : tr), [isEn])

  const load = useCallback(async () => {
    setPhase('loading')
    setMessage('')
    submitted.current = false
    try {
      const [oneRes, allRes, banRes] = await Promise.all([
        fetch('/api/ads?placement=ads-page', { cache: 'no-store' }),
        fetch('/api/ads?placement=ads-page&all=1', { cache: 'no-store' }),
        fetch('/api/ads?placement=banner&all=1', { cache: 'no-store' }),
      ])

      const one = await oneRes.json().catch(() => null)
      const all = await allRes.json().catch(() => null)
      const ban = await banRes.json().catch(() => null)

      if (!one?.ok || !one.slot) {
        setMessage(one?.message || t('Şu an gösterilecek reklam yok.', 'No ad available right now.'))
        setPhase('error')
        return
      }

      setSlot(one.slot)
      setToken(one.token)
      setDuration(one.slot.durationSeconds)
      setRemaining(one.slot.durationSeconds)
      setStats(one.stats ?? null)
      setGrid(Array.isArray(all?.slots) ? all.slots : [])
      setBanners(Array.isArray(ban?.slots) ? ban.slots : [])
      setPhase('idle')
    }
    catch {
      setMessage(t('Sunucuya ulaşılamadı.', 'Could not reach the server.'))
      setPhase('error')
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  // Sekme gorunurlugu — arka planda sayma
  useEffect(() => {
    const onVis = () => setTabHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Geri sayim
  useEffect(() => {
    if (phase !== 'running')
      return
    const id = setInterval(() => {
      if (document.visibilityState === 'hidden')
        return
      setRemaining(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [phase])

  const submit = useCallback(async () => {
    if (submitted.current)
      return
    submitted.current = true
    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, watchedSeconds: duration }),
      })
      const data = await res.json().catch(() => null)

      if (data?.stats)
        setStats(data.stats)

      if (data?.ok) {
        setPhase('done')
        return
      }

      // Token bayatladi (sayfa uzun sure acik kaldi). Burada kullaniciya
      // "izlemedin" demek yanlis olurdu — taze reklam + token hazirlayip
      // tekrar denemesini isteriz.
      if (data?.reason === 'expired') {
        await load()
        setMessage(t('Reklam oturumu yenilendi — lütfen tekrar başlat.', 'Ad session refreshed — please start again.'))
        return
      }

      setMessage(data?.message || t('Kayıt doğrulanamadı.', 'Could not verify the view.'))
      setPhase('error')
    }
    catch {
      setMessage(t('Bağlantı hatası.', 'Network error.'))
      setPhase('error')
    }
  }, [token, duration, t, load])

  // Sure dolunca sunucuya bildir
  useEffect(() => {
    if (phase === 'running' && remaining === 0)
      void submit()
  }, [phase, remaining, submit])

  const progress = duration > 0 ? ((duration - remaining) / duration) * 100 : 0
  const totalLabel = stats && stats.source === 'db' ? String(stats.totalViews) : '—'

  return (
    <div className="mx-auto w-full max-w-5xl">
      <AdSenseScript />

      {/* Baslik */}
      <div className="mb-6 text-center">
        <h1 className="inline-flex items-center gap-3 border-b-4 border-primary pb-3 text-2xl font-black uppercase tracking-tight text-primary sm:text-3xl lg:text-4xl">
          📺 {t('REKLAM İZLE — DESTEK OL', 'WATCH AN AD — SUPPORT')}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-foreground/65">
          {t(
            'Para harcamadan destek olmak istersen reklamları izleyebilirsin. Reklamlar yalnızca bu sayfada ve destek bölümünde gösterilir — sitenin geri kalanında reklam yoktur.',
            'If you want to support without spending money, you can watch ads. Ads appear only on this page and in the support section — the rest of the site has no ads.',
          )}
        </p>
      </div>

      {/* Istatistik seridi */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatBox
          label={t('Toplam izlenme', 'Total views')}
          value={totalLabel}
        />
        <StatBox
          label={t('Bugün', 'Today')}
          value={stats && stats.source === 'db' ? String(stats.todayViews) : '—'}
        />
        <StatBox
          label={t('Tamamlanan', 'Completed')}
          value={stats && stats.source === 'db' ? String(stats.completedViews) : '—'}
        />
      </div>

      {stats?.source === 'fallback' && (
        <p className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-center text-xs text-amber-500">
          {t(
            'Sayaç geçici olarak yerel modda: reklam tabloları henüz veritabanında oluşturulmadı. Şema uygulandığında bu sayaç kalıcı ve tüm ziyaretçiler için ortak olur.',
            'Counter is in local mode: the ad tables are not created in the database yet. Once the schema is applied this counter becomes persistent and shared across visitors.',
          )}
        </p>
      )}

      {/* Ust banner reklam */}
      {banners.length > 0 && (
        <div className="mb-6">
          <AdSlotCard slot={banners[0]} isEn={isEn} variant="banner" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Ana sahne */}
        <div className="flex flex-col gap-4 rounded-2xl border border-primary/25 bg-background/60 p-4 shadow-lg shadow-primary/5 sm:p-6">
          {phase === 'loading' && (
            <div className="flex min-h-[280px] items-center justify-center">
              <p className="text-sm text-foreground/55">{t('Reklam yükleniyor…', 'Loading ad…')}</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center">
              <span className="text-3xl">😕</span>
              <p className="text-sm text-foreground/70">{message}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-lg border border-foreground-200/20 px-4 py-2 text-sm text-foreground/80 transition-colors hover:border-primary/40"
              >
                {t('Tekrar dene', 'Try again')}
              </button>
            </div>
          )}

          {(phase === 'idle' || phase === 'running' || phase === 'done') && slot && (
            <>
              <AdSlotCard
                slot={slot}
                isEn={isEn}
                variant="stage"
                className="border-primary/20"
              />

              {phase === 'idle' && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => { submitted.current = false; setPhase('running') }}
                    className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
                  >
                    ▶ {t('Reklamı başlat', 'Start the ad')} · {duration}s
                  </button>
                  {message && (
                    <p className="text-center text-xs text-amber-500">{message}</p>
                  )}
                </div>
              )}

              {phase === 'running' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-primary/30 text-lg font-black text-primary">
                      {remaining}
                    </div>
                    <p className="min-w-0 flex-1 text-xs text-foreground/65">
                      {tabHidden
                        ? t('⏸ Sekme arka planda — sayaç durdu. Devam etmek için bu sekmeye dön.', '⏸ Tab is in background — timer paused. Return to this tab to continue.')
                        : t('Reklam oynatılıyor… lütfen bitmesini bekle. Teşekkürler!', 'Ad is playing… please wait. Thank you!')}
                    </p>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-foreground-200/15">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setRemaining(duration); setPhase('idle') }}
                    className="self-center text-xs text-foreground/50 underline-offset-2 hover:underline"
                  >
                    {t('İptal', 'Cancel')}
                  </button>
                </div>
              )}

              {phase === 'done' && (
                <div className="flex flex-col items-center gap-3 py-2 text-center">
                  <span className="text-4xl">🎉</span>
                  <p className="text-base font-semibold text-foreground">
                    {t('Teşekkürler! Destek oldun.', 'Thank you! You supported.')}
                  </p>
                  <button
                    type="button"
                    onClick={() => void load()}
                    className="rounded-lg border border-foreground-200/20 px-5 py-2 text-sm text-foreground/80 transition-colors hover:border-primary/40"
                  >
                    {t('Başka reklam izle', 'Watch another ad')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Yan sutun reklamlari */}
        <div className="flex flex-col gap-4">
          {grid.slice(0, 2).map(s => (
            <AdSlotCard key={`side-${s.id}`} slot={s} isEn={isEn} variant="grid" />
          ))}
        </div>
      </div>

      {/* Izgara — "her yerde reklam" */}
      {grid.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-foreground/40">
            {t('Sponsorlar', 'Sponsors')}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map(s => (
              <AdSlotCard key={`grid-${s.id}`} slot={s} isEn={isEn} variant="grid" />
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-foreground/45">
        {t(
          'Destek olmak istemiyorsan bu sayfayı kapatabilirsin — site tamamen ücretsiz ve reklamsız çalışmaya devam eder.',
          'If you don\'t want to support, you can close this page — the site stays completely free and works without ads.',
        )}
      </p>
    </div>
  )
}

function StatBox({ label, value }: { label: string, value: string }) {
  return (
    <div className="rounded-xl border border-foreground-200/12 bg-background/60 px-3 py-3 text-center">
      <p className="text-lg font-black text-primary sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
        {label}
      </p>
    </div>
  )
}
