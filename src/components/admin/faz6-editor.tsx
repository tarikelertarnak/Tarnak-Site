'use client'

import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

/**
 * Faz 6 içerik editörü (admin paneli).
 *
 * Neden spec tabanlı: Faz 6'da 7 ayrı liste var (services, testimonials,
 * timeline, certificates, uses, changelog, now). Her birine ayrı form
 * yazmak 7 kopya demek; burada TEK bir bileşen var, alanlar veri olarak
 * aşağıda tanımlı. Yeni bir alan eklemek = spec'e bir satır.
 *
 * İçerik UYDURULMAZ: diziler baştan boş gelir, "Ekle" düğmesiyle
 * kullanıcının girdiği kadar büyür.
 */

/** Bir kaydın alanları — `cocuk` varsa iç içe nesne listesi üretir. */
export interface AlanSpec {
  anahtar: string
  etiket: string
  tip?: 'text' | 'textarea' | 'number' | 'bool' | 'select' | 'list'
  secenekler?: string[]
  ipucu?: string
  /** `cocuk` verilirse bu alan bir NESNE LİSTESİ olur. */
  cocuk?: AlanSpec[]
}

export interface BolumSpec {
  anahtar: string
  baslik: string
  aciklama?: string
  /** Tek satır alanlar (dizi değil). */
  alanlar?: AlanSpec[]
  /** Dizi alanı — liste editörü açılır. */
  liste?: AlanSpec
}

type Kayit = Record<string, unknown>

export function Faz6Editor({
  specs,
  value,
  onChange,
}: {
  specs: BolumSpec[]
  value: Record<string, unknown>
  onChange: (sonraki: Record<string, unknown>) => void
}) {
  return (
    <div className="space-y-4 pt-4">
      {specs.map(spec => (
        <BolumKarti
          key={spec.anahtar}
          spec={spec}
          deger={value[spec.anahtar] as Kayit | undefined}
          onChange={yeni => onChange({ ...value, [spec.anahtar]: yeni })}
        />
      ))}
    </div>
  )
}

function BolumKarti({
  spec,
  deger,
  onChange,
}: {
  spec: BolumSpec
  deger?: Kayit
  onChange: (d: Kayit | undefined) => void
}) {
  const mevcut = deger ?? {}
  return (
    <section className="rounded-2xl border border-foreground/10 p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">{spec.baslik}</h3>
        {spec.aciklama ? (
          <p className="text-xs text-foreground/60">{spec.aciklama}</p>
        ) : null}
      </div>

      {spec.alanlar ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {spec.alanlar.map(alan => (
            <Alan
              key={alan.anahtar}
              spec={alan}
              deger={mevcut[alan.anahtar]}
              onChange={y => onChange({ ...mevcut, [alan.anahtar]: y })}
            />
          ))}
        </div>
      ) : null}

      {spec.liste ? (
        <ListeEdit
          spec={spec.liste}
          deger={
            Array.isArray(mevcut[spec.liste.anahtar])
              ? (mevcut[spec.liste.anahtar] as Kayit[])
              : []
          }
          onChange={y => onChange({ ...mevcut, [spec.liste!.anahtar]: y })}
        />
      ) : null}
    </section>
  )
}

function ListeEdit({
  spec,
  deger,
  onChange,
}: {
  spec: AlanSpec
  deger: Kayit[]
  onChange: (d: Kayit[]) => void
}) {
  const yeniKayit = (): Kayit => {
    const k: Kayit = {}
    if (spec.tip === 'list') {
      k[spec.anahtar] = []
    }
 else {
      for (const a of spec.cocuk ?? [spec]) {
        k[a.anahtar]
          = a.tip === 'bool'
            ? false
            : a.tip === 'number'
              ? 0
              : a.tip === 'list'
                ? []
                : ''
      }
    }
    return k
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      {deger.length === 0 ? (
        <p className="text-xs text-foreground/50">
          Henüz kayıt yok. Aşağıdan ekle.
        </p>
      ) : (
        deger.map((kayit, i) => (
          <div key={i} className="rounded-xl border border-foreground/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground/60">
                #
{i + 1}
              </span>
              <Button
                size="sm"
                variant="ghost"
                color="danger"
                onPress={() => onChange(deger.filter((_, j) => j !== i))}
              >
                <Icon
                  icon="material-symbols:delete-outline"
                  width={16}
                  height={16}
                />
                Sil
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(spec.cocuk ?? [spec]).map(a => (
                <Alan
                  key={a.anahtar}
                  spec={a}
                  deger={kayit[a.anahtar]}
                  onChange={(y) => {
                    const kopya = [...deger]
                    kopya[i] = { ...kopya[i], [a.anahtar]: y }
                    onChange(kopya)
                  }}
                />
              ))}
            </div>
            {(spec.cocuk ?? [spec]).some(a => a.cocuk) && (
              <div className="mt-3 flex flex-col gap-3">
                {(spec.cocuk ?? [spec])
                  .filter(a => a.cocuk)
                  .map(a => (
                    <ListeEdit
                      key={a.anahtar}
                      spec={a}
                      deger={
                        Array.isArray(kayit[a.anahtar])
                          ? (kayit[a.anahtar] as Kayit[])
                          : []
                      }
                      onChange={(y) => {
                        const kopya = [...deger]
                        kopya[i] = { ...kopya[i], [a.anahtar]: y }
                        onChange(kopya)
                      }}
                    />
                  ))}
              </div>
            )}
          </div>
        ))
      )}
      <Button
        size="sm"
        variant="ghost"
        color="primary"
        className="self-start"
        onPress={() => onChange([...deger, yeniKayit()])}
      >
        <Icon icon="material-symbols:add" width={16} height={16} />
        Ekle
      </Button>
    </div>
  )
}

function Alan({
  spec,
  deger,
  onChange,
}: {
  spec: AlanSpec
  deger: unknown
  onChange: (d: unknown) => void
}) {
  const etiket = (
    <span className="mb-1 block text-xs font-medium">{spec.etiket}</span>
  )
  const ipucu = spec.ipucu ? (
    <span className="mt-1 block text-[11px] text-foreground/50">
      {spec.ipucu}
    </span>
  ) : null

  if (spec.tip === 'bool') {
    return (
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={Boolean(deger)}
          onChange={e => onChange(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        {spec.etiket}
      </label>
    )
  }

  if (spec.tip === 'select') {
    return (
      <div>
        {etiket}
        <select
          value={String(deger ?? '')}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-lg border border-foreground/10 bg-background px-3 py-2 text-sm"
        >
          {(spec.secenekler ?? []).map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {ipucu}
      </div>
    )
  }

  if (spec.tip === 'textarea' || spec.tip === 'list') {
    const degerMetin = Array.isArray(deger)
      ? (deger as string[]).join('\n')
      : String(deger ?? '')
    return (
      <div className={spec.tip === 'textarea' ? 'sm:col-span-2' : ''}>
        {etiket}
        <Textarea
          value={degerMetin}
          onValueChange={(v: string) => {
            // `list` tipi: her satır bir kayıt (satır satır girilir).
            onChange(
              spec.tip === 'list'
                ? v
                    .split('\n')
                    .map((s: string) => s.trim())
                    .filter(Boolean)
                : v,
            )
          }}
          placeholder={spec.tip === 'list' ? 'Her satıra bir kayıt' : undefined}
          minRows={spec.tip === 'list' ? 4 : 6}
        />
        {ipucu}
      </div>
    )
  }

  if (spec.tip === 'number') {
    return (
      <div>
        {etiket}
        <Input
          type="number"
          value={String(deger ?? 0)}
          onValueChange={(v: string) => onChange(Number(v) || 0)}
        />
        {ipucu}
      </div>
    )
  }

  return (
    <div>
      {etiket}
      <Input
        value={String(deger ?? '')}
        onValueChange={(v: string) => onChange(v)}
      />
      {ipucu}
    </div>
  )
}

export function Faz6EditorShell({ children }: { children: ReactNode }) {
  return <div className="min-w-0">{children}</div>
}
