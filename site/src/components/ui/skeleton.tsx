/**
 * Skeleton yükleme
 *
 * JS'siz (CSS-only) iskelet. Neden JS değil:
 *  · Yükleme durumu Next'in `loading.tsx`'i ile SUNUCUDA gelir; JS
 *    gerektirmez.
 *  · `prefers-reduced-motion` açıkken kayan "parlama" animasyonu
 *    kapatılır, sabit gri blok kalır.
 *
 * Neden shimmer YOK: kullanıcı şartı — "glow/parlama efekti yasak".
 * Shimmer tipik bir parlama animasyonudur, bu yüzden yerine sade bir
 * opaklık geçişi kullanılıyor (belki 1.2 sn'de, çok hafif).
 */

/** Tek bir iskelet satırı/balığı */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-foreground/8 ${className}`}
    />
  )
}

/** Proje kartı iskeleti — gerçek kartın yakın boyutlarında */
export function ProjectCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-3 rounded-xl border border-foreground/10 p-4"
    >
      <Skeleton className="aspect-video w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="mt-1 flex gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  )
}

/** Blog kartı iskeleti */
export function BlogCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-3 rounded-xl border border-foreground/10 p-4"
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

/** Izgara iskeleti — kaç kart olacağı verilir */
export function SkeletonGrid({
  count = 6,
  variant = 'project',
}: {
  count?: number
  variant?: 'project' | 'blog'
}) {
  const Kart = variant === 'project' ? ProjectCardSkeleton : BlogCardSkeleton
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <Kart key={i} />
      ))}
    </div>
  )
}
