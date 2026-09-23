'use client'

import { Icon } from '@iconify/react'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'

/**
 * Admin paneli — GENEL BAKIS (veri izleme).
 *
 * Salt okunurdur: hicbir sey yazmaz. Amaci "su an durum ne?" sorusunu
 * tek ekranda yanitlamak — sayilar, son kayitlar ve DIKKAT gerektiren
 * sema eksikleri (eksik tablo/kolon).
 *
 * Onemli: sayilar `null` gelebilir. `null` = "bilinmiyor" (tablo yok),
 * `0` = "gercekten sifir". Ikisini ayni gostermek yanlis bilgi verir.
 */

interface TableStat {
  key: string
  label: string
  icon: string
  description: string
  count: number | null
  status: 'ok' | 'missing' | 'error'
  message?: string
}

type Row = Record<string, unknown>

interface PersistenceInfo {
  dataDir?: string
  dataWritable?: boolean
  uploadsDir?: string
  uploadsWritable?: boolean
  ok?: boolean
  note?: string
}

interface OverviewResponse {
  success: boolean
  message?: string
  generatedAt?: string
  tables?: TableStat[]
  messages?: { total: number, unread: number }
  ads?: {
    totalViews: number
    completedViews: number
    todayViews: number
    source: 'db' | 'fallback'
    recent: Row[]
  }
  recent?: { posts: Row[], projects: Row[], messages: Row[] }
  persistence?: PersistenceInfo
  warnings?: string[]
}

function formatDate(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    return '—'
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    return '—'
  }
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: string
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'warning'
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-xl border p-3',
        tone === 'warning'
          ? 'border-amber-500/30 bg-amber-500/10'
          : 'border-foreground/10 bg-foreground/[0.03]',
      )}
    >
      <div className="flex items-center gap-1.5 text-foreground/60">
        <Icon icon={icon} width={15} height={15} />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-foreground/50">{hint}</span>}
    </div>
  )
}

function MiniList({
  title,
  icon,
  rows,
  emptyText,
  render,
}: {
  title: string
  icon: string
  rows: Row[]
  emptyText: string
  render: (row: Row) => React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-foreground/10 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Icon icon={icon} width={15} height={15} />
        {title}
      </div>
      {rows.length === 0
        ? <p className="py-3 text-center text-xs text-foreground/40">{emptyText}</p>
        : (
            <ul className="flex flex-col divide-y divide-foreground/5">
              {rows.map((row, i) => (
                <li key={String(row.id ?? i)} className="flex items-center gap-2 py-1.5 text-xs">
                  {render(row)}
                </li>
              ))}
            </ul>
          )}
    </div>
  )
}

export function OverviewPanel({ onNavigate }: { onNavigate?: (resourceKey: string) => void }) {
  const [data, setData] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' })
      const json: OverviewResponse = await res.json().catch(() => ({ success: false }))
      if (!json.success) {
        setError(json.message || 'Genel bakış yüklenemedi.')
        return
      }
      setData(json)
    }
    catch {
      setError('Sunucuya ulaşılamadı.')
    }
    finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 pt-6 text-sm text-foreground/60">
        <Icon icon="material-symbols:progress-activity" width={18} height={18} className="animate-spin" />
        Genel bakış yükleniyor…
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="space-y-3 pt-6">
        <p className="rounded-lg border border-danger-200 bg-danger-50 p-2.5 text-sm text-danger">{error}</p>
        <Button variant="bordered" onPress={() => void load()}>Tekrar dene</Button>
      </div>
    )
  }

  const tables = data?.tables ?? []
  const ads = data?.ads
  const recent = data?.recent
  const warnings = data?.warnings ?? []

  // Toplam: yalnizca gercekten okunabilen tablolari sayar (null'lar haric).
  const readable = tables.filter(t => t.count !== null)
  const totalRows = readable.reduce((sum, t) => sum + (t.count ?? 0), 0)
  const missingCount = tables.filter(t => t.status === 'missing').length

  return (
    <div className="space-y-4 pt-4">
      {/* Baslik + yenile */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Genel Bakış</h2>
          <p className="text-xs text-foreground/50">
            {data?.generatedAt ? `Son güncelleme: ${formatDate(data.generatedAt)}` : ''}
          </p>
        </div>
        <Button
          size="sm"
          variant="bordered"
          isDisabled={loading}
          onPress={() => void load()}
          startContent={(
            <Icon
              icon="material-symbols:refresh"
              width={16}
              height={16}
              className={loading ? 'animate-spin' : undefined}
            />
          )}
        >
          Yenile
        </Button>
      </div>

      {/* Uyarilar */}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
          <p className="flex items-center gap-1.5 font-semibold">
            <Icon icon="material-symbols:warning" width={15} height={15} />
            {warnings.length}
            {' '}
            dikkat gerektiren nokta
          </p>
          <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Kalicilik durumu — kaydetmenin gercekten isleyip islemedigi */}
      {data?.persistence && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-xl border p-3 text-xs',
            data.persistence.ok
              ? 'border-success-200 bg-success-50 text-success'
              : 'border-danger-200 bg-danger-50 text-danger',
          )}
        >
          <Icon
            icon={data.persistence.ok
              ? 'material-symbols:save'
              : 'material-symbols:sd-card-alert'}
            width={16}
            height={16}
            className="mt-0.5 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {data.persistence.ok ? 'Kaydetme kalıcı' : 'Kaydetme KALICI DEĞİL'}
            </p>
            <p className="mt-0.5">{data.persistence.note}</p>
            {!data.persistence.ok && (
              <ul className="mt-1 flex flex-col gap-0.5 opacity-80">
                <li>
                  içerik/şifre dizini:
                  {' '}
                  {data.persistence.dataWritable ? 'yazılabilir' : 'YAZILAMIYOR'}
                </li>
                <li>
                  görsel dizini:
                  {' '}
                  {data.persistence.uploadsWritable ? 'yazılabilir' : 'YAZILAMIYOR'}
                </li>
              </ul>
            )}
          </div>
        </div>
      )}

      {/* KPI kartlari */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon="mdi:database-outline"
          label="Toplam kayıt"
          value={String(totalRows)}
          hint={`${readable.length}/${tables.length} tablo okunabildi`}
        />
        <StatCard
          icon="mdi:email-outline"
          label="Okunmamış mesaj"
          value={String(data?.messages?.unread ?? 0)}
          hint={`${data?.messages?.total ?? 0} toplam mesaj`}
          tone={(data?.messages?.unread ?? 0) > 0 ? 'warning' : 'default'}
        />
        <StatCard
          icon="mdi:bullhorn-outline"
          label="Bugün izlenen reklam"
          value={ads?.source === 'db' ? String(ads.todayViews) : '—'}
          hint={ads?.source === 'db' ? `${ads.totalViews} toplam` : 'reklam tabloları yok'}
          tone={ads?.source === 'db' ? 'default' : 'warning'}
        />
        <StatCard
          icon="mdi:alert-circle-outline"
          label="Eksik tablo"
          value={String(missingCount)}
          hint={missingCount === 0 ? 'şema tam' : 'SQL çalıştırılmalı'}
          tone={missingCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Tablo sayilari — tiklanabilir */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Tablolar</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => {
            const clickable = Boolean(onNavigate)
            return (
              <button
                key={t.key}
                type="button"
                disabled={!clickable}
                onClick={() => onNavigate?.(t.key)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                  t.status === 'ok'
                    ? 'border-foreground/10 hover:border-foreground/25'
                    : 'border-amber-500/30 bg-amber-500/5',
                  clickable ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <Icon
                  icon={t.status === 'ok' ? t.icon : 'material-symbols:warning'}
                  width={20}
                  height={20}
                  className={t.status === 'ok' ? 'text-foreground/70' : 'text-amber-500'}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{t.label}</p>
                  <p className="truncate text-[11px] text-foreground/50">
                    {t.status === 'ok' ? t.description : (t.message || 'okunamadı')}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-lg font-semibold tabular-nums',
                    t.count === null ? 'text-amber-500' : 'text-foreground',
                  )}
                >
                  {t.count === null ? '—' : t.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Son kayitlar */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <MiniList
          title="Son blog yazıları"
          icon="mdi:post-outline"
          rows={recent?.posts ?? []}
          emptyText="Henüz yazı yok"
          render={row => (
            <>
              <span className="min-w-0 flex-1 truncate text-foreground">{String(row.title ?? '—')}</span>
              <span
                className={cn(
                  'shrink-0 rounded px-1.5 py-0.5 text-[10px]',
                  row.published
                    ? 'bg-success-50 text-success'
                    : 'bg-foreground/10 text-foreground/60',
                )}
              >
                {row.published ? 'yayında' : 'taslak'}
              </span>
            </>
          )}
        />

        <MiniList
          title="Son mesajlar"
          icon="mdi:email-outline"
          rows={recent?.messages ?? []}
          emptyText="Henüz mesaj yok"
          render={row => (
            <>
              <span className="min-w-0 flex-1 truncate text-foreground">
                {String(row.name ?? '—')}
                {row.subject ? ` · ${String(row.subject)}` : ''}
              </span>
              {!row.is_read && (
                <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                  yeni
                </span>
              )}
              <span className="shrink-0 text-foreground/40">{formatDate(row.created_at)}</span>
            </>
          )}
        />

        <MiniList
          title="Son reklam izlenmeleri"
          icon="mdi:bullhorn-outline"
          rows={ads?.source === 'db' ? (ads.recent ?? []) : []}
          emptyText={ads?.source === 'db' ? 'Henüz izlenme yok' : 'Reklam tabloları yok'}
          render={row => (
            <>
              <span className="min-w-0 flex-1 truncate text-foreground">{String(row.slot_slug ?? '—')}</span>
              <span className="shrink-0 tabular-nums text-foreground/50">
                {String(row.watched_seconds ?? 0)}
                s
              </span>
              {row.completed
                ? <Icon icon="material-symbols:check-circle" width={14} height={14} className="shrink-0 text-success" />
                : <Icon icon="material-symbols:cancel" width={14} height={14} className="shrink-0 text-foreground/30" />}
            </>
          )}
        />
      </div>
    </div>
  )
}
