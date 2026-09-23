'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { AdSlotCard } from '@/components/ads/ad-slot'
import type { AdSlot, AdStats } from '@/lib/ads'

/**
 * "Reklam Izle — Destek Ol" — destek sayfasindaki kompakt bolum.
 *
 * Uc yol var:
 *  1. Sureli reklam  -> burada, sayfa icinde geri sayimla oynar
 *  2. Gorsel reklam  -> /reklam tam sayfasina goturur (reklamlar her yerde)
 *  3. Linkli reklam  -> sponsor baglantisini acar, tiklama destek sayilir
 *
 * Sayac artik localStorage'da degil SUNUCUDA: ayni ziyaretcinin tarayicisini
 * temizlemesi sayaci sifirlamaz, tum ziyaretciler ortak toplami gorur.
 */

interface WatchAdSectionProps {
  isEn?: boolean
}

type Phase = 'idle' | 'running' | 'link' | 'done'

export function WatchAdSection({ isEn = false }: WatchAdSectionProps) {
  const router = useRouter()
  const [timed, setTimed] = useState<AdSlot | null>(null)
  const [link, setLink] = useState<AdSlot | null>(null)
  const [stats, setStats] = useState<AdStats | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [remaining, setRemaining] = useState(0)
  const [duration, setDuration] = useState(15)
  const [message, setMessage] = useState('')
  const [tabHidden, setTabHidden] = useState(false)
  const tokenRef = useRef('')
  const submitted = useRef(false)

  const t = (tr: string, en: string) => (isEn ? en : tr)

  // Slotlari ve guncel sayaci yukle
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [listRes, pickRes] = await Promise.all([
          fetch('/api/ads?placement=donate&all=1', { cache: 'no-store' }),
          fetch('/api/ads?placement=donate', { cache: 'no-store' }),
        ])
        const list = await listRes.json().catch(() => null)
        const pick = await pickRes.json().catch(() => null)
        if (!alive)
          return

        const slots: AdSlot[] = Array.isArray(list?.slots) ? list.slots : []
        setTimed(slots.find(s => s.kind !== 'link') ?? slots[0] ?? null)
        setLink(slots.find(s => s.kind === 'link') ?? null)
        if (pick?.stats)
          setStats(pick.stats)
      }
      catch {
        // sessiz: bolum yine de gorunur, butonlar hata verirse mesaj cikar
      }
    })()
    return () => { alive = false }
  }, [])

  // Geri sayim (sekme arkada ise saymaz)
  useEffect(() => {
    const onVis = () => setTabHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

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
        body: JSON.stringify({ token: tokenRef.current, watchedSeconds: duration }),
      })
      const data = await res.json().catch(() => null)
      if (data?.stats)
        setStats(data.stats)
      if (data?.ok) {
        setPhase('done')
        return
      }
      // Token bayatladi — butonlar her basista taze token aldigi icin
      // kullaniciya sadece tekrar denemesini soyleriz.
      if (data?.reason === 'expired') {
        submitted.current = false
        setMessage(t('Reklam oturumu yenilendi — lütfen tekrar başlat.', 'Ad session refreshed — please start again.'))
        setPhase('idle')
        return
      }
      setMessage(data?.message || t('Kayıt doğrulanamadı.', 'Could not verify.'))
      setPhase('idle')
    }
    catch {
      setMessage(t('Bağlantı hatası.', 'Network error.'))
      setPhase('idle')
    }
  }, [duration, t])

  useEffect(() => {
    if (phase === 'running' && remaining === 0)
      void submit()
  }, [phase, remaining, submit])

  const fetchToken = useCallback(async (slotId: string): Promise<AdSlot | null> => {
    try {
      const res = await fetch(`/api/ads?placement=donate&slot=${encodeURIComponent(slotId)}`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!data?.ok || !data.slot)
        return null
      tokenRef.current = data.token
      if (data.stats)
        setStats(data.stats)
      return data.slot as AdSlot
    }
    catch {
      return null
    }
  }, [])

  const startTimed = async () => {
    if (!timed)
      return
    setMessage('')
    submitted.current = false
    const slot = await fetchToken(timed.id)
    if (!slot) {
      setMessage(t('Reklam yüklenemedi.', 'Could not load the ad.'))
      return
    }
    setDuration(slot.durationSeconds)
    setRemaining(slot.durationSeconds)
    setPhase('running')
  }

  const startLink = async () => {
    if (!link)
      return
    setMessage('')
    submitted.current = false
    const slot = await fetchToken(link.id)
    if (!slot) {
      setMessage(t('Sponsor bağlantısı yüklenemedi.', 'Could not load the sponsor link.'))
      return
    }
    if (slot.targetUrl)
      window.open(slot.targetUrl, '_blank', 'noopener,noreferrer')
    // Tiklama reklaminda destek tiklaminin kendisidir; sunucu en az 2 sn ister.
    // Geri sayim yerine ayri bir 'link' asamasi kullanilir: yeni sekme acilinca
    // bu sekme arka plana duser ve interval tabanli sayac dururdu.
    setDuration(2)
    setPhase('link')
    setTimeout(() => void submit(), 2500)
  }

  const reset = () => {
    setPhase('idle')
    setMessage('')
    submitted.current = false
  }

  const total = stats && stats.source === 'db' ? stats.totalViews : null
  const progress = duration > 0 ? ((duration - remaining) / duration) * 100 : 0

  return (
    <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-primary/25 bg-background/60 shadow-lg shadow-primary/5">
      <div className="border-b border-foreground-200/10 bg-primary/10 px-4 py-3 sm:px-6">
        <p className="text-sm font-bold uppercase tracking-wider text-primary">
          {t('📺 Reklam İzle — Destek Ol', '📺 Watch an Ad — Support')}
        </p>
        <p className="mt-0.5 text-xs text-foreground/60">
          {t('Para harcamadan desteklemek istersen buradan reklam izleyebilirsin. Reklamlar yalnızca bu bölümde ve reklam sayfasında gösterilir.', 'If you want to support without spending money, you can watch ads here. Ads appear only in this section and on the ads page.')}
          {' '}
          <span className="font-semibold text-primary">
            {t('İzlenen reklam:', 'Ads watched:')} {total === null ? '—' : total}
          </span>
        </p>
      </div>

      <div className="p-4 sm:p-6">
        {phase === 'idle' && (
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => void startTimed()}
              className="flex items-center gap-3 rounded-xl border border-foreground-200/15 bg-background px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="text-2xl">⏱️</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {t('Süreli Reklam', 'Timed Ad')} ({timed ? `${timed.durationSeconds} sn` : '15 sn'})
                </span>
                <span className="block text-xs text-foreground/60">
                  {t('Kısa bir sponsor tanıtımı izle — destek sağla', 'Watch a short sponsor promo to support')}
                </span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {t('İzle', 'Watch')} →
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push('/reklam')}
              className="flex items-center gap-3 rounded-xl border border-foreground-200/15 bg-background px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="text-2xl">🖼️</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {t('Görsel Reklam Sayfası', 'Visual Ads Page')}
                </span>
                <span className="block text-xs text-foreground/60">
                  {t('Reklam sayfasına git — orada birden fazla sponsor var', 'Go to the ads page — several sponsors there')}
                </span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {t('Git', 'Open')} →
              </span>
            </button>

            <button
              type="button"
              onClick={() => void startLink()}
              className="flex items-center gap-3 rounded-xl border border-foreground-200/15 bg-background px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="text-2xl">🔗</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {t('Linkli Reklam', 'Link Ad')}
                </span>
                <span className="block text-xs text-foreground/60">
                  {t('Sponsor bağlantısını aç — tıklaman destek sayılır', 'Open the sponsor link — your click counts as support')}
                </span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {t('Aç', 'Open')} ↗
              </span>
            </button>

            {message && (
              <p className="text-center text-xs text-amber-500">{message}</p>
            )}

            {stats?.source === 'fallback' && (
              <p className="mt-1 text-center text-[11px] text-amber-500/80">
                {t('Sayaç yerel modda — reklam tabloları henüz oluşturulmadı.', 'Counter is in local mode — ad tables are not created yet.')}
              </p>
            )}

            <p className="mt-1 text-center text-[11px] text-foreground/45">
              {t('Destek sağlamak istemiyorsan bu bölümü atlayabilirsin — site tamamen ücretsiz.', 'If you don\'t want to support, you can skip this section — the site is completely free.')}
            </p>
          </div>
        )}

        {phase === 'running' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            {timed && remaining > 2
              ? <AdSlotCard slot={timed} isEn={isEn} variant="stage" className="w-full max-w-sm" />
              : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary/30 text-3xl font-black text-primary">
                    {remaining}
                  </div>
                )}
            <p className="text-sm text-foreground/75">
              {tabHidden
                ? t('⏸ Sekme arka planda — sayaç durdu.', '⏸ Tab in background — timer paused.')
                : t('Reklam oynatılıyor… lütfen bitmesini bekle. Teşekkürler!', 'Ad is playing… please wait. Thank you!')}
            </p>
            <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-foreground-200/15">
              <div
                className="h-full rounded-full bg-primary transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
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

        {phase === 'link' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-3xl">🔗</span>
            <p className="text-sm font-semibold text-foreground">
              {t('Sponsor bağlantısı yeni sekmede açıldı.', 'The sponsor link opened in a new tab.')}
            </p>
            <p className="text-xs text-foreground/60">
              {t('Desteğin kaydediliyor…', 'Recording your support…')}
            </p>
            <button
              type="button"
              onClick={reset}
              className="text-xs text-foreground/50 underline-offset-2 hover:underline"
            >
              {t('Kapat', 'Close')}
            </button>
          </div>
        )}

        {phase === 'done' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-4xl">🎉</span>
            <p className="text-base font-semibold text-foreground">
              {t('Teşekkürler! Destek oldun.', 'Thank you! You supported.')}
            </p>
            <p className="text-xs text-foreground/60">
              {t('İzlenen toplam reklam:', 'Total ads watched:')} {total === null ? '—' : total}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-foreground-200/20 px-5 py-2 text-sm text-foreground/80 transition-colors hover:border-primary/40"
              >
                {t('Başka reklam izle', 'Watch another ad')}
              </button>
              <button
                type="button"
                onClick={() => router.push('/reklam')}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {t('Reklam sayfasına git', 'Go to ads page')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
