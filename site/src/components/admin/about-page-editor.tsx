'use client'

import type { ReactNode } from 'react'
import type { AboutItem, AboutPage } from '@/lib/about-page'
import { Icon } from '@iconify/react'
import { useMemo } from 'react'
import { PanelCard } from '@/components/admin/panel-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  aboutPageErrors,
  normalizeAboutPage,
  uniqueKey,
} from '@/lib/about-page'

/**
 * `/about` sayfası içerik editörü (2026-10-17).
 *
 * Neden ayrı bileşen: `SectionsEditor` tek dilli alanlara göre yazılmıştı;
 * burada her metin TR+EN çift, her maddede kararlı `key`, sıralama ve
 * (yalnız yolculukta) opsiyonel dönem var. Mevcut `Input`/`Textarea`/
 * `Button`/`PanelCard` bileşenleri kullanılır — yeni UI bileşeni eklenmedi.
 *
 * İçerik UYDURULMAZ: yeni madde boş başlar; anahtar otomatik üretilir
 * (`madde-N`) ve admin istediğinde başlıktan türetilebilir.
 */
export function AboutPageEditor({
  value,
  onChange,
}: {
  value: unknown
  onChange: (next: AboutPage) => void
}) {
  // Geçici geçersiz durumlarda bile editör çalışsın (bkz. normalizeAboutPage).
  const page = useMemo(() => normalizeAboutPage(value), [value])
  const hatalar = useMemo(() => aboutPageErrors(page), [page])

  const set = (patch: Partial<AboutPage>) => onChange({ ...page, ...patch })
  const setMetin
    = (alan: 'title' | 'intro' | 'closing', dil: 'tr' | 'en', v: string) =>
      set({ [alan]: { ...page[alan], [dil]: v } } as Partial<AboutPage>)

  return (
    <div className="flex flex-col gap-4">
      {hatalar.length > 0 ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-danger">
            <Icon icon="material-symbols:error-outline" width={15} height={15} />
            Kaydetmeden önce düzeltilmesi gerekenler
          </p>
          <ul className="list-inside list-disc text-xs text-foreground-500">
            {hatalar.map(h => <li key={h}>{h}</li>)}
          </ul>
        </div>
      ) : null}

      <PanelCard title="Sayfa başlığı ve metinler">
        <div className="flex flex-col gap-3">
          <BilingualField
            etiket="Sayfa başlığı"
            ipucu="Örn: HAKKIMDA / ABOUT ME"
            value={page.title}
            tekSatir
            onChange={(dil, v) => setMetin('title', dil, v)}
          />
          <BilingualField
            etiket="Giriş metni"
            ipucu="Paragrafları boş satırla ayır."
            value={page.intro}
            rows={8}
            onChange={(dil, v) => setMetin('intro', dil, v)}
          />
          <BilingualField
            etiket="Kapanış metni"
            ipucu="Paragrafları boş satırla ayır."
            value={page.closing}
            rows={4}
            onChange={(dil, v) => setMetin('closing', dil, v)}
          />
        </div>
      </PanelCard>

      <ListeEditor
        baslik="Çalışma alanları"
        aciklama="Ne üzerinde çalıştığın — TR ve EN başlık/açıklama."
        items={page.areas}
        onChange={areas => set({ areas })}
      />
      <ListeEditor
        baslik="Yolculuk"
        aciklama="Geçmiş adımların. Dönem/yıl OPSİYONELDİR — boş bırakılırsa gösterilmez."
        items={page.journey}
        donem
        onChange={journey => set({ journey })}
      />
      <ListeEditor
        baslik="Değerler"
        aciklama="Önemsediklerin."
        items={page.values}
        onChange={values => set({ values })}
      />
    </div>
  )
}

/* ── Tek metin (TR + EN) ──────────────────────────────────────────────── */

function BilingualField({
  etiket,
  ipucu,
  value,
  rows,
  tekSatir,
  onChange,
}: {
  etiket: string
  ipucu?: string
  value: { tr: string, en: string }
  rows?: number
  tekSatir?: boolean
  onChange: (dil: 'tr' | 'en', v: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Alan etiket={`${etiket} (TR)`} ipucu={ipucu}>
        {tekSatir
          ? (
              <Input value={value.tr} onValueChange={v => onChange('tr', v)} />
            )
          : (
              <Textarea
                value={value.tr}
                minRows={rows ?? 4}
                onValueChange={v => onChange('tr', v)}
              />
            )}
      </Alan>
      <Alan etiket={`${etiket} (EN)`}>
        {tekSatir
          ? (
              <Input value={value.en} onValueChange={v => onChange('en', v)} />
            )
          : (
              <Textarea
                value={value.en}
                minRows={rows ?? 4}
                onValueChange={v => onChange('en', v)}
              />
            )}
      </Alan>
    </div>
  )
}

/* ── Sıralı madde listesi ────────────────────────────────────────────── */

function ListeEditor({
  baslik,
  aciklama,
  items,
  donem,
  onChange,
}: {
  baslik: string
  aciklama: string
  items: AboutItem[]
  /** Yalnız "Yolculuk" maddelerinde dönem alanı gösterilir. */
  donem?: boolean
  onChange: (next: AboutItem[]) => void
}) {
  const tasi = (i: number, yon: -1 | 1) => {
    const hedef = i + yon
    if (hedef < 0 || hedef >= items.length)
      return
    const kopya = [...items]
    const gecici = kopya[i]!
    kopya[i] = kopya[hedef]!
    kopya[hedef] = gecici
    onChange(kopya)
  }

  const ekle = () => {
    onChange([
      ...items,
      {
        key: uniqueKey('madde', items.flatMap(i => i.key)),
        title: { tr: '', en: '' },
        description: { tr: '', en: '' },
        period: '',
      },
    ])
  }

  const sil = (i: number) => onChange(items.filter((_, j) => j !== i))

  const guncelle = (i: number, patch: Partial<AboutItem>) => {
    onChange(items.map((item, j) => (j === i ? { ...item, ...patch } : item)))
  }

  return (
    <PanelCard title={`${baslik} (${items.length})`}>
      <p className="mb-3 text-xs text-foreground-500">{aciklama}</p>

      {items.length === 0 ? (
        <p className="mb-3 text-xs text-foreground-500">
          Henüz madde yok. Aşağıdan ekle.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div
            key={`${baslik}-${i}`}
            className="rounded-xl border border-foreground/10 p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground-500">
                #
                {i + 1}
              </span>
              <div className="flex items-center gap-1">
                <IconBtn
                  label="Yukarı taşı"
                  icon="material-symbols:arrow-upward"
                  disabled={i === 0}
                  onClick={() => tasi(i, -1)}
                />
                <IconBtn
                  label="Aşağı taşı"
                  icon="material-symbols:arrow-downward"
                  disabled={i === items.length - 1}
                  onClick={() => tasi(i, 1)}
                />
                <IconBtn
                  label="Sil"
                  icon="material-symbols:delete-outline"
                  danger
                  onClick={() => sil(i)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Alan
                etiket="Anahtar (benzersiz)"
                ipucu="Küçük harf, rakam ve tire. Örn: web-development"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={item.key}
                    onValueChange={v => guncelle(i, { key: v })}
                  />
                  <Button
                    size="sm"
                    variant="bordered"
                    color="default"
                    className="shrink-0"
                    onPress={() =>
                      guncelle(i, {
                        key: uniqueKey(
                          item.title.tr || item.title.en || 'madde',
                          items.flatMap(x => x.key),
                        ),
                      })}
                  >
                    Başlıktan üret
                  </Button>
                </div>
              </Alan>
              {donem
                ? (
                    <Alan etiket="Dönem / yıl (opsiyonel)">
                      <Input
                        value={item.period}
                        onValueChange={v => guncelle(i, { period: v })}
                      />
                    </Alan>
                  )
                : null}
            </div>

            <div className="mt-3">
              <BilingualField
                etiket="Başlık"
                tekSatir
                value={item.title}
                onChange={(dil, v) =>
                  guncelle(i, { title: { ...item.title, [dil]: v } })}
              />
            </div>
            <div className="mt-3">
              <BilingualField
                etiket="Açıklama"
                rows={3}
                value={item.description}
                onChange={(dil, v) =>
                  guncelle(i, { description: { ...item.description, [dil]: v } })}
              />
            </div>
          </div>
        ))}
      </div>

      <Button
        size="sm"
        variant="bordered"
        color="primary"
        className="mt-3 self-start"
        onPress={ekle}
      >
        <Icon icon="material-symbols:add" width={16} height={16} />
        Ekle
      </Button>
    </PanelCard>
  )
}

function Alan({
  etiket,
  ipucu,
  children,
}: {
  etiket: string
  ipucu?: string
  children: ReactNode
}) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium">{etiket}</span>
      {children}
      {ipucu ? (
        <span className="mt-1 block text-[11px] text-foreground/50">
          {ipucu}
        </span>
      ) : null}
    </div>
  )
}

function IconBtn({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: {
  label: string
  icon: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? 'border-danger/30 text-danger hover:bg-danger/10'
          : 'border-foreground/15 text-foreground-500 hover:border-primary/40 hover:text-primary'
      }`}
    >
      <Icon icon={icon} width={16} height={16} />
    </button>
  )
}
