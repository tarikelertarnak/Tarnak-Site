'use client'

import type { IconKind } from '@/lib/icon-kind'
import { useEffect, useState } from 'react'
import { TechIcon } from '@/components/ui/tech-icon'
import { Textarea } from '@/components/ui/textarea'
import {
  detectIconKind,
  ICON_KIND_LABELS,
  ICON_KINDS,
} from '@/lib/icon-kind'

/**
 * Değer zaten kanonik mi? (bkz. `lib/icon-resolve.ts` çıktı biçimleri)
 * Kanonikse kaydetmeden önce sunucuda tekrar çözmeye gerek yok.
 * İstemci paketinde kullanıldığı için `icon-resolve.ts`'te DEĞİL burada.
 */
export function isCanonicalIcon(value: string): boolean {
  const v = value.trim()
  return (
    /^<svg[\s>]/i.test(v)
    || v.startsWith('/')
    || v.startsWith('data:image/')
    || /^[a-z0-9][a-z0-9-]*:[a-z0-9-]+$/i.test(v)
  )
}

/**
 * "İkon" alanı (2026-10-16, kullanıcı isteği).
 *
 * Kullanıcı hangi biçimde yapıştırırsa yapıştırsın (görsel adresi, satır içi
 * SVG, React/TSX bileşeni, shadcn komutu, yerel yol) alan bunu KENDİ algılar,
 * rozetle söyler ve önizler. Algılama başarısız olursa "Gelişmiş: ikon tipi"
 * bölümü kendiliğinden açılır ve tip elle seçilebilir.
 *
 * Kaydedilen değer sunucuda kanonikleştirilir (`/api/admin/icon`); bu bileşen
 * yalnız ÖNİZLEME için aynı uç noktayı çağırır — metin kutusundaki ham metin
 * kullanıcı "Kullan" demeden DEĞİŞTİRİLMEZ.
 */
export function IconField({
  label,
  value,
  onChange,
  help,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  help?: string
  required?: boolean
}) {
  /** 300 ms debounce sonrası YEREL algılama (ağ isteği yok). */
  const [detected, setDetected] = useState<IconKind | null>(() => detectIconKind(value))
  const [manual, setManual] = useState<IconKind | 'auto'>('auto')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [resolved, setResolved] = useState<{
    loading: boolean
    kind: IconKind | null
    icon: string
    warnings: string[]
    message?: string
  }>({ loading: false, kind: null, icon: '', warnings: [] })

  const effectiveKind = manual === 'auto' ? detected : manual
  const undetected = value.trim().length > 0 && effectiveKind === null

  // Sınıflandırma: her tuşta değil, 300 ms duraklamada (kullanıcı isteği).
  useEffect(() => {
    const id = setTimeout(() => setDetected(detectIconKind(value)), 300)
    return () => clearTimeout(id)
  }, [value])

  // Algılanamadıysa yedek seçim bölümünü aç (kullanıcı istediği: "formda uyarı
  // çıksın ve bölüm otomatik açılsın").
  useEffect(() => {
    if (undetected)
      setAdvancedOpen(true)
  }, [undetected])

  // Önizleme + kanonik değer: 600 ms duraklamada sunucuda çözülür.
  useEffect(() => {
    const raw = value.trim()
    if (!raw) {
      setResolved({ loading: false, kind: null, icon: '', warnings: [] })
      return
    }
    let cancelled = false
    const id = setTimeout(() => {
      setResolved(prev => ({ ...prev, loading: true }))
      void (async () => {
        try {
          const res = await fetch('/api/admin/icon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              raw,
              kind: manual === 'auto' ? undefined : manual,
            }),
          })
          const data = await res.json().catch(() => null)
          if (cancelled)
            return
          setResolved({
            loading: false,
            kind: data?.kind ?? null,
            icon: data?.icon ?? '',
            warnings: data?.warnings ?? [],
            message: data?.ok ? undefined : (data?.message ?? 'İkon çözülemedi.'),
          })
        }
        catch {
          if (!cancelled)
            setResolved({ loading: false, kind: null, icon: '', warnings: [], message: 'Sunucuya ulaşılamadı.' })
        }
      })()
    }, 600)

    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [value, manual])

  const canApply = resolved.icon !== '' && resolved.icon.trim() !== value.trim()

  return (
    <div className="flex flex-col gap-1.5">
      <Textarea
        label={required ? `${label} *` : label}
        value={value}
        onValueChange={onChange}
        minRows={3}
        maxRows={12}
        placeholder="Görsel adresi · <svg> kodu · React/TSX bileşeni · npx shadcn… komutu · /uploads/… yolu"
      />

      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {value.trim().length === 0
          ? <span className="text-foreground/50">Yapıştırınca tip otomatik algılanır.</span>
          : undetected
            ? (
                <span className="rounded-full border border-danger-200 bg-danger-50 px-2 py-0.5 font-medium text-danger">
                  Tip algılanamadı, Gelişmiş bölümünden seç
                </span>
              )
            : (
                <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-medium text-primary">
                  {ICON_KIND_LABELS[effectiveKind as IconKind]}
                  {' '}
                  algılandı
                </span>
              )}
        {resolved.loading && <span className="text-foreground/50">çözümleniyor…</span>}
        {canApply && (
          <button
            type="button"
            onClick={() => onChange(resolved.icon)}
            className="rounded-full border border-foreground/20 px-2 py-0.5 font-medium text-foreground transition-colors hover:bg-foreground/5"
          >
            Kanonik değeri kullan
          </button>
        )}
      </div>

      {/* Önizleme: "önizlemede gördüğün = kaydedilen" */}
      {(resolved.icon || resolved.message) && (
        <div className="flex items-start gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-2.5">
          {resolved.icon && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-foreground/10 bg-background text-foreground">
              <TechIcon icon={resolved.icon} label={value.slice(0, 40)} size={22} />
            </span>
          )}
          <div className="min-w-0 flex-1 text-[11px] leading-relaxed">
            {resolved.message
              ? <p className="text-danger">{resolved.message}</p>
              : (
                  <p className="text-foreground/60">
                    Kaydedilecek biçim:
                    {' '}
                    <span className="font-medium text-foreground">
                      {resolved.kind ? ICON_KIND_LABELS[resolved.kind] : '—'}
                    </span>
                    {resolved.icon.startsWith('<svg') && ' (temizlenmiş işaretleme)'}
                  </p>
                )}
            {resolved.warnings.map(w => (
              <p key={w} className="text-amber-500">
                {w}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Yedek: elle tip seçimi — varsayılan KAPALI */}
      <div className="rounded-lg border border-foreground/10">
        <button
          type="button"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen(o => !o)}
          className="flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-medium text-foreground/70 transition-colors hover:bg-foreground/5"
        >
          <span>Gelişmiş: ikon tipi</span>
          <span aria-hidden>{advancedOpen ? '−' : '+'}</span>
        </button>
        {advancedOpen && (
          <div className="flex flex-col gap-2 border-t border-foreground/10 px-3 py-2">
            <label className="flex flex-col gap-1 text-[11px]">
              <span className="text-foreground/60">İkon tipi</span>
              <select
                value={manual}
                onChange={e => setManual(e.target.value as IconKind | 'auto')}
                className="rounded-lg border border-foreground/15 bg-transparent px-2 py-1.5 text-xs"
              >
                <option value="auto">Otomatik (varsayılan)</option>
                {ICON_KINDS.map(k => (
                  <option key={k} value={k}>{ICON_KIND_LABELS[k]}</option>
                ))}
              </select>
            </label>
            <p className="text-[11px] text-foreground/50">
              Otomatik algılama başarısız olursa tipi buradan seç; kaydetme yolu
              seçtiğin tipe göre çözülür.
            </p>
          </div>
        )}
      </div>

      {help && <span className="text-[11px] text-foreground/50">{help}</span>}
    </div>
  )
}
