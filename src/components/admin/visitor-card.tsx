'use client'

import { Icon } from '@iconify/react'
import { useEffect, useState } from 'react'

interface VisitorStats {
  today: number | null
  last7: number | null
  last30: number | null
  total: number | null
  excludeSelf: boolean
  excludeSelfVisitorId: string | null
}

/**
 * Genel Bakış — Ziyaretçi kartı: 4 sayı (bugün / 7 gün / 30 gün / toplam).
 *
 * "Kendi ziyaretlerimi sayma" anahtarı 2026-10-20'de KALDIRILDI (kullanıcı
 * isteği) — `visits` tablosu canlıda yok, anahtar zaten işe yaramıyordu.
 *
 * Sayılar `null` olduğunda veri bilinmiyor (tablo yok / migration henüz
 * çalışmamış) — "0" ile karıştırılmaz, "—" gösterilir.
 */
export function VisitorCard() {
  const [stats, setStats] = useState<VisitorStats | null>(null)
  const [loading, setLoading] = useState(true)
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
              {error && (
                <p className="mt-1 text-[10px] text-danger">{error}</p>
              )}
            </>
          )}
    </div>
  )
}
