'use client'

import type { AdSlot, AdStats } from '@/lib/ads'

import type { Locale } from '@/lib/i18n'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AdSenseScript, AdSlotCard } from '@/components/ads/ad-slot'
import { t as i18nT } from '@/lib/i18n'

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

  const locale: Locale = isEn ? 'en' : 'tr'
  const t = useCallback((key: string) => i18nT(locale, key), [locale])

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
        setMessage(one?.message || t('ads.noAd'))
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
      setMessage(t('ads.serverError'))
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
        setMessage(t('ads.refreshed'))
        return
      }

      setMessage(data?.message || t('ads.verifyFailed'))
      setPhase('error')
    }
    catch {
      setMessage(t('ads.networkError'))
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
          📺
          {t('ads.watchHeader')}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-foreground/65">
          {t('ads.intro')}
        </p>
      </div>

      {/* Istatistik seridi */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatBox
          label={t('ads.totalViews')}
          value={totalLabel}
        />
        <StatBox
          label={t('ads.today')}
          value={stats && stats.source === 'db' ? String(stats.todayViews) : '—'}
        />
        <StatBox
          label={t('ads.completed')}
          value={stats && stats.source === 'db' ? String(stats.completedViews) : '—'}
        />
      </div>

      {stats?.source === 'fallback' && (
        <p className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-center text-xs text-amber-500">
          {t('ads.fallbackCounter')}
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
              <p className="text-sm text-foreground/55">{t('ads.loading')}</p>
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
                {t('ads.tryAgain')}
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
                    {`▶ ${t('ads.start')} · ${duration}s`}
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
                        ? t('ads.tabHidden')
                        : t('ads.playing')}
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
                    {t('ads.cancel')}
                  </button>
                </div>
              )}

              {phase === 'done' && (
                <div className="flex flex-col items-center gap-3 py-2 text-center">
                  <span className="text-4xl">🎉</span>
                  <p className="text-base font-semibold text-foreground">
                    {t('ads.thanks')}
                  </p>
                  <button
                    type="button"
                    onClick={() => void load()}
                    className="rounded-lg border border-foreground-200/20 px-5 py-2 text-sm text-foreground/80 transition-colors hover:border-primary/40"
                  >
                    {t('ads.watchAnother')}
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
            {t('ads.sponsors')}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map(s => (
              <AdSlotCard key={`grid-${s.id}`} slot={s} isEn={isEn} variant="grid" />
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-foreground/45">
        {t('ads.footerNote')}
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
