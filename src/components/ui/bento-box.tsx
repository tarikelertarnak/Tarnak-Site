import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/components/ui/cn'

export function BentoBox({ children, className }: { children: ReactNode, className?: string }) {
  /*
    Tek boşluk kaynağı: `gap-8` (32px).
    2026-10-30: eskiden `gap-3 sm:gap-4` vardı; About grubuna `gap-8` eklendiğinde
    masaüstünde `sm:gap-4` kazandığı için boşluk 16px'e düşüyordu (ölçüldü:
    mobil 32, masaüstü 16). Artık tek değer, medya sorgusu çakışması yok.
  */
  return (
    <div className={cn('grid gap-8', className)}>
      {children}
    </div>
  )
}

/**
 * Tek kutu (Card) ya da `bare` ile DÜZ bölüm.
 *
 * `bare` (2026-10-30, kullanıcı: "bunların hepsi ABOUT ME, bu grupları bir
 * grup daha yaparak birleştirelim"): iç kartlar kendi çerçevelerini bırakır,
 * beş blok TEK kartın içinde alt alta bölümler olarak durur. Çerçeve/ayırıcı
 * artık dıştaki kapsayıcının işi.
 */
export function BentoBoxItem({ children, className, bare }: { children: ReactNode, className?: string, bare?: boolean }) {
  if (bare) {
    return (
      <div className={cn('relative flex min-w-0 flex-col', className)}>
        {children}
      </div>
    )
  }

  return (
    <Card className={cn('p-4 sm:p-6 lg:p-8', className)}>
      {children}
    </Card>
  )
}
