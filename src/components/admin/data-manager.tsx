'use client'

import { Icon } from '@iconify/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/components/ui/cn'
import { Drawer } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { type CsvColumn, csvFilename, toCsv } from '@/lib/admin/csv'
import type { FieldDef, ResourceDef } from '@/lib/admin/resources'
import { RESOURCES } from '@/lib/admin/resources'
import { SearchableCombobox } from '@/components/ui/searchable-combobox'

/**
 * Genel admin veri yoneticisi.
 *
 * Kaynak listesi `src/lib/admin/resources.ts`'ten gelir; burada tabloya ozel
 * hicbir kod yok. Yeni bir tablo eklemek icin sadece kayit defterine nesne
 * eklemek yeterli — bu bilesen otomatik olarak liste/arama/siralama/sayfalama/
 * ekleme/duzenleme/silme yetenegi kazanir.
 *
 * Guvenlik notu: bu bilesen yalnizca ARAYUZdur. Tum yetki kontrolu
 * /api/admin/data/* route'larinda `isAdminUser()` ile yapilir; buradaki
 * butonlari gizlemek guvenlik sayilmaz, sadece kullanilabilirlik saglar.
 */

type Row = Record<string, unknown>

interface ListResponse {
  success: boolean
  rows?: Row[]
  total?: number
  page?: number
  perPage?: number
  message?: string
  missingTable?: boolean
  /** Semada olmadigi icin listeden cikarilan kolonlar */
  droppedColumns?: string[]
  /** Kolon semada olmadigi icin UYGULANAMAYAN filtreler */
  ignoredFilters?: string[]
  /** Disa aktarmada ust sinira takildi mi */
  truncated?: boolean
}

type Notice = { type: 'success' | 'error' | 'warning', text: string } | null

const PER_PAGE = 25

function cellText(row: Row, field: FieldDef): string {
  const v = row[field.name]
  if (v === null || v === undefined || v === '')
    return '—'
  if (field.type === 'boolean')
    return v ? 'Evet' : 'Hayır'
  if (Array.isArray(v))
    return v.length ? v.join(', ') : '—'
  if (field.type === 'datetime')
    return String(v).slice(0, 16).replace('T', ' ')
  return String(v)
}

/** Tabloda gosterilecek kolonlar: inTable isaretliler, yoksa ilk 4 alan. */
function tableFields(resource: ResourceDef): FieldDef[] {
  const marked = resource.fields.filter(f => f.inTable)
  return marked.length > 0 ? marked : resource.fields.slice(0, 4)
}

/**
 * CSV sutunlari: `listColumns` (id/slug/tarih dahil) + bilinen etiketler.
 * Etiketi olmayan kolonlar (id, created_at...) kendi adiyla cikar.
 */
function csvColumns(resource: ResourceDef): CsvColumn[] {
  const labelFor = new Map(resource.fields.map(f => [f.name, f.label]))
  return resource.listColumns.map(key => ({ key, label: labelFor.get(key) ?? key }))
}

/**
 * Aktif filtreleri `f_<kolon>=<deger>` parametrelerine cevirir.
 * Kolon adlari istemciden gelir ama SUNUCU beyaz listeye karsi dogrular
 * (bkz. resources.ts `resolveFilters`) — burada guvenlik iddiasi yok.
 */
function appendFilters(params: URLSearchParams, filters: Record<string, string>) {
  for (const [column, value] of Object.entries(filters)) {
    if (value)
      params.set(`f_${column}`, value)
  }
}

/** Formda gosterilecek alanlar — immutable alanlar yalnizca duzenlemede salt okunur. */
function formFields(resource: ResourceDef): FieldDef[] {
  return [...resource.fields]
}

export function DataManager({ initialResource }: { initialResource?: string } = {}) {
  const [activeKey, setActiveKey] = useState<string>(() =>
    initialResource && RESOURCES.some(r => r.key === initialResource)
      ? initialResource
      : RESOURCES[0].key,
  )
  const resource = useMemo(
    () => RESOURCES.find(r => r.key === activeKey) ?? RESOURCES[0],
    [activeKey],
  )

  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  // Ilk degeri kaynaktan al ki mount'ta ikinci bir istek atilmasin
  // (aksi halde sort '' -> 'created_at' degisimi fazladan fetch tetiklerdi).
  const [sort, setSort] = useState<string>(RESOURCES[0].orderBy.column)
  const [dir, setDir] = useState<'asc' | 'desc'>(RESOURCES[0].orderBy.ascending ? 'asc' : 'desc')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  // Aktif filtreler: { kolonAdi: secilenDeger }. Kaynak degisince sifirlanir.
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [missingTable, setMissingTable] = useState(false)

  // Form durumu
  const [editing, setEditing] = useState<Row | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState<Record<string, string | boolean>>({})
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [formError, setFormError] = useState('')

  // Arama gecikmesi — her tus vurusunda istek atmamak icin
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 350)
    return () => clearTimeout(id)
  }, [q])

  // Kaynak degisince sifirla
  useEffect(() => {
    setPage(1)
    setSort(resource.orderBy.column)
    setDir(resource.orderBy.ascending ? 'asc' : 'desc')
    setQ('')
    setDebouncedQ('')
    // Filtreler kaynaga OZEL: onceki kaynagin filtresi yeni kaynakta
    // anlamsiz olurdu (kolon adi tutmaz).
    setActiveFilters({})
    setNotice(null)
  }, [resource])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(PER_PAGE),
      })
      if (debouncedQ)
        params.set('q', debouncedQ)
      if (sort)
        params.set('sort', sort)
      if (dir)
        params.set('dir', dir)
      appendFilters(params, activeFilters)

      const res = await fetch(`/api/admin/data/${resource.key}?${params}`, { cache: 'no-store' })
      const data: ListResponse = await res.json().catch(() => ({ success: false }))

      if (!data.success) {
        setRows([])
        setTotal(0)
        setMissingTable(Boolean(data.missingTable))
        setNotice({ type: 'error', text: data.message || 'Liste yüklenemedi.' })
        return
      }
      setRows(data.rows ?? [])
      setTotal(data.total ?? 0)
      setMissingTable(false)
      // Sema uyusmazligi varsa (or. messages.phone kolonu yok) kullaniciya
      // SOYLE — sessizce yutmak bir sonraki hatanin kaynagini gizler.
      // Uygulanamayan filtre daha kritik: "filtreledim" sanip filtresiz
      // liste gormek yanlis karar verdirir.
      setNotice(
        data.ignoredFilters?.length
          ? { type: 'warning', text: data.message || `Uygulanamayan filtreler: ${data.ignoredFilters.join(', ')}` }
          : data.droppedColumns?.length
            ? { type: 'warning', text: data.message || `Eksik kolonlar atlandı: ${data.droppedColumns.join(', ')}` }
            : null,
      )
    }
    catch {
      setNotice({ type: 'error', text: 'Sunucuya ulaşılamadı.' })
    }
    finally {
      setLoading(false)
    }
  }, [resource, page, debouncedQ, sort, dir, activeFilters])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    const initial: Record<string, string | boolean> = {}
    for (const f of formFields(resource)) {
      initial[f.name] = f.type === 'boolean' ? false : ''
    }
    setForm(initial)
    setIsNew(true)
    setEditing({})
    setFormError('')
  }

  const openEdit = (row: Row) => {
    const initial: Record<string, string | boolean> = {}
    for (const f of formFields(resource)) {
      const v = row[f.name]
      if (f.type === 'boolean')
        initial[f.name] = Boolean(v)
      else if (Array.isArray(v))
        initial[f.name] = v.join(', ')
      else
        initial[f.name] = v === null || v === undefined ? '' : String(v)
    }
    setForm(initial)
    setIsNew(false)
    setEditing(row)
    setFormError('')
  }

  const submitForm = async () => {
    if (!editing)
      return
    setSaving(true)
    setFormError('')
    try {
      const id = editing[resource.idColumn]
      const url = isNew
        ? `/api/admin/data/${resource.key}`
        : `/api/admin/data/${resource.key}/${encodeURIComponent(String(id))}`

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => null)

      if (!data?.success) {
        setFormError(data?.message || 'Kaydedilemedi.')
        return
      }

      setEditing(null)
      setNotice({ type: 'success', text: data.message || 'Kaydedildi.' })
      await load()
    }
    catch {
      setFormError('Sunucuya ulaşılamadı.')
    }
    finally {
      setSaving(false)
    }
  }

  const remove = async (row: Row) => {
    const label = String(row[resource.titleColumn] ?? row[resource.idColumn] ?? '')
    if (!window.confirm(`"${label}" kaydı silinsin mi? Bu işlem geri alınamaz.`))
      return

    try {
      const id = row[resource.idColumn]
      const res = await fetch(
        `/api/admin/data/${resource.key}/${encodeURIComponent(String(id))}`,
        { method: 'DELETE' },
      )
      const data = await res.json().catch(() => null)
      if (!data?.success) {
        setNotice({ type: 'error', text: data?.message || 'Silinemedi.' })
        return
      }
      setNotice({ type: 'success', text: data.message || 'Silindi.' })
      await load()
    }
    catch {
      setNotice({ type: 'error', text: 'Sunucuya ulaşılamadı.' })
    }
  }

  const toggleBoolean = async (row: Row, field: FieldDef) => {
    const id = row[resource.idColumn]
    try {
      const res = await fetch(
        `/api/admin/data/${resource.key}/${encodeURIComponent(String(id))}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field.name]: !row[field.name] }),
        },
      )
      const data = await res.json().catch(() => null)
      if (!data?.success) {
        setNotice({ type: 'error', text: data?.message || 'Güncellenemedi.' })
        return
      }
      setRows(prev => prev.map(r =>
        r[resource.idColumn] === id ? { ...r, [field.name]: !row[field.name] } : r,
      ))
    }
    catch {
      setNotice({ type: 'error', text: 'Sunucuya ulaşılamadı.' })
    }
  }

  /**
   * CSV disa aktarma. Aktif arama/siralama korunur — kullanici "su an
   * gordugum listeyi indir" bekler, tum tabloyu degil.
   * Ayirici/kaçis/BOM ve FORMUL ENJEKSIYONU korumasi `lib/admin/csv.ts`'te.
   */
  const exportCsv = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ all: '1' })
      if (debouncedQ)
        params.set('q', debouncedQ)
      if (sort)
        params.set('sort', sort)
      if (dir)
        params.set('dir', dir)
      appendFilters(params, activeFilters)

      const res = await fetch(`/api/admin/data/${resource.key}?${params}`, { cache: 'no-store' })
      const data: ListResponse = await res.json().catch(() => ({ success: false }))

      if (!data.success) {
        setNotice({ type: 'error', text: data.message || 'Dışa aktarma başarısız oldu.' })
        return
      }

      const rows = data.rows ?? []
      if (rows.length === 0) {
        setNotice({ type: 'warning', text: 'Dışa aktarılacak kayıt yok.' })
        return
      }

      const csv = toCsv(csvColumns(resource), rows)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = csvFilename(resource.key)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)

      setNotice(
        data.truncated
          ? {
              type: 'warning',
              text: `${rows.length} kayıt indirildi; ancak toplam ${data.total} kayıt var. Dosya yalnızca ilk ${rows.length} kaydı içeriyor.`,
            }
          : { type: 'success', text: `${rows.length} kayıt CSV olarak indirildi.` },
      )
    }
    catch {
      setNotice({ type: 'error', text: 'Sunucuya ulaşılamadı.' })
    }
    finally {
      setExporting(false)
    }
  }

  const cols = tableFields(resource)
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE))
  const canWrite = !resource.readOnly
  const hasActiveFilters = Object.values(activeFilters).some(Boolean)
  return (
    <div className="flex flex-col gap-4 pt-4 lg:flex-row">
      {/* Kaynak listesi */}
      <div className="flex shrink-0 flex-row gap-1.5 overflow-x-auto pb-1 lg:w-56 lg:flex-col lg:overflow-visible lg:pb-0">
        {RESOURCES.map(r => (
          <button
            key={r.key}
            type="button"
            onClick={() => setActiveKey(r.key)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
              r.key === resource.key
                ? 'border-primary/50 bg-primary/15 text-foreground'
                : 'border-foreground/10 text-foreground/70 hover:bg-foreground/5',
            )}
          >
            <Icon icon={r.icon} width={16} height={16} />
            <span className="whitespace-nowrap">{r.label}</span>
          </button>
        ))}
      </div>

      {/* Icerik */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">{resource.label}</h2>
          <p className="text-xs text-foreground/60">{resource.description}</p>
        </div>

        {/* Arac cubugu */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[180px] flex-1">
            <Input
              value={q}
              onValueChange={setQ}
              placeholder="Ara…"
              startContent={<Icon icon="mdi:magnify" width={16} height={16} />}
            />
          </div>
          <Button variant="bordered" onPress={() => void load()} isDisabled={loading}>
            <Icon icon="mdi:refresh" width={16} height={16} />
            Yenile
          </Button>
          <Button
            variant="bordered"
            onPress={() => void exportCsv()}
            isDisabled={exporting || loading}
          >
            <Icon icon="mdi:download-outline" width={16} height={16} />
            CSV indir
          </Button>
          {canWrite && (
            <Button color="primary" onPress={openCreate}>
              <Icon icon="mdi:plus" width={16} height={16} />
              Yeni
            </Button>
          )}
        </div>

        {/* Filtreler — kaynak tanimindan gelir (bkz. resources.ts FilterDef) */}
        {(resource.filters?.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {resource.filters!.map(filter => (
              <label
                key={filter.column}
                className="flex items-center gap-1.5 text-xs text-foreground/60"
              >
                <span className="whitespace-nowrap">{filter.label}</span>
                <select
                  aria-label={filter.label}
                  value={activeFilters[filter.column] ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    setActiveFilters(prev => ({ ...prev, [filter.column]: value }))
                    setPage(1)
                  }}
                  className="rounded-lg border border-foreground/15 bg-transparent px-2 py-1 text-xs text-foreground"
                >
                  <option value="">Tümü</option>
                  {filter.options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            ))}
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onPress={() => { setActiveFilters({}); setPage(1) }}>
                <Icon icon="mdi:filter-remove-outline" width={15} height={15} />
                Filtreleri temizle
              </Button>
            )}
          </div>
        )}

        {notice && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg border p-2.5 text-sm',
              notice.type === 'success' && 'border-success-200 bg-success-50 text-success',
              notice.type === 'error' && 'border-danger-200 bg-danger-50 text-danger',
              notice.type === 'warning' && 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
            )}
          >
            <Icon
              icon={
                notice.type === 'success'
                  ? 'material-symbols:check-circle'
                  : notice.type === 'warning'
                    ? 'material-symbols:warning'
                    : 'material-symbols:error'
              }
              width={16}
              height={16}
            />
            <span className="min-w-0 flex-1">{notice.text}</span>
          </div>
        )}

        {missingTable && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
            <p className="font-semibold">Tablolar henüz oluşturulmadı</p>
            <p className="mt-1">
              Supabase → SQL Editor bölümünde
              {' '}
              <code className="rounded bg-foreground/10 px-1">scripts/schema-ads.sql</code>
              {' '}
              (reklam tabloları),
              {' '}
              <code className="rounded bg-foreground/10 px-1">scripts/schema-fixes.sql</code>
              {' '}
              (eksik kolonlar) ve
              {' '}
              <code className="rounded bg-foreground/10 px-1">scripts/schema-languages.sql</code>
              {' '}
              (diller tablosu) dosyalarını çalıştır.
            </p>
          </div>
        )}

        {/* Tablo */}
        <div className="overflow-x-auto rounded-xl border border-foreground/10">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-foreground/5 text-xs uppercase tracking-wider text-foreground/60">
              <tr>
                {cols.map(f => (
                  <th key={f.name} className="px-3 py-2 text-left font-semibold">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() => {
                        if (sort === f.name)
                          setDir(dir === 'asc' ? 'desc' : 'asc')
                        else {
                          setSort(f.name)
                          setDir('asc')
                        }
                        setPage(1)
                      }}
                    >
                      {f.label}
                      {sort === f.name && (
                        <Icon
                          icon={dir === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'}
                          width={13}
                          height={13}
                        />
                      )}
                    </button>
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-semibold">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={cols.length + 1} className="px-3 py-6 text-center text-foreground/50">
                    Yükleniyor…
                  </td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={cols.length + 1} className="px-3 py-6 text-center text-foreground/50">
                    Kayıt yok.
                  </td>
                </tr>
              )}

              {!loading && rows.map((row, i) => (
                <tr
                  key={String(row[resource.idColumn] ?? i)}
                  className="border-t border-foreground/10 hover:bg-foreground/[0.03]"
                >
                  {cols.map((f) => {
                    const isBool = f.type === 'boolean'
                    return (
                      <td key={f.name} className="max-w-[280px] px-3 py-2">
                        {isBool && canWrite
                          ? (
                              <button
                                type="button"
                                onClick={() => void toggleBoolean(row, f)}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
                                  row[f.name]
                                    ? 'border-success-300 bg-success-50 text-success'
                                    : 'border-foreground/15 text-foreground/50',
                                )}
                                title="Değiştirmek için tıkla"
                              >
                                <Icon
                                  icon={row[f.name] ? 'mdi:check' : 'mdi:close'}
                                  width={12}
                                  height={12}
                                />
                                {row[f.name] ? 'Evet' : 'Hayır'}
                              </button>
                            )
                          : (
                              <span className="block truncate" title={cellText(row, f)}>
                                {cellText(row, f)}
                              </span>
                            )}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {canWrite && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Düzenle"
                          onPress={() => openEdit(row)}
                        >
                          <Icon icon="mdi:pencil" width={15} height={15} />
                        </Button>
                      )}
                      {canWrite && !resource.singleton && (
                        <Button
                          variant="ghost"
                          size="sm"
                          color="danger"
                          aria-label="Sil"
                          onPress={() => void remove(row)}
                        >
                          <Icon icon="mdi:trash-can-outline" width={15} height={15} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sayfalama */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-foreground/60">
          <span>
            {total}
            {' '}
            kayıt · sayfa
            {' '}
            {page}
            {' '}
            /
            {' '}
            {pageCount}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="bordered"
              size="sm"
              isDisabled={page <= 1 || loading}
              onPress={() => setPage(p => Math.max(1, p - 1))}
            >
              <Icon icon="mdi:chevron-left" width={16} height={16} />
              Önceki
            </Button>
            <Button
              variant="bordered"
              size="sm"
              isDisabled={page >= pageCount || loading}
              onPress={() => setPage(p => p + 1)}
            >
              Sonraki
              <Icon icon="mdi:chevron-right" width={16} height={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={isNew ? `Yeni · ${resource.label}` : `Düzenle · ${resource.label}`}
        side="right"
      >
        <div className="flex flex-col gap-3 px-5 pb-8">
          {formFields(resource).map((f) => {
            const value = form[f.name]
            const locked = Boolean(f.immutable) && !isNew

            if (f.type === 'boolean') {
              return (
                <label
                  key={f.name}
                  className="flex items-center justify-between rounded-lg border border-foreground/10 px-3 py-2 text-sm"
                >
                  <span>{f.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    disabled={locked}
                    onChange={e => setForm(prev => ({ ...prev, [f.name]: e.target.checked }))}
                  />
                </label>
              )
            }

            if (f.type === 'select') {
              return (
                <label key={f.name} className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">{f.label}</span>
                  <select
                    value={String(value ?? '')}
                    disabled={locked}
                    onChange={e => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                    className="rounded-lg border border-foreground/15 bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="">— seç —</option>
                    {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {f.help && <span className="text-[11px] text-foreground/50">{f.help}</span>}
                </label>
              )
            }

            // Aranabilen combobox — uzun secenek listeleri icin (40+ dil vb.)
            // `select`ten farki: kullanicinin arama yapmasina izin verir.
            if (f.type === 'combobox') {
              const opts = (f.options ?? []).map(o => ({ value: o, label: o }))
              const currentVal = String(value ?? '')
              const selected = currentVal ? [currentVal] : []
              return (
                <div key={f.name} className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">{f.label}</span>
                  <SearchableCombobox
                    options={opts}
                    selected={selected}
                    onSelect={(v) => { setForm(prev => ({ ...prev, [f.name]: v })) }}
                    onClear={() => { setForm(prev => ({ ...prev, [f.name]: '' })) }}
                    placeholder="— seç —"
                    searchPlaceholder="Ara…"
                    ariaLabel={f.label}
                    showAllOption
                    allLabel="— seç —"
                  />
                  {f.help && <span className="text-[11px] text-foreground/50">{f.help}</span>}
                </div>
              )
            }

            if (f.type === 'textarea') {
              return (
                <div key={f.name} className="flex flex-col gap-1">
                  <Textarea
                    label={f.label}
                    value={String(value ?? '')}
                    onValueChange={v => setForm(prev => ({ ...prev, [f.name]: v }))}
                    minRows={3}
                    maxRows={14}
                    placeholder={f.placeholder}
                  />
                  {f.help && <span className="text-[11px] text-foreground/50">{f.help}</span>}
                </div>
              )
            }

            return (
              <div key={f.name} className="flex flex-col gap-1">
                <Input
                  label={f.label}
                  type={f.type === 'number' ? 'number' : 'text'}
                  value={String(value ?? '')}
                  onValueChange={v => setForm(prev => ({ ...prev, [f.name]: v }))}
                  placeholder={f.placeholder}
                  maxLength={f.maxLength}
                  isDisabled={locked}
                  required={f.required}
                />
                {f.help && <span className="text-[11px] text-foreground/50">{f.help}</span>}
              </div>
            )
          })}

          {formError && (
            <p className="rounded-lg border border-danger-200 bg-danger-50 p-2.5 text-sm text-danger">
              {formError}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            <Button color="primary" isLoading={saving} isDisabled={saving} onPress={() => void submitForm()}>
              <Icon icon="material-symbols:save" width={18} height={18} />
              Kaydet
            </Button>
            <Button variant="bordered" onPress={() => setEditing(null)}>
              Vazgeç
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  )
}
