'use client'

/**
 * GÖRSEL DÜZENLEME PANELİ (2026-10-30).
 *
 * Kullanıcı isteği: "yan panel gibi açılsın, düzenlenen ekranı küçültür,
 * üzerine geçmez; gruplaması, araması, tutup sürükleme, uçlardan ve köşeden
 * büyütme olsun; metin/boyut/renk/animasyon/CSS/HTML/JS kodsuz düzenlensin".
 *
 * ÇALIŞMA BİÇİMİ
 *   · Kalem (`AdminEditToggle`) `tar:design-mode` olayı yayar; panel o olayla
 *     açılır/kapanır ve `#layout-main`ı sağdan boşaltır (üstüne binmez).
 *   · Seçim modunda imlecin altındaki öğe kare çerçeveyle gösterilir; tıklama
 *     yakalanır (capture + preventDefault) ki link/buton tetiklenmesin.
 *   · Kayıt modeli `src/lib/design.ts`; panel kaydı `/api/admin/design`a
 *     yazar, önizleme anında `tar-design-preview` stil bloğuna derlenir.
 */

import type { DesignAnimation, DesignOverride, DesignStyle } from '@/lib/design'
import type { Locale } from '@/lib/i18n'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { asOverrides } from '@/components/design-runtime'
import {
  buildDesignCss,
  cssPath,
  elementLabel,
  safeId,
} from '@/lib/design'
import {
  applyEditorInset,
  DESIGN_MODE_EVENT,
  setDesignMode,
} from '@/lib/design-editor'
import { LOCALES, NATIVE_NAMES } from '@/lib/i18n'

const ROOT_ID = 'layout-main-content'
const PREVIEW_ID = 'tar-design-preview'
const MIN_W = 300
const MIN_H = 260

const TEXT_LOCALES = ['all', ...LOCALES] as const

const STYLE_FIELDS: { key: keyof DesignStyle, label: string }[] = [
  { key: 'fontSize', label: 'Yazı boyutu' },
  { key: 'fontWeight', label: 'Kalınlık' },
  { key: 'lineHeight', label: 'Satır yüksekliği' },
  { key: 'letterSpacing', label: 'Harf aralığı' },
  { key: 'color', label: 'Renk' },
  { key: 'background', label: 'Arka plan' },
  { key: 'textAlign', label: 'Hizalama' },
  { key: 'textTransform', label: 'Büyük/küçük harf' },
  { key: 'padding', label: 'İç boşluk' },
  { key: 'margin', label: 'Dış boşluk' },
  { key: 'width', label: 'Genişlik' },
  { key: 'maxWidth', label: 'En fazla genişlik' },
  { key: 'height', label: 'Yükseklik' },
  { key: 'gap', label: 'Aralık' },
  { key: 'borderRadius', label: 'Köşe yuvarlaklığı' },
  { key: 'borderWidth', label: 'Kenarlık kalınlığı' },
  { key: 'borderColor', label: 'Kenarlık rengi' },
  { key: 'boxShadow', label: 'Gölge' },
  { key: 'opacity', label: 'Saydamlık' },
  { key: 'transform', label: 'Dönüşüm' },
  { key: 'filter', label: 'Filtre' },
]

/** Öğenin ait olduğu bölüm adı — panelde gruplama başlığı. */
function groupOf(el: Element, root: Element): string {
  const section = el.closest('section')
  if (section && section !== root) {
    const id = section.getAttribute('id')
    if (id)
      return `Bölüm: ${id}`
    const sections = [...root.querySelectorAll('section')]
    const idx = sections.indexOf(section)
    if (idx >= 0)
      return `Bölüm ${idx + 1}`
  }
  return 'Genel'
}

export function VisualEditor() {
  const pathname = usePathname() ?? '/'
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState(420)
  const [height, setHeight] = useState(0) // 0 = tam yükseklik
  const [all, setAll] = useState<DesignOverride[]>([])
  const [draft, setDraft] = useState<DesignOverride | null>(null)
  const [query, setQuery] = useState('')
  const [hoverBox, setHoverBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [textLocale, setTextLocale] = useState<string>('all')
  const dragRef = useRef<{ mode: 'edge' | 'corner', startX: number, startY: number, w: number, h: number } | null>(null)

  const pageOverrides = useMemo(
    () => all.filter(o => o.page === pathname),
    [all, pathname],
  )

  /* ---------------- aç/kapa ---------------- */
  useEffect(() => {
    const onMode = (event: Event) => {
      const on = !!(event as CustomEvent<{ on: boolean }>).detail?.on
      setOpen(on)
      applyEditorInset(on ? width : 0)
    }
    window.addEventListener(DESIGN_MODE_EVENT, onMode)
    return () => window.removeEventListener(DESIGN_MODE_EVENT, onMode)
  }, [width])

  useEffect(() => {
    applyEditorInset(open ? width : 0)
  }, [open, width])

  /* ---------------- kayıtları oku ---------------- */
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/content', { cache: 'no-store' })
      if (!res.ok)
        return
      const data = await res.json() as { content?: { design?: unknown } }
      setAll(asOverrides(data.content?.design))
    }
    catch {
      // Ağ hatası: panel boş listeyle çalışır, kayıt silinmez.
    }
  }, [])

  useEffect(() => {
    if (open)
      void load()
  }, [open, load])

  /* ---------------- canlı önizleme ---------------- */
  useEffect(() => {
    let style = document.getElementById(PREVIEW_ID)
    const css = draft ? buildDesignCss([draft], pathname) : ''
    if (!style && css) {
      style = document.createElement('style')
      style.id = PREVIEW_ID
      document.head.appendChild(style)
    }
    if (style)
      style.textContent = css
  }, [draft, pathname])

  /* ---------------- seçim modu ---------------- */
  useEffect(() => {
    if (!open)
      return
    const root = document.getElementById(ROOT_ID)
    if (!root)
      return

    const onMove = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (!target || !root.contains(target))
        return setHoverBox(null)
      const rect = target.getBoundingClientRect()
      setHoverBox({ x: rect.left, y: rect.top, w: rect.width, h: rect.height })
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (!target || !root.contains(target))
        return
      // Panel içi tıklamalar seçim sayılmaz.
      if (target.closest('[data-tar-panel]'))
        return
      event.preventDefault()
      event.stopPropagation()

      const marker = target.getAttribute('data-tar-el')
      const existing = marker
        ? pageOverrides.find(o => safeId(o.id) === marker)
        : undefined

      if (existing) {
        setDraft({ ...existing })
        setTextLocale('all')
        return
      }

      const id = `el-${Date.now().toString(36)}`
      target.setAttribute('data-tar-el', safeId(id))
      setDraft({
        id,
        page: pathname,
        selector: cssPath(target, root),
        label: elementLabel(target),
        group: groupOf(target, root),
        style: {},
      })
      setTextLocale('all')
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape')
        setDesignMode(false)
    }

    document.addEventListener('mousemove', onMove, true)
    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousemove', onMove, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, pageOverrides, pathname])

  /* ---------------- boyutlandırma ---------------- */
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag)
        return
      const deltaX = drag.startX - event.clientX
      const deltaY = event.clientY - drag.startY
      setWidth(Math.max(MIN_W, Math.min(window.innerWidth - 120, drag.w + deltaX)))
      if (drag.mode === 'corner')
        setHeight(Math.max(MIN_H, Math.min(window.innerHeight - 80, drag.h + deltaY)))
    }
    const onUp = () => {
      dragRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  function startDrag(mode: 'edge' | 'corner', event: React.PointerEvent) {
    event.preventDefault()
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      w: width,
      h: height || window.innerHeight,
    }
  }

  /* ---------------- kaydet / sil ---------------- */
  async function persist(next: DesignOverride[]) {
    setSaving(true)
    setStatus('')
    try {
      const res = await fetch('/api/admin/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: pathname, overrides: next }),
      })
      if (!res.ok) {
        setStatus('Kaydedilemedi (yetki veya doğrulama hatası).')
        return
      }
      setStatus('Kaydedildi.')
      const others = all.filter(o => o.page !== pathname)
      setAll([...others, ...next])
      router.refresh()
    }
    catch {
      setStatus('Kaydedilemedi (ağ hatası).')
    }
    finally {
      setSaving(false)
    }
  }

  async function saveDraft() {
    if (!draft)
      return
    const exists = pageOverrides.some(o => o.id === draft.id)
    const next = exists
      ? pageOverrides.map(o => (o.id === draft.id ? draft : o))
      : [...pageOverrides, draft]
    await persist(next)
  }

  async function removeDraft() {
    if (!draft)
      return
    const next = pageOverrides.filter(o => o.id !== draft.id)
    setDraft(null)
    await persist(next)
  }

  function patchStyle(key: keyof DesignStyle, value: string) {
    setDraft(prev => prev
      ? { ...prev, style: { ...prev.style, [key]: value } }
      : prev)
  }

  function patchAnimation(key: keyof DesignAnimation, value: string) {
    setDraft(prev => prev
      ? {
          ...prev,
          animation: {
            ...prev.animation,
            [key]: key === 'durationMs' || key === 'delayMs' ? Number(value) || 0 : value,
          },
        }
      : prev)
  }

  function patchText(value: string) {
    setDraft(prev => prev
      ? { ...prev, text: { ...prev.text, [textLocale]: value } }
      : prev)
  }

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? pageOverrides.filter(o =>
          `${o.label} ${o.selector} ${o.group ?? ''}`.toLowerCase().includes(q))
      : pageOverrides
    const map = new Map<string, DesignOverride[]>()
    for (const o of filtered) {
      const key = o.group || 'Genel'
      const list = map.get(key) ?? []
      list.push(o)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [pageOverrides, query])

  if (!open)
    return null

  return (
    <>
      {/* Seçim çerçevesi — panelin ve sayfanın üstünde, tıklamayı geçirir. */}
      {hoverBox && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[60] rounded-sm border-2 border-primary"
          style={{
            left: hoverBox.x,
            top: hoverBox.y,
            width: hoverBox.w,
            height: hoverBox.h,
            boxShadow: '0 0 0 1px rgba(37,99,235,.35)',
          }}
        />
      )}

      <aside
        data-tar-panel
        style={{ width, ...(height ? { height } : {}) }}
        className={`fixed top-0 right-0 z-[70] flex flex-col border-l border-white/15 bg-[#0b0b0e] text-foreground ${
          height ? 'bottom-auto' : 'bottom-0'
        }`}
      >
        {/* Sol kenar: genişlik tutamacı */}
        <div
          role="separator"
          aria-orientation="vertical"
          onPointerDown={e => startDrag('edge', e)}
          className="absolute top-0 bottom-0 -left-1 w-2 cursor-ew-resize hover:bg-primary/40"
        />
        {/* Sol alt köşe: çift yönlü tutamaç */}
        <div
          onPointerDown={e => startDrag('corner', e)}
          className="absolute -left-1 -bottom-1 h-4 w-4 cursor-nesw-resize rounded-sm border border-white/30"
          aria-hidden
        />

        <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold uppercase tracking-wide">
              Görsel Düzenleme
            </div>
            <div className="truncate text-[11px] text-foreground/50">{pathname}</div>
          </div>
          <button
            type="button"
            onClick={() => setDesignMode(false)}
            className="rounded border border-white/15 px-2 py-1 text-[11px] hover:bg-white/10"
          >
            Kapat
          </button>
        </header>

        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ara: başlık, seçici, grup…"
            className="h-8 min-w-0 flex-1 rounded border border-white/15 bg-white/5 px-2 text-xs outline-none focus:border-primary"
          />
          <span className="shrink-0 text-[11px] text-foreground/50">
            {pageOverrides.length}
{' '}
kayıt
</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          <p className="mb-2 text-[11px] text-foreground/50">
            Sayfada bir öğenin üzerine gel, tıkla — düzenleme formu açılır.
          </p>

          {groups.length === 0 && (
            <p className="text-xs text-foreground/40">Bu sayfada kayıt yok.</p>
          )}

          {groups.map(([group, items]) => (
            <div key={group} className="mb-3">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-foreground/40">
                {group}
              </div>
              <ul className="space-y-1">
                {items.map(item => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft({ ...item })
                        setTextLocale('all')
                      }}
                      className={`w-full truncate rounded border px-2 py-1 text-left text-xs transition-colors ${
                        draft?.id === item.id
                          ? 'border-primary bg-primary/15'
                          : 'border-white/10 hover:bg-white/5'
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {draft && (
            <div className="mt-3 rounded border border-primary/40 bg-white/[0.03] p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold">{draft.label}</span>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="shrink-0 text-[11px] text-foreground/50 hover:text-foreground"
                >
                  kapat
                </button>
              </div>

              <label className="mb-1 block text-[10px] uppercase text-foreground/40">
                Seçici
              </label>
              <input
                value={draft.selector}
                onChange={e => setDraft({ ...draft, selector: e.target.value })}
                className="mb-2 h-7 w-full rounded border border-white/15 bg-white/5 px-2 font-mono text-[11px] outline-none focus:border-primary"
              />

              <label className="mb-1 block text-[10px] uppercase text-foreground/40">
                Metin dili
              </label>
              <select
                value={textLocale}
                onChange={e => setTextLocale(e.target.value)}
                className="mb-2 h-7 w-full rounded border border-white/15 bg-[#15151a] px-2 text-[11px] outline-none focus:border-primary"
              >
                {TEXT_LOCALES.map(l => (
                  <option key={l} value={l}>
                    {l === 'all' ? 'Hepsi (tüm diller)' : `${NATIVE_NAMES[l as Locale]} (${l})`}
                    {/* Bu dilde metin yazılmışsa işaretle — "çevirisi olan dil görünür". */}
                    {draft.text?.[l]?.trim() ? ' ✓' : ''}
                  </option>
                ))}
              </select>
              <textarea
                value={draft.text?.[textLocale] ?? ''}
                onChange={e => patchText(e.target.value)}
                rows={3}
                placeholder={textLocale === 'all'
                  ? 'Tüm dillerde aynı metin (boş → özgün metin)'
                  : 'Bu dilde metin (boş → "Hepsi" değeri)'}
                className="mb-2 w-full rounded border border-white/15 bg-white/5 px-2 py-1 text-xs outline-none focus:border-primary"
              />

              <div className="mb-2 grid grid-cols-2 gap-1">
                {STYLE_FIELDS.map(field => (
                  <input
                    key={field.key}
                    value={draft.style?.[field.key] ?? ''}
                    onChange={e => patchStyle(field.key, e.target.value)}
                    placeholder={field.label}
                    title={field.label}
                    className="h-7 w-full rounded border border-white/15 bg-white/5 px-2 text-[11px] outline-none focus:border-primary"
                  />
                ))}
              </div>

              <div className="mb-2 grid grid-cols-3 gap-1">
                <input
                  value={draft.animation?.durationMs ?? ''}
                  onChange={e => patchAnimation('durationMs', e.target.value)}
                  placeholder="süre ms"
                  className="h-7 w-full rounded border border-white/15 bg-white/5 px-2 text-[11px]"
                />
                <input
                  value={draft.animation?.easing ?? ''}
                  onChange={e => patchAnimation('easing', e.target.value)}
                  placeholder="easing"
                  className="h-7 w-full rounded border border-white/15 bg-white/5 px-2 text-[11px]"
                />
                <input
                  value={draft.animation?.iteration ?? ''}
                  onChange={e => patchAnimation('iteration', e.target.value)}
                  placeholder="tekrar"
                  className="h-7 w-full rounded border border-white/15 bg-white/5 px-2 text-[11px]"
                />
              </div>
              <textarea
                value={draft.animation?.keyframes ?? ''}
                onChange={e => patchAnimation('keyframes', e.target.value)}
                rows={2}
                placeholder="keyframes: from { opacity: 0 } to { opacity: 1 }"
                className="mb-2 w-full rounded border border-white/15 bg-white/5 px-2 py-1 font-mono text-[11px]"
              />

              <textarea
                value={draft.css ?? ''}
                onChange={e => setDraft({ ...draft, css: e.target.value })}
                rows={2}
                placeholder="Ek CSS (seçici otomatik eklenir)"
                className="mb-2 w-full rounded border border-white/15 bg-white/5 px-2 py-1 font-mono text-[11px]"
              />
              <textarea
                value={draft.html ?? ''}
                onChange={e => setDraft({ ...draft, html: e.target.value })}
                rows={2}
                placeholder="HTML içerik (boş → dokunulmaz)"
                className="mb-2 w-full rounded border border-white/15 bg-white/5 px-2 py-1 font-mono text-[11px]"
              />
              <textarea
                value={draft.js ?? ''}
                onChange={e => setDraft({ ...draft, js: e.target.value })}
                rows={2}
                placeholder="JS (element, root) => …"
                className="mb-2 w-full rounded border border-white/15 bg-white/5 px-2 py-1 font-mono text-[11px]"
              />

              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveDraft()}
                  className="rounded bg-primary px-3 py-1 text-[11px] font-semibold text-primary-fg disabled:opacity-60"
                >
                  {saving ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, style: {}, animation: undefined, css: '', html: '', js: '' })}
                  className="rounded border border-white/15 px-2 py-1 text-[11px] hover:bg-white/10"
                >
                  Sıfırla
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void removeDraft()}
                  className="rounded border border-red-500/50 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/10"
                >
                  Sil
                </button>
              </div>
              {status && <p className="mt-1 text-[11px] text-foreground/60">{status}</p>}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
