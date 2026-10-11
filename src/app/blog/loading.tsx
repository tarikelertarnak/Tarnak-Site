import { Skeleton, SkeletonGrid } from '@/components/ui/skeleton'

/**
 * /blog yükleme durumu (Faz 5 · 2)
 *
 * ÖNCE: elle yazılmış `shimmer` blokları. `.shimmer` sınıfı hareketli bir
 * parlama (gradient + animasyon) — kullanıcı şartı "glow/parlama efekti
 * yasak" olduğu için KALDIRILDI. Yerine CSS-only `Skeleton` geldi:
 * sabit gri blok + hafif opaklık geçişi (parlama değil).
 */
export default function BlogLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-col px-4 pt-28 sm:px-6 sm:pt-32">
      <div className="flex w-full flex-col items-center gap-3 pb-6 text-center">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
      <SkeletonGrid count={3} variant="blog" />
    </div>
  )
}
