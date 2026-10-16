'use client'

import { Icon } from '@iconify/react'
import { useEffect, useState } from 'react'

import { cn } from '@/components/ui/cn'

interface VisitorStats {
  today: number | null
  last7: number | null
  last30: number | null
  total: number | null
  excludeSelf: boolean
  excludeSelfVisitorId: string | null
}

/**
 * Genel Bakış — Ziyaretçi kartı: 4 sayı (bugün / 7 gün / 30 gün / toplam)
 * ve "kendi ziyaretlerimi sayma" anahtarı.
 *
 * Sayılar `null` olduğunda veri bilinmiyor (tablo yok / migration henüz
 * çalışmamış) — "0" ile karıştırılmaz, "—" gösterilir.
 */
export function VisitorCard() {
  const [stats, setStats] = useState<VisitorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    fetch('/api/admin/visits', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok)
          throw new Error('unauthorized')
        return await r.json() as VisitorStats
      })
      .then((data) => {
        if (alive) {
          setStats(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (alive) {
          setError('Ziyaret verisi okunamadı')
          setLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [])

  const toggle = () => {
    if (!stats || toggling)
      return
    const next = !stats.excludeSelf
    setToggling(true)
    setError('')
    fetch('/api/admin/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable: next }),
      cache: 'no-store',
    })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok)
          throw new Error(String(data.error ?? 'failed'))
        setStats(prev => prev ? { ...prev, ...data } : prev)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setToggling(false))
  }

  const num = (v: number | null | undefined) => (v === null || v === undefined ? '—' : String(v))

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3">
      <div className="flex items-center gap-1.5 text-foreground/60">
        <Icon icon="mdi:eye-outline" width={15} height={15} />
        <span className="text-xs">Ziyaretçi (tekil kişi)</span>
      </div>

      {loading
        ? <span className="text-sm text-foreground/50">Sayılar getiriliyor…</span>
        : (
            <>
              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="flex flex-col">
                  <span className="text-lg font-semibold tabular-nums text-foreground" aria-label="Bugün">
                    {num(stats?.today)}
                  </span>
                  <span className="text-[10px] text-foreground/50">Bugün</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-semibold tabular-nums text-foreground" aria-label="Son 7 gün">
                    {num(stats?.last7)}
                  </span>
                  <span className="text-[10px] text-foreground/50">7 gün</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-semibold tabular-nums text-foreground" aria-label="Son 30 gün">
                    {num(stats?.last30)}
                  </span>
                  <span className="text-[10px] text-foreground/50">30 gün</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-semibold tabular-nums text-foreground" aria-label="Toplam">
                    {num(stats?.total)}
                  </span>
                  <span className="text-[10px] text-foreground/50">Toplam</span>
                </div>
              </div>

              <p className="mt-1 text-[10px] text-foreground/40">
                Aynı tarayıcı girişli/girişsiz tek kişi sayılır.
              </p>

              <button
                type="button"
                onClick={toggle}
                disabled={toggling}
                aria-pressed={Boolean(stats?.excludeSelf)}
                className={cn(
                  'mt-1.5 rounded-lg border px-2 py-1 text-[11px] transition-colors',
                  stats?.excludeSelf
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-foreground/15 text-foreground/70 hover:border-foreground/30',
                  'disabled:opacity-50',
                )}
              >
                {stats?.excludeSelf ? 'Kendi ziyaretlerim sayılmıyor (kapat)' : 'Kendi ziyaretlerimi sayma'}
              </button>
              {error && (
                <p className="mt-1 text-[10px] text-danger">{error}</p>
              )}
            </>
          )}
    </div>
  )
}
