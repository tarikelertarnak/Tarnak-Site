'use client'

import type { ButtonProps } from '@/components/ui/button'
import type { CvDoc } from '@/lib/cv'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useT } from '@/components/locale-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronDownIcon, DownloadIcon, EyeIcon } from '@/components/ui/icons'
import { SplitButton } from '@/components/ui/split-button'

/**
 * CV seçici — aramalı (search) combobox.
 *
 * Sıralama: geçerli sayfa dili en üstte "önerilen" olarak, kalanı DB `sort_order`.
 * Tek kayıt varsa combobox gereksiz — düz İndir / Görüntüle butonları.
 *
 * `ponytail: getCvs() 5 dk cache'li — dil değişimi sıralamayı etkiler, veriyi
 * değil; bir yenileme gerekirse CV_CACHE_TTL_MS düşürülebilir.`
 */
export function CvPicker({
  cvs,
  ...rest
}: { cvs: CvDoc[] } & Omit<ButtonProps, 'href' | 'onClick' | 'children'>) {
  const { t } = useT()
  const { locale } = useLocale()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open)
      return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Geçerli sayfa dili en üstte; geri kalanı DB'nin verdiği sırada.
  const ordered = useMemo(
    () => [...cvs].sort((a, b) => Number(b.lang === locale) - Number(a.lang === locale)),
    [cvs, locale],
  )
  const needle = q.trim().toLowerCase()
  const filtered = needle
    ? ordered.filter(c =>
      c.label.toLowerCase().includes(needle) || c.lang.toLowerCase().includes(needle))
    : ordered

  const label = t('about.cvView')

if (cvs.length <= 1) {
    const href = cvs[0]?.href ?? '/cv/tarikeler-cv.pdf'
    /*
      Tek kayit -> birlesik (split) buton: [goz ikonu CV] | [indir].
      Geometrinin TEK sahibi `SplitButton` (bkz. split-button.tsx). Burada
      elle `<div>` + iki `<Button>` yazmak yazildi ve sonuc bozuk oldu:
      LobeButton her parçaya kendi `rounded-lg`/padding'ini dayatıyor, iki
      parça arasında çatlak ve yuvarlak ic koseler kaliyordu. Artik
      parçalar sade `<a>` — indirme `download` ozniteligi ve yeni sekme
      `target` semantigi aynen korunuyor.
      Ikon once, sonra yazi (kullanici istegi): goz simgesi "CV" kelimesinin
      SOLUNDA.
    */
    return (
      <SplitButton
        parts={[
          {
            href,
            target: '_blank',
            rel: 'noopener noreferrer',
            children: (
              <>
                <EyeIcon size={16} />
                CV
              </>
            ),
          },
          {
            href,
            download: true,
            'aria-label': t('about.cvDownload'),
            children: <DownloadIcon size={16} />,
          },
        ]}
      />
    )
  }

  return (
    <div ref={rootRef} className="relative flex flex-row">
      <Button
        {...rest}
        onClick={() => setOpen(o => !o)}
        startContent={rest.startContent ?? <EyeIcon size={18} />}
        endContent={<ChevronDownIcon size={14} />}
        aria-expanded={open}
      >
        {label}
      </Button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-64 overflow-hidden rounded-xl border border-foreground/15 bg-background shadow-2xl shadow-black/20">
          <div className="border-b border-foreground/10 p-2">
            <Input
              value={q}
              onValueChange={setQ}
              placeholder={t('about.cvSearch')}
              className="h-8"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1.5">
            {filtered.map(c => (
              <a
                key={c.id}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm text-foreground/80 no-underline transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {c.lang === locale && (
                    <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary">
                      {t('about.cvSuggested')}
                    </span>
                  )}
                  <span className="truncate">{c.label}</span>
                </span>
                <DownloadIcon size={14} className="shrink-0 opacity-60" />
              </a>
            ))}
            {filtered.length === 0 && (
              <p className="px-2.5 py-3 text-center text-xs text-foreground/50">
                {t('projects.noResultsShort')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}