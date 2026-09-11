'use client'

/**
 * Puck visual page editor (shared component).
 * Used both on the /admin/puck/... route and in the page-top overlay (URL unchanged).
 * When `onClose` is given it is overlay mode: shows the close label instead of the back label.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Puck } from '@measured/puck'
import '@measured/puck/dist/index.css'
import { config, SAMPLE_DATA } from '@/lib/puck/config'
import { normalizePage } from '@/lib/puck/normalize'
import { cn } from '@/components/ui/cn'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type Mode = 'edit' | 'preview'
type Version = { id: string; name: string; ts: string }

const EMPTY_DATA = { root: { props: {} }, content: [], zones: {} } as const

function validateData(d: unknown): Record<string, unknown> | null {
  if (!d || typeof d !== 'object') return null
  const obj = d as Record<string, unknown>
  if (!Array.isArray(obj.content)) return null
  return obj
}

/* ── Component → icon map (Unicode symbols — safe for innerHTML) ── */
const COMPONENT_ICONS: Record<string, string> = {
  HeroBlock: '🏗',
  HeroWelcome: '👋',
  HeadingBlock: 'H',
  ParagraphBlock: '¶',
  ImageBlock: '🖼',
  ButtonBlock: '⬜',
  SpacerBlock: '↕',
  ColumnsBlock: '擇',
  ColoredBox: '🎨',
  QuoteBlock: '❝',
  DividerBlock: '—',
  VideoBlock: '▶',
  StatsBlock: '📊',
  ImageGalleryBlock: '🖼',
  TagCloudBlock: '🏷',
}
const DEFAULT_ICON = '□'

export function PuckEditor({
  page,
  onClose,
}: {
  page: string
  onClose?: () => void
}) {
  const path = normalizePage(page)
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [dataKey, setDataKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [isClient, setIsClient] = useState(false)
  const [mode, setMode] = useState<Mode>('edit')
  const [versions, setVersions] = useState<Version[] | null>(null)
  const [showVersions, setShowVersions] = useState(false)
  const [snack, setSnack] = useState('')
  const [zoomValue, setZoomValue] = useState('100')
  const puckRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => setIsClient(true), [])

  const load = useCallback(async () => {
    setLoading(true); setData(null)
    try {
      const res = await fetch(`/api/admin/puck?page=${encodeURIComponent(path)}`)
      const json = await res.json()
      // Unpublished page → show sample content (instead of an empty canvas)
      setData(validateData(json.data) || (SAMPLE_DATA as Record<string, unknown>))
    } catch { setData(null) } finally { setLoading(false) }
  }, [path])

  useEffect(() => { load().catch(() => {}) }, [load])

  const toast = (msg: string) => { setSnack(msg); setTimeout(() => setSnack(''), 2500) }

  /* ── Inject component icons (after Puck mounts) ── */
  useEffect(() => {
    if (mode !== 'edit' || loading) return
    const timer = setTimeout(() => {
      const el = puckRef.current
      if (!el) return
      el.querySelectorAll('[class*="DrawerItem-name"]').forEach((nameEl) => {
        const name = nameEl.textContent?.trim() || ''
        const iconSvg = COMPONENT_ICONS[name] || DEFAULT_ICON
        nameEl.querySelectorAll('[data-puck-icon]').forEach(el => el.remove())
        const draggable = nameEl.closest('[class*="DrawerItem-draggable"]')
        const item = draggable || nameEl.closest('[class*="DrawerItem"]')
        if (item && !item.querySelector('[data-puck-icon]')) {
          const icon = document.createElement('span')
          icon.setAttribute('data-puck-icon', '1')
          icon.innerHTML = iconSvg
          icon.className = 'puck-comp-icon'
          if (draggable) { draggable.prepend(icon) } else { item.prepend(icon) }
        }
      })
    }, 800)
    return () => clearTimeout(timer)
  }, [mode, loading, dataKey])

  /* ── Component search: add a filter input at the top of the drawer ── */
  useEffect(() => {
    if (mode !== 'edit' || loading) return
    const timer = setTimeout(() => {
      const el = puckRef.current
      if (!el) return
      const drawer = el.querySelector('[class*="_Drawer_"]') as HTMLElement | null
      if (!drawer) return
      if (drawer.querySelector('.puck-drawer-search')) return

      const search = document.createElement('input')
      search.className = 'puck-drawer-search'
      search.type = 'search'
      search.placeholder = 'Bileşen ara…'
      search.title = 'Bileşen ara'
      search.addEventListener('input', () => {
        const q = search.value.trim().toLowerCase()
        ;[...drawer.children].forEach((c) => {
          const rowEl = c as HTMLElement
          if (rowEl.classList.contains('puck-drawer-search')) return
          const name =
            rowEl.querySelector('[class*="DrawerItem-name"]')?.textContent?.trim() || ''
          rowEl.style.display =
            !q || name.toLowerCase().includes(q) || rowEl.textContent?.toLowerCase().includes(q)
              ? ''
              : 'none'
        })
      })
      drawer.prepend(search)
    }, 950)
    return () => clearTimeout(timer)
  }, [mode, loading, dataKey])

  /* ── Components list: drag-and-drop ordering (grip handle + localStorage) ── */
  useEffect(() => {
    if (mode !== 'edit' || loading) return
    const timer = setTimeout(() => {
      const el = puckRef.current
      if (!el) return
      const section = el.querySelector('[class*="SidebarSection"][class*="noBorderTop"]') as HTMLElement | null
      const drawer = el.querySelector('[class*="_Drawer_"]') as HTMLElement | null
      if (!section || !drawer) return
      const KEY = 'puck-component-order'
      const nameOf = (row: HTMLElement) =>
        (row.querySelector('[class*="DrawerItem-name"]') as HTMLElement | null)?.textContent?.trim() || ''
      // The search input is a child of the drawer, so filter here
      const isRow = (e: Element) => !(e as HTMLElement).classList.contains('puck-drawer-search')
      const liveRows = () => [...drawer.children].filter(isRow) as HTMLElement[]
      const rowOf = (g: HTMLElement) => liveRows().find(r => r.contains(g))

      // Apply the saved order (it also survives Puck re-renders)
      try {
        const saved = JSON.parse(localStorage.getItem(KEY) || '[]') as string[]
        if (Array.isArray(saved) && saved.length) {
          const byName = new Map(liveRows().map(r => [nameOf(r), r]))
          for (const n of saved) {
            const r = byName.get(n)
            if (r) { drawer.appendChild(r); byName.delete(n) }
          }
        }
      } catch { /* corrupt record → ignore */ }

      // Grip handles — added to the same flex row as the icon (DrawerItem-draggable)
      liveRows().forEach((row) => {
        const inner = (row.querySelector('[class*="DrawerItem-draggable"]') as HTMLElement | null) || row
        if (inner.querySelector('.puck-reorder-grip')) return
        const grip = document.createElement('span')
        grip.className = 'puck-reorder-grip'
        grip.title = 'Sıralamak için sürükle'
        grip.innerHTML = '⋮⋮'
        grip.draggable = true
        inner.prepend(grip)
      })

      // Reorder — the drawer's direct children (rows) are moved
      drawer.addEventListener('dragstart', (e) => {
        const grip = (e.target as HTMLElement)?.closest?.('.puck-reorder-grip')
        if (grip) (grip as HTMLElement).setAttribute('data-dragging', '1')
      })
      drawer.addEventListener('dragover', (e: DragEvent) => {
        const grip = drawer.querySelector('.puck-reorder-grip[data-dragging]') as HTMLElement | null
        if (!grip) return
        e.preventDefault()
        const dragging = rowOf(grip)
        if (!dragging) return
        const after = liveRows().find(r => r !== dragging && e.clientY < r.getBoundingClientRect().top + r.offsetHeight / 2)
        if (after) drawer.insertBefore(dragging, after)
        else drawer.appendChild(dragging)
        dragging.classList.add('puck-dragging')
      })
      drawer.addEventListener('drop', (e) => { e.preventDefault() })
      drawer.addEventListener('dragend', (e) => {
        ;(e.target as HTMLElement)?.removeAttribute?.('data-dragging')
        drawer.querySelectorAll('.puck-dragging').forEach(el => el.classList.remove('puck-dragging'))
        try {
          const order = liveRows().map(nameOf).filter(Boolean)
          localStorage.setItem(KEY, JSON.stringify(order))
        } catch { /* yoksay */ }
      })
    }, 900)
    return () => clearTimeout(timer)
  }, [mode, loading, dataKey])

  /* ── Zoom control ── */
  const handleZoomReset = useCallback(() => {
    const el = puckRef.current
    if (!el) return
    const zoomSelect = el.querySelector('select[class*="ViewportControls-zoom"]') as HTMLSelectElement | null
    if (zoomSelect) {
      const opts = [...zoomSelect.options].map(o => ({ val: parseFloat(o.value), el: o }))
      const target = opts.reduce((prev, curr) => Math.abs(curr.val - 1) < Math.abs(prev.val - 1) ? curr : prev)
      zoomSelect.value = target.el.value
      zoomSelect.dispatchEvent(new Event('change', { bubbles: true }))
      setZoomValue('100')
    }
  }, [])

  const handleZoomInput = useCallback((val: string) => {
    const num = parseInt(val, 10)
    if (isNaN(num)) return
    const clamped = Math.min(500, Math.max(10, num))
    setZoomValue(String(clamped))
    const el = puckRef.current
    if (!el) return
    const zoomSelect = el.querySelector('select[class*="ViewportControls-zoom"]') as HTMLSelectElement | null
    if (zoomSelect) {
      const decimal = clamped / 100
      const opts = [...zoomSelect.options].map(o => ({ val: parseFloat(o.value), el: o }))
      const closest = opts.reduce((prev, curr) => Math.abs(curr.val - decimal) < Math.abs(prev.val - decimal) ? curr : prev)
      zoomSelect.value = closest.el.value
      zoomSelect.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }, [])

  /* ── Viewport/Zoom toolbar inject ── */
  useEffect(() => {
    if (mode !== 'edit' || loading) return
    const timer = setTimeout(() => {
      const el = puckRef.current
      if (!el) return
      const rightGroup = document.getElementById('puck-topbar-right')
      if (!rightGroup || rightGroup.querySelector('.puck-header-toolbar')) return

      const publishBtn = [...rightGroup.querySelectorAll('button')].find(b => b.textContent?.includes('Yayınla'))
      if (!publishBtn) return

      const toolbar = document.createElement('div')
      toolbar.className = 'puck-header-toolbar'
      toolbar.innerHTML = `
        <div class="puck-device-switcher" style="display:flex;align-items:center;gap:8px;">
          <span style="color:rgba(255,255,255,0.4);font-size:11px;">Cihaz:</span>
          <select class="puck-device-select" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:4px;color:#e5e7eb;padding:4px 8px;font-size:11px;cursor:pointer;">
            <option value="desktop">Masaüstü</option>
            <option value="tablet">Tablet</option>
            <option value="mobile">Mobil</option>
          </select>
        </div>
        <div class="puck-zoom-bar" style="display:flex;align-items:center;gap:6px;">
          <button class="puck-zoom-reset" title="Zoom'u sıfırla (100%)" style="width:24px;height:24px;border-radius:4px;border:none;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;">↺</button>
          <input class="puck-zoom-input" type="number" min="10" max="500" step="10" value="100" title="Zoom yüzdesi (10-500)" style="width:52px;height:26px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:4px;color:#e5e7eb;font-size:11px;text-align:center;padding:0 4px;outline:none;" />
          <span style="color:rgba(255,255,255,0.4);font-size:11px">%</span>
        </div>
      `
      rightGroup.insertBefore(toolbar, publishBtn)

      const deviceSelect = toolbar.querySelector('.puck-device-select') as HTMLSelectElement
      const zoomInput = toolbar.querySelector('.puck-zoom-input') as HTMLInputElement
      const zoomReset = toolbar.querySelector('.puck-zoom-reset') as HTMLButtonElement
      const zoomSelect = el.querySelector('select[class*="ViewportControls-zoom"]') as HTMLSelectElement | null

      deviceSelect?.addEventListener('change', () => {
        const canvas = el.querySelector('[class*="PuckCanvas-root_18jay_30"]') as HTMLElement | null
        if (canvas) { canvas.dataset.device = deviceSelect.value; canvas.style.setProperty('--device', deviceSelect.value) }
      })
      zoomInput?.addEventListener('change', () => handleZoomInput(zoomInput.value))
      zoomInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleZoomInput(zoomInput.value) })
      zoomReset?.addEventListener('click', () => { handleZoomReset(); zoomInput.value = '100' })

      if (zoomSelect) {
        const currentDecimal = parseFloat(zoomSelect.value) || 1
        if (zoomInput) zoomInput.value = String(Math.round(currentDecimal * 100))
        zoomSelect.addEventListener('change', () => {
          const v = parseFloat(zoomSelect.value) || 1
          if (zoomInput) zoomInput.value = String(Math.round(v * 100))
          setZoomValue(String(Math.round(v * 100)))
        })
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [mode, loading, dataKey, handleZoomInput, handleZoomReset])

  /* ── Toolbar actions ── */
  const exportJson = () => {
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${path}-duzen.json`
    a.click(); URL.revokeObjectURL(a.href)
  }

  const importJson = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = validateData(JSON.parse(String(reader.result)))
        if (!parsed) throw new Error('geçersiz')
        setData(parsed); setDataKey((k) => k + 1); toast('İçe aktarıldı ✓')
      } catch { toast('Dosya geçersiz') }
    }
    reader.readAsText(file)
  }

  const resetPage = () => {
    if (!window.confirm('Yayınlanmış düzene mi dönülsün?')) return
    load().catch(() => {}); setDataKey((k) => k + 1)
  }

  const saveVersion = () => {
    const name = window.prompt('Düzen adı:', `Düzen ${new Date().toLocaleString('tr-TR')}`)
    if (!name || !data) return
    fetch('/api/admin/puck', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: path, action: 'saveVersion', name, data }),
    }).then(r => r.json()).then(j => {
      if (j.success) { toast('Düzen kaydedildi ✓'); setVersions(j.versions || null) } else toast('Kaydedilemedi')
    }).catch(() => toast('Kaydedilemedi'))
  }

  const openVersions = () => {
    const next = !showVersions; setShowVersions(next)
    if (next) fetch(`/api/admin/puck?page=${encodeURIComponent(path)}&action=versions`)
      .then(r => r.json()).then(j => setVersions(j.versions || [])).catch(() => setVersions([]))
  }

  const loadVersion = (id: string) => {
    fetch('/api/admin/puck', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: path, action: 'loadVersion', id }),
    }).then(r => r.json()).then(j => {
      if (j.success && validateData(j.data)) { setData(j.data as Record<string, unknown>); setDataKey((k) => k + 1); toast('Sürüm yüklendi ✓') } else toast('Yüklenemedi')
    }).catch(() => toast('Yüklenemedi'))
  }

  const deleteVersion = (id: string) => {
    if (!window.confirm('Bu düzen silinsin mi?')) return
    fetch('/api/admin/puck', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: path, action: 'deleteVersion', id }),
    }).then(r => r.json()).then(j => j.success && setVersions(j.versions || [])).catch(() => {})
  }

  if (!isClient) return null

  const btn = 'rounded-md border border-black/15 px-3 py-1.5 text-xs text-black/70 hover:border-black/40 dark:border-white/20 dark:text-white/70 dark:hover:border-white/60 disabled:opacity-40'

  return (
    <div className={cn('flex flex-col', onClose ? 'h-dvh' : 'h-[calc(100dvh-56px)]')}>
      {/* ── Global CSS overrides ── */}
      <style>{`
        html.dark {
          --puck-color-white: #1a1b21; --puck-color-black: #f1f2f4;
          --puck-color-grey-01: #f1f2f4; --puck-color-grey-02: #d8dae0;
          --puck-color-grey-03: #b9bcc4; --puck-color-grey-04: #9a9da6;
          --puck-color-grey-05: #80838b; --puck-color-grey-06: #6b6e76;
          --puck-color-grey-07: #585b63; --puck-color-grey-08: #45474e;
          --puck-color-grey-09: #33353c; --puck-color-grey-10: #23252b;
          --puck-color-grey-11: #1a1b21; --puck-color-grey-12: #14151a;
        }
        html.dark ._PuckCanvas-root_18jay_30 { background: #0a0a0f; border-color: rgba(255,255,255,0.12); }
        html.light ._PuckCanvas-root_18jay_30 { background: #ffffff; }
        html.dark ._PuckHeader-inner_15xnq_10 > *:nth-child(2) { visibility: hidden; }
        html.dark ._PuckCanvas-controls_18jay_16 { display: none !important; }
        html.dark ._ViewportControls-zoomSelect_gejzr_21 { display: none !important; }
        .puck-editor-wrap { height: 100%; }
        .puck-editor-wrap > * { height: 100% !important; }
        .puck-editor-wrap .Puck > div,
        .puck-editor-wrap [class*="Puck-portal"],
        .puck-editor-wrap [class*="PuckLayout"] { height: 100% !important; }
        .puck-comp-icon { width: 18px; height: 18px; flex-shrink: 0; color: rgba(255,255,255,0.5); display: flex; align-items: center; justify-content: center; font-size: 13px; background: rgba(255,255,255,0.06); border-radius: 3px; }
        [class*="DrawerItem-draggable"] { display: flex; align-items: center; gap: 8px !important; }
        .puck-reorder-grip { cursor: grab; color: rgba(140,140,150,0.8); font-size: 10px; letter-spacing: -1px; padding: 0 1px; flex-shrink: 0; user-select: none; line-height: 1; }
        .puck-reorder-grip:hover { color: rgba(255,255,255,0.8); }
        .puck-dragging { opacity: 0.35; }
        .puck-header-toolbar { display: flex; align-items: center; gap: 8px; padding-left: 10px; margin-left: 4px; border-left: 1px solid rgba(255,255,255,0.1); }
        .puck-device-select:focus { outline: none; border-color: rgba(96,165,250,0.5); }
        .puck-zoom-input:focus { outline: none; border-color: rgba(96,165,250,0.5); }
        .puck-zoom-reset:hover { background: rgba(255,255,255,0.12); color: #e5e7eb; }
        .puck-device-select:hover { border-color: rgba(255,255,255,0.2); }
        /* Component search box */
        .puck-drawer-search {
          display: block !important; width: calc(100% - 16px); margin: 8px 8px 4px;
          padding: 7px 10px; font-size: 12px; color: #e5e7eb; border-radius: 6px;
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.14); outline: none;
        }
        .puck-drawer-search:focus { border-color: rgba(96,165,250,0.55); background: rgba(255,255,255,0.1); }
        .puck-drawer-search::placeholder { color: rgba(255,255,255,0.35); }
      `}</style>

      {/* ── Top bar ── */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-black/10 bg-white px-4 py-2 text-sm text-black dark:border-white/10 dark:bg-[#0d0d12] dark:text-white">
        <div className="flex items-center gap-3">
          {onClose ? (
            <button
              onClick={onClose}
              className="text-black/50 hover:text-black dark:text-white/60 dark:hover:text-white"
            >
              ✕ Kapat
            </button>
          ) : (
            <Link href="/admin" className="text-black/50 hover:text-black dark:text-white/60 dark:hover:text-white">← Panel</Link>
          )}
          <span className="font-medium">Sayfa Düzenleyici</span>
          <code className="rounded bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">{path}</code>
        </div>
        <div id="puck-topbar-right" className="flex flex-wrap items-center gap-3">
          {saveState === 'saved' && <span className="text-green-600 dark:text-green-400">Kaydedildi ✓</span>}
          {saveState === 'saving' && <span className="text-black/50 dark:text-white/50">Kaydediliyor…</span>}
          {saveState === 'error' && <span className="text-red-500 dark:text-red-400">Kaydetme hatası</span>}
          <div className="flex overflow-hidden rounded-md border border-black/15 dark:border-white/20">
            <button className={mode === 'edit' ? 'bg-black/10 px-3 py-1.5 text-xs dark:bg-white/15' : 'px-3 py-1.5 text-xs text-black/60 dark:text-white/60'} onClick={() => setMode('edit')}>Düzenle</button>
            <button className={mode === 'preview' ? 'bg-black/10 px-3 py-1.5 text-xs dark:bg-white/15' : 'px-3 py-1.5 text-xs text-black/60 dark:text-white/60'} onClick={() => setMode('preview')}>Önizle</button>
          </div>
          <Link href={`/puck/${path}`} target="_blank" className={btn}>Yeni Sekme</Link>
          <button className={btn} onClick={exportJson} disabled={!data}>Dışa Aktar</button>
          <button className={btn} onClick={() => fileRef.current?.click()}>İçe Aktar</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = '' }} />
          <button className={btn} onClick={resetPage} disabled={!data}>Sıfırla</button>
          <button className={btn} onClick={saveVersion} disabled={!data}>Düzeni Kaydet</button>
          <div className="relative">
            <button className={btn} onClick={openVersions}>Sürümler{versions && versions.length > 0 ? ` (${versions.length})` : ''}</button>
            {showVersions && (
              <div className="absolute right-0 top-9 z-50 max-h-72 w-64 overflow-auto rounded-md border border-black/15 bg-white p-2 shadow-xl dark:border-white/15 dark:bg-[#16161d]">
                <div className="mb-1 flex items-center justify-between px-1 text-xs text-black/50 dark:text-white/50">
                  <span>Kayıtlı düzenler</span>
                  <button onClick={() => setShowVersions(false)}>✕</button>
                </div>
                {versions === null ? <p className="px-1 py-2 text-xs text-black/40 dark:text-white/40">Yükleniyor…</p>
                  : versions.length === 0 ? <p className="px-1 py-2 text-xs text-black/40 dark:text-white/40">Henüz kayıtlı düzen yok.</p>
                  : versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between gap-2 rounded px-1 py-1 hover:bg-black/5 dark:hover:bg-white/5">
                      <button className="min-w-0 flex-1 text-left text-xs" title={v.ts} onClick={() => loadVersion(v.id)}>{v.name}</button>
                      <button className="text-black/40 hover:text-red-500 dark:text-white/40 dark:hover:text-red-400" onClick={() => deleteVersion(v.id)}>🗑</button>
                    </div>
                  ))}
              </div>
            )}
          </div>
          <button className={btn + ' border-emerald-500/40 text-emerald-600 dark:border-emerald-400/40 dark:text-emerald-300'} onClick={async () => {
            if (!data) return; setSaveState('saving')
            try {
              const res = await fetch('/api/admin/puck', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: path, data }) })
              const json = await res.json().catch(() => null); setSaveState(json?.success ? 'saved' : 'error')
            } catch { setSaveState('error') }
            setTimeout(() => setSaveState('idle'), 2500)
          }}>Yayınla</button>
          {snack && <span className="text-xs text-yellow-600 dark:text-yellow-300/90">{snack}</span>}
        </div>
      </div>

      {/* ── Editor / Preview — fills the remaining space ── */}
      <div className="relative min-h-0 flex-1">
        {mode === 'preview' ? (
          <iframe key={`preview-${dataKey}`} src={`/puck/${path}?embed=1`} className="h-full w-full border-0 bg-white dark:bg-black" />
        ) : loading ? (
          <div className="flex h-full items-center justify-center text-black/50 dark:text-white/50">Yükleniyor…</div>
        ) : (
          <div ref={puckRef} className="puck-editor-wrap">
            <Puck
              key={dataKey}
              config={config}
              data={(data as Parameters<typeof Puck>[0]['data']) || EMPTY_DATA}
              onPublish={async (published) => {
                setSaveState('saving')
                try {
                  const res = await fetch('/api/admin/puck', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: path, data: published }) })
                  const json = await res.json().catch(() => null); setSaveState(json?.success ? 'saved' : 'error')
                } catch { setSaveState('error') }
                setTimeout(() => setSaveState('idle'), 2500)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
