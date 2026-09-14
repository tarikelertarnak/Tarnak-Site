'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * "Reklam İzle" — destek olmak isteyen ziyaretçiler için opsiyonel reklam izleme.
 * Kullanıcı türü seçer: süreli (30 sn), görsel ya da linkli reklam.
 * Reklamlar yalnızca bu bölümde gösterilir; tamamlanan her izleme sayaçta birikir.
 */
type AdKind = 'timed' | 'visual' | 'link'

interface WatchAdSectionProps {
  isEn?: boolean
}

const ADS: Record<AdKind, { label: string; labelEn: string; note: string; noteEn: string; icon: string }> = {
  timed: {
    label: 'Süreli Reklam (30 sn)',
    labelEn: 'Timed Ad (30 sec)',
    note: '30 saniyelik bir reklam izle — destek sağla',
    noteEn: 'Watch a 30-second ad to support',
    icon: '⏱️',
  },
  visual: {
    label: 'Görsel Reklam',
    labelEn: 'Visual Ad',
    note: 'Görsel reklamı izle, devamında bilgi al',
    noteEn: 'Watch a visual ad',
    icon: '🖼️',
  },
  link: {
    label: 'Linkli Reklam',
    labelEn: 'Link Ad',
    note: 'Sponsor bağlantısını aç, destek ol',
    noteEn: 'Open a sponsor link to support',
    icon: '🔗',
  },
}

export function WatchAdSection({ isEn = false }: WatchAdSectionProps) {
  const [kind, setKind] = useState<AdKind | null>(null)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [count, setCount] = useState(30)
  const [watched, setWatched] = useState<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Persist total watched ads in localStorage (stateless helper; no backend needed)
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem('tarnak-ads-watched') || '0')
      setWatched(v)
    }
    catch { /* ssr / private mode — ignore */ }
  }, [])

  useEffect(() => {
    if (phase !== 'running' || kind !== 'timed')
      return
    timerRef.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          if (timerRef.current)
            clearInterval(timerRef.current)
          finishAd()
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current)
        clearInterval(timerRef.current)
    }
  }, [phase, kind])

  const finishAd = () => {
    setPhase('done')
    const next = watched + 1
    setWatched(next)
    try { localStorage.setItem('tarnak-ads-watched', String(next)) }
    catch { /* ignore */ }
  }

  const start = (k: AdKind) => {
    setKind(k)
    setCount(30)
    setPhase('running')
  }

  const reset = () => {
    setPhase('idle')
    setKind(null)
    if (timerRef.current)
      clearInterval(timerRef.current)
  }

  const t = (tr: string, en: string) => (isEn ? en : tr)

  return (
    <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-primary/25 bg-background/60 shadow-lg shadow-primary/5">
      <div className="border-b border-foreground-200/10 bg-primary/10 px-4 py-3 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-wider text-primary">
          {t('📺 Reklam İzle — Destek Ol', '📺 Watch an Ad — Support')}
        </p>
        <p className="mt-0.5 text-xs text-foreground/60">
          {t('Para harcamadan desteklemek istersen buradan reklam izleyebilirsin. Reklamlar yalnızca bu bölümde gösterilir.', 'If you want to support without spending money, you can watch ads here. Ads show only in this section.')}
          {' '}
          <span className="font-semibold text-primary">
            {t('İzlenen reklam:', 'Ads watched:')} {watched}
          </span>
        </p>
      </div>

      <div className="p-4 sm:p-6">
        {phase === 'idle' && (
          <div className="flex flex-col gap-2.5">
            {(Object.keys(ADS) as AdKind[]).map(k => (
              <button
                key={k}
                type="button"
                onClick={() => start(k)}
                className="flex items-center gap-3 rounded-xl border border-foreground-200/15 bg-background px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="text-2xl">{ADS[k].icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {t(ADS[k].label, ADS[k].labelEn)}
                  </span>
                  <span className="block text-xs text-foreground/60">
                    {t(ADS[k].note, ADS[k].noteEn)}
                  </span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  {t('İzle', 'Watch')} →
                </span>
              </button>
            ))}
            <p className="mt-1 text-center text-[11px] text-foreground/45">
              {t('Destek sağlamak istemiyorsan bu bölümü atlayabilirsin — site tamamen ücretsiz.', 'If you don\'t want to support, you can skip this section — the site is completely free.')}
            </p>
          </div>
        )}

        {phase === 'running' && kind === 'timed' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary/30 text-3xl font-black text-primary">
              {count}
            </div>
            <p className="text-sm text-foreground/75">
              {t('Reklam oynatılıyor… lütfen bitmesini bekle. Teşekkürler!', 'Ad is playing… please wait. Thank you!')}
            </p>
            <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-foreground-200/15">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${((30 - count) / 30) * 100}%` }}
              />
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-xs text-foreground/50 underline-offset-2 hover:underline"
            >
              {t('İptal', 'Cancel')}
            </button>
          </div>
        )}

        {phase === 'running' && kind === 'visual' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-36 w-full max-w-xs items-center justify-center rounded-xl border border-foreground-200/15 bg-gradient-to-br from-primary/20 via-background to-background px-6">
              <p className="text-sm font-semibold text-primary">
                {t('Görsel reklamınız burada gösterilir', 'Your visual ad shows here')}
                <br />
                <span className="text-xs font-normal text-foreground/60">
                  TARNAK — TARIK ELER
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={finishAd}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t('İzledim, kapat', 'Watched, close')}
            </button>
            <button
              type="button"
              onClick={reset}
              className="text-xs text-foreground/50 underline-offset-2 hover:underline"
            >
              {t('İptal', 'Cancel')}
            </button>
          </div>
        )}

        {phase === 'running' && kind === 'link' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex w-full flex-col items-center gap-2 rounded-xl border border-foreground-200/15 bg-background p-4">
              <p className="text-sm text-foreground/75">
                {t('Sponsor bağlantısı: TARNAK — TARIK ELER', 'Sponsor link: TARNAK — TARIK ELER')}
              </p>
              <a
                href="https://github.com/TARIKELER-TARNAK"
                target="_blank"
                rel="noopener noreferrer"
                onClick={finishAd}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {t('Aç & destekle', 'Open & support')} ↗
              </a>
              <button
                type="button"
                onClick={reset}
                className="text-xs text-foreground/50 underline-offset-2 hover:underline"
              >
                {t('İptal', 'Cancel')}
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-4xl">🎉</span>
            <p className="text-base font-semibold text-foreground">
              {t('Teşekkürler! Destek oldun.', 'Thank you! You supported.')}
            </p>
            <p className="text-xs text-foreground/60">
              {t('İzlenen toplam reklam:', 'Total ads watched:')} {watched}
            </p>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-foreground-200/20 px-5 py-2 text-sm text-foreground/80 transition-colors hover:border-primary/40"
            >
              {t('Başka reklam izle', 'Watch another ad')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}