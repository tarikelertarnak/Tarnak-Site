import React from 'react'
import { cn } from '@/components/ui/cn'

/**
 * Bölüm başlığı + buton satırı — ORTAK boşluk düzeni.
 *
 * 2026-10-06 (kullanıcı): "Başlık → [eşit boşluk] → Butonlar → [aynı eşit
 * boşluk] → İçerik. Butonlar hiçbir yerde alttaki içeriğe yapışık olmasın.
 * Dört bölüm (Hakkımda, Projeler, Blog, İletişim) aynı düzeni kullansın."
 *
 * Sorun: her bölüm boşluğu kendi `mt-*`/`pb-*` değeriyle yazıyordu, değerler
 * ayrışmıştı — Hakkımda'da butonlar Kişisel Bilgiler kartına, Projeler'de
 * arama kutusuna yapışıyordu.
 *
 * Çözüm: boşluk `--section-gap` (globals.css) değişkeninden gelir ve BURADA
 * bir kez uygulanır. Bölümler kendi boşluklarını yazmaz.
 *
 * `mt` NEREDEN GELİYOR: `SectionTitle`/`SectionHeader` varyantları zaten
 * kendi alt boşluğunu (`pb-8 sm:pb-10 lg:pb-12`) getirir. Bu bileşen buton
 * satırını hem başlıktan hem içerikten AYRI ve EŞİT uzaklıkta tutmak için
 * `mt-[calc(var(--section-gap)/2)]` üst ve `mb-[var(--section-gap)]` alt
 * uygular — böylece görsel boşluk iki tarafta da `--section-gap` olur.
 */
export function SectionHeader({
  children,
  className,
  id,
}: {
  children?: React.ReactNode
  className?: string
  id?: string
}) {
  return (
    <div
      id={id}
      className={cn(
        'flex w-full flex-col items-center',
        className,
      )}
    >
      {children}
      {/* Buton satırı: yatay ortalı, sabit 12px aralık, mobilde sarmalanır */}
      {children
        ? (
            <div className="flex w-full flex-wrap items-center justify-center gap-3">
              {children}
            </div>
          )
        : null}
    </div>
  )
}

/**
 * Bölüm başlığı → butonlar → içerik arasındaki EŞİT boşluk.
 *
 * Kullanım:
 *   <SectionGapTop />            ← başlığın altına
 *   <div className="flex … gap-3">butonlar</div>
 *   <SectionGapBottom />         ← butonların altına
 *
 * Her ikisi de `--section-gap` kullanır; değer tek yerden değişir.
 */
export function SectionGapTop({ className }: { className?: string }) {
  return <div aria-hidden className={cn('h-[var(--section-gap)]', className)} />
}

export function SectionGapBottom({ className }: { className?: string }) {
  return <div aria-hidden className={cn('h-[var(--section-gap)]', className)} />
}
